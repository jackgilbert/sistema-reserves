import {
  BadRequestException,
  Injectable,
  Logger,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';
import { BookingsService } from '../bookings/bookings.service';
import { SettingsService } from '../settings/settings.service';
import { RedsysService } from './redsys/redsys.service';

export type CheckoutFromHoldRequest = {
  holdId: string;
  email: string;
  name: string;
  phone?: string;
};

export type CheckoutResponse =
  | {
      provider: 'none';
      bookingCode: string;
      bookingStatus: string;
    }
  | {
      provider: 'redsys';
      bookingCode: string;
      bookingStatus: string;
      actionUrl: string;
      fields: {
        Ds_SignatureVersion: string;
        Ds_MerchantParameters: string;
        Ds_Signature: string;
      };
    };

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly bookingsService: BookingsService,
    private readonly settingsService: SettingsService,
    private readonly redsysService: RedsysService,
  ) {}

  async checkoutFromHold(
    dto: CheckoutFromHoldRequest,
    tenant: TenantContext,
    origin?: string,
  ): Promise<CheckoutResponse> {
    const flags = await this.settingsService.getFeatureFlags(tenant);

    const paymentsEnabled = !!flags.payments?.enabled;
    const provider = flags.payments?.provider || 'none';
    const requirePaymentOnBooking = !!flags.bookings?.requirePaymentOnBooking;

    // Si el pago no es obligatorio o el módulo está desactivado, confirmar como antes.
    if (!paymentsEnabled || provider === 'none' || !requirePaymentOnBooking) {
      const booking = (await this.bookingsService.createBookingFromHold(
        dto.holdId,
        dto.email,
        dto.name,
        dto.phone,
        tenant,
      )) as { code: string; status: string };

      return {
        provider: 'none',
        bookingCode: booking.code,
        bookingStatus: booking.status,
      };
    }

    if (provider === 'stripe') {
      // Stripe queda como “backup”: mantenemos el flag/tipo, pero no lo exponemos como opción principal.
      throw new NotImplementedException(
        'Stripe está configurado como proveedor, pero no está implementado en este entorno.',
      );
    }

    if (provider !== 'redsys') {
      throw new BadRequestException(`Proveedor de pago no soportado: ${provider}`);
    }

    const booking = await this.bookingsService.createPendingBookingFromHold(
      dto.holdId,
      dto.email,
      dto.name,
      dto.phone,
      tenant,
    );

    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: 'PENDING',
        provider: 'redsys',
        metadata: {
          redsys: {
            order: this.redsysService.generateOrder(),
          },
        },
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        metadata: true,
      },
    });

    const order = (payment.metadata as any)?.redsys?.order as string | undefined;
    if (!order) {
      throw new Error('No se pudo generar el order de Redsys');
    }

    const { actionUrl, merchantParameters, signatureVersion, signature } =
      this.redsysService.buildPaymentRequest({
        amount: payment.amount,
        currency: payment.currency,
        order,
        merchantData: booking.code,
        description: booking.offering?.name,
        customerName: booking.customerName,
        origin,
      });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        metadata: {
          ...(payment.metadata as any),
          redsys: {
            ...(payment.metadata as any)?.redsys,
            order,
            signatureVersion,
          },
        },
      },
    });

    return {
      provider: 'redsys',
      bookingCode: booking.code,
      bookingStatus: booking.status,
      actionUrl,
      fields: {
        Ds_SignatureVersion: signatureVersion,
        Ds_MerchantParameters: merchantParameters,
        Ds_Signature: signature,
      },
    };
  }

  async handleRedsysNotification(body: Record<string, any>) {
    const signatureVersion = body?.Ds_SignatureVersion as string | undefined;
    const merchantParameters = body?.Ds_MerchantParameters as string | undefined;
    const signature = body?.Ds_Signature as string | undefined;

    if (!signatureVersion || !merchantParameters || !signature) {
      throw new BadRequestException('Notificación Redsys inválida');
    }

    const decoded = this.redsysService.decodeMerchantParameters(merchantParameters);

    const order = decoded?.Ds_Order || decoded?.Ds_Merchant_Order;
    if (!order) {
      throw new BadRequestException('Notificación Redsys sin Ds_Order');
    }

    // Verificar firma
    const expected = this.redsysService.signMerchantParameters({
      merchantParameters,
      order,
    });

    if (expected !== signature) {
      this.logger.warn(`Firma Redsys inválida para order=${order}`);
      throw new BadRequestException('Firma Redsys inválida');
    }

    const responseCodeRaw = decoded?.Ds_Response;
    const responseCode =
      typeof responseCodeRaw === 'string' ? parseInt(responseCodeRaw, 10) : responseCodeRaw;

    const isSuccess = Number.isFinite(responseCode) && responseCode >= 0 && responseCode <= 99;

    const payment = await this.prisma.payment.findFirst({
      where: {
        provider: 'redsys',
        metadata: {
          path: ['redsys', 'order'],
          equals: order,
        } as any,
      },
      select: {
        id: true,
        bookingId: true,
        status: true,
        metadata: true,
      },
    });

    if (!payment) {
      this.logger.warn(`Pago Redsys no encontrado para order=${order}`);
      return;
    }

    if (payment.status === 'COMPLETED') {
      return;
    }

    if (!isSuccess) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          metadata: {
            ...(payment.metadata as any),
            redsys: {
              ...((payment.metadata as any)?.redsys || {}),
              ...decoded,
            },
          },
        },
      });
      return;
    }

    // Pago OK -> confirmar booking y mover inventario
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        metadata: {
          ...(payment.metadata as any),
          redsys: {
            ...((payment.metadata as any)?.redsys || {}),
            ...decoded,
          },
        },
      },
    });

    await this.bookingsService.confirmPendingBookingPayment(payment.bookingId);
  }
}
