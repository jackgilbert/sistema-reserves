import {
  BadRequestException,
  Injectable,
  Logger,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';
import crypto from 'crypto';
import { BookingsService } from '../bookings/bookings.service';
import { SettingsService } from '../settings/settings.service';
import { DiscountsService } from '../discounts/discounts.service';
import { RedsysService } from './redsys/redsys.service';

export type CheckoutFromHoldRequest = {
  holdId: string;
  email: string;
  name: string;
  phone?: string;
  discountCode?: string;
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
    private readonly discountsService: DiscountsService,
    private readonly redsysService: RedsysService,
  ) {}

  async checkoutFromHold(
    dto: CheckoutFromHoldRequest,
    tenant: TenantContext,
    origin?: string,
  ): Promise<CheckoutResponse> {
    const flags = await this.settingsService.getFeatureFlags(tenant);

    const prisma = this.prisma as any;
    const hold = await prisma.hold.findFirst({
      where: { tenantId: tenant.tenantId, id: dto.holdId },
      select: { offeringId: true },
    });

    if (!hold) {
      // BookingsService will also validate, but this lets us validate discount scope.
      // Keep same behavior as before: it will throw NotFound there.
    }

    const discount = dto.discountCode
      ? await this.discountsService.validate(dto.discountCode, tenant, hold?.offeringId)
      : undefined;

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
        discount,
      )) as { code: string; status: string };

      return {
        provider: 'none',
        bookingCode: booking.code,
        bookingStatus: booking.status,
      };
    }

    // Si hay descuento 100% (total gratis), confirmar sin pasar por pasarela.
    if (discount && discount.percentOff === 100) {
      const booking = (await this.bookingsService.createBookingFromHold(
        dto.holdId,
        dto.email,
        dto.name,
        dto.phone,
        tenant,
        discount,
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
      discount,
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

    if (signatureVersion !== 'HMAC_SHA256_V1') {
      throw new BadRequestException('Ds_SignatureVersion no soportado');
    }

    // application/x-www-form-urlencoded puede convertir '+' en espacios.
    // Normalizamos ambos campos base64 para evitar fallos de decode/firma.
    const normalizedMerchantParameters = merchantParameters.replace(/\s/g, '+');

    // Algunas integraciones reciben la firma base64 con espacios por cómo
    // se decodifica application/x-www-form-urlencoded (+ => espacio).
    const normalizedSignature = signature.replace(/\s/g, '+');

    const decoded = this.redsysService.decodeMerchantParameters(normalizedMerchantParameters);

    const order = decoded?.Ds_Order || decoded?.Ds_Merchant_Order;
    if (!order) {
      throw new BadRequestException('Notificación Redsys sin Ds_Order');
    }

    // Verificar firma
    const expected = this.redsysService.signMerchantParameters({
      merchantParameters: normalizedMerchantParameters,
      order,
    });

    const same = (() => {
      try {
        const a = Buffer.from(expected, 'utf8');
        const b = Buffer.from(normalizedSignature, 'utf8');
        return a.length === b.length && crypto.timingSafeEqual(a, b);
      } catch {
        return expected === normalizedSignature;
      }
    })();

    if (!same) {
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
      this.logger.log(`Notify Redsys duplicado (ya COMPLETED) order=${order}`);
      return;
    }

    if (!isSuccess) {
      await this.prisma.payment.updateMany({
        where: {
          id: payment.id,
          status: {
            notIn: ['COMPLETED', 'FAILED'],
          },
        },
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
    const updated = await this.prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: {
          not: 'COMPLETED',
        },
      },
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

    // Single-winner: sólo el que logra completar el pago confirma el booking.
    if (updated.count === 0) {
      this.logger.log(`Notify Redsys duplicado (COMPLETED por otra request) order=${order}`);
      return;
    }

    try {
      await this.bookingsService.confirmPendingBookingPayment(payment.bookingId);
    } catch (error) {
      // No hacemos fallar el webhook: Redsys reintentaría y no se resolvería.
      // Log para seguimiento manual (posible expiración de hold, inventario liberado, etc.).
      this.logger.error(
        `No se pudo confirmar booking tras pago Redsys order=${order} bookingId=${payment.bookingId}`,
        error as any,
      );
      return;
    }
  }
}
