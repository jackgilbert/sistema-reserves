import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';
import { customAlphabet } from 'nanoid';
import {
  BOOKING_CODE_ALPHABET,
  BOOKING_CODE_LENGTH,
} from '../common/constants';
import { BookingRepository } from '../common/repositories/booking.repository';

const nanoid = customAlphabet(BOOKING_CODE_ALPHABET, BOOKING_CODE_LENGTH);

export interface CreateBookingFromHoldDto {
  holdId: string;
  email: string;
  name: string;
  phone?: string;
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly bookingRepository: BookingRepository,
  ) {}

  /**
   * Generar código único para la reserva
   * Retry logic to handle race conditions
   */
  private async generateCode(maxRetries = 5): Promise<string> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const code = nanoid();

      // Check uniqueness
      const exists = await this.prisma.booking.findUnique({
        where: { code },
        select: { id: true },
      });

      if (!exists) {
        return code;
      }

      // Log collision for monitoring
      this.logger.warn(
        `Booking code collision detected: ${code} (attempt ${attempt + 1}/${maxRetries})`,
      );
    }

    throw new Error(
      'Failed to generate unique booking code after maximum retries',
    );
  }

  /**
   * Crear booking desde un hold
   */
  async createBookingFromHold(
    holdId: string,
    email: string,
    name: string,
    phone: string | undefined,
    tenant: TenantContext,
  ) {
    // Buscar hold
    const hold = await this.prisma.hold.findFirst({
      where: {
        tenantId: tenant.tenantId,
        id: holdId,
      },
      include: {
        offering: true,
      },
    });

    if (!hold) {
      throw new NotFoundException('Hold no encontrado');
    }

    // Verificar que no haya expirado
    if (hold.expiresAt < new Date()) {
      throw new BadRequestException('El hold ha expirado');
    }

    const holdMeta = (hold.metadata || {}) as any;
    const ticketSelection = holdMeta?.ticketSelection as
      | { standard: number; variants: Record<string, number> }
      | undefined;

    const priceVariantName: string | undefined =
      typeof holdMeta.priceVariantName === 'string' ? holdMeta.priceVariantName : undefined;

    const variants = Array.isArray(hold.offering.priceVariants)
      ? (hold.offering.priceVariants as Array<{ name: string; price: number }>).filter(
          (v) => v && typeof v.name === 'string',
        )
      : [];

    const computeTotalFromSelection = () => {
      let total = 0;
      total += (ticketSelection?.standard || 0) * hold.offering.basePrice;
      for (const [name, qty] of Object.entries(ticketSelection?.variants || {})) {
        const v = variants.find((x) => x.name === name);
        if (!v) {
          throw new BadRequestException(`Variante de precio no válida: ${name}`);
        }
        total += v.price * qty;
      }
      return total;
    };

    const totalAmount = ticketSelection
      ? computeTotalFromSelection()
      : (() => {
          const selectedVariant = priceVariantName
            ? variants.find((v) => v.name === priceVariantName)
            : undefined;
          const unitPrice = selectedVariant?.price ?? hold.offering.basePrice;
          return unitPrice * hold.quantity;
        })();

    // Generar código único
    const code = await this.generateCode();

    // Crear booking en transacción
    const booking = await this.prisma.$transaction(async (tx) => {
      // 1. Crear booking
      const newBooking = await tx.booking.create({
        data: {
          tenantId: tenant.tenantId,
          offeringId: hold.offeringId,
          code,
          slotStart: hold.slotStart,
          slotEnd: hold.slotEnd,
          quantity: hold.quantity,
          status: 'CONFIRMED',
          totalAmount,
          currency: hold.offering.currency,
          customerEmail: email,
          customerName: name,
          customerPhone: phone || null,
          confirmedAt: new Date(),
          metadata: hold.metadata || {},
        },
      });

      // 2. Crear booking items
      if (ticketSelection) {
        const standardQty = Math.max(0, Math.floor(ticketSelection.standard || 0));
        if (standardQty > 0) {
          await tx.bookingItem.create({
            data: {
              bookingId: newBooking.id,
              description: `${hold.offering.name} - Estándar - ${standardQty}x`,
              quantity: standardQty,
              unitPrice: hold.offering.basePrice,
              totalPrice: hold.offering.basePrice * standardQty,
            },
          });
        }

        for (const [name, qtyRaw] of Object.entries(ticketSelection.variants || {})) {
          const qty = Math.max(0, Math.floor(qtyRaw || 0));
          if (qty < 1) continue;
          const v = variants.find((x) => x.name === name);
          if (!v) {
            throw new BadRequestException(`Variante de precio no válida: ${name}`);
          }
          await tx.bookingItem.create({
            data: {
              bookingId: newBooking.id,
              description: `${hold.offering.name} - ${name} - ${qty}x`,
              quantity: qty,
              unitPrice: v.price,
              totalPrice: v.price * qty,
            },
          });
        }
      } else {
        const selectedVariant = priceVariantName
          ? variants.find((v) => v.name === priceVariantName)
          : undefined;
        const unitPrice = selectedVariant?.price ?? hold.offering.basePrice;

        await tx.bookingItem.create({
          data: {
            bookingId: newBooking.id,
            description: `${hold.offering.name}${priceVariantName ? ` - ${priceVariantName}` : ''} - ${hold.quantity}x`,
            quantity: hold.quantity,
            unitPrice,
            totalPrice: totalAmount,
          },
        });
      }

      // 3. Marcar hold como liberado
      await tx.hold.update({
        where: {
          id: holdId,
        },
        data: {
          released: true,
        },
      });

      // 4. Mover inventario de held -> sold
      await tx.inventoryBucket.update({
        where: {
          tenantId_offeringId_slotStart: {
            tenantId: tenant.tenantId,
            offeringId: hold.offeringId,
            slotStart: hold.slotStart,
          },
        },
        data: {
          heldCapacity: {
            decrement: hold.quantity,
          },
          soldCapacity: {
            increment: hold.quantity,
          },
        },
      });

      return newBooking;
    });

    return {
      id: booking.id,
      code: booking.code,
      status: booking.status,
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone || undefined,
      totalAmount: booking.totalAmount,
      offering: {
        id: hold.offering.id,
        name: hold.offering.name,
      },
      slotStart: booking.slotStart.toISOString(),
      slotEnd: booking.slotEnd.toISOString(),
      quantity: booking.quantity,
      createdAt: booking.createdAt.toISOString(),
    };
  }

  /**
   * Crear booking en estado HOLD (pendiente de pago) desde un hold.
   * Nota: no mueve inventario a sold hasta confirmación.
   */
  async createPendingBookingFromHold(
    holdId: string,
    email: string,
    name: string,
    phone: string | undefined,
    tenant: TenantContext,
  ) {
    const hold = await this.prisma.hold.findFirst({
      where: {
        tenantId: tenant.tenantId,
        id: holdId,
      },
      include: {
        offering: true,
      },
    });

    if (!hold) {
      throw new NotFoundException('Hold no encontrado');
    }

    if (hold.expiresAt < new Date()) {
      throw new BadRequestException('El hold ha expirado');
    }

    const holdMeta = (hold.metadata || {}) as any;
    const ticketSelection = holdMeta?.ticketSelection as
      | { standard: number; variants: Record<string, number> }
      | undefined;

    const priceVariantName: string | undefined =
      typeof holdMeta.priceVariantName === 'string' ? holdMeta.priceVariantName : undefined;

    const variants = Array.isArray(hold.offering.priceVariants)
      ? (hold.offering.priceVariants as Array<{ name: string; price: number }>).filter(
          (v) => v && typeof v.name === 'string',
        )
      : [];

    const computeTotalFromSelection = () => {
      let total = 0;
      total += (ticketSelection?.standard || 0) * hold.offering.basePrice;
      for (const [name, qty] of Object.entries(ticketSelection?.variants || {})) {
        const v = variants.find((x) => x.name === name);
        if (!v) {
          throw new BadRequestException(`Variante de precio no válida: ${name}`);
        }
        total += v.price * qty;
      }
      return total;
    };

    const totalAmount = ticketSelection
      ? computeTotalFromSelection()
      : (() => {
          const selectedVariant = priceVariantName
            ? variants.find((v) => v.name === priceVariantName)
            : undefined;
          const unitPrice = selectedVariant?.price ?? hold.offering.basePrice;
          return unitPrice * hold.quantity;
        })();

    const code = await this.generateCode();

    const booking = await this.prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          tenantId: tenant.tenantId,
          offeringId: hold.offeringId,
          code,
          slotStart: hold.slotStart,
          slotEnd: hold.slotEnd,
          quantity: hold.quantity,
          status: 'HOLD',
          totalAmount,
          currency: hold.offering.currency,
          customerEmail: email,
          customerName: name,
          customerPhone: phone || null,
          metadata: {
            ...(hold.metadata ? (hold.metadata as any) : {}),
            holdId,
          },
        },
        include: {
          offering: true,
        },
      });

      if (ticketSelection) {
        const standardQty = Math.max(0, Math.floor(ticketSelection.standard || 0));
        if (standardQty > 0) {
          await tx.bookingItem.create({
            data: {
              bookingId: newBooking.id,
              description: `${hold.offering.name} - Estándar - ${standardQty}x`,
              quantity: standardQty,
              unitPrice: hold.offering.basePrice,
              totalPrice: hold.offering.basePrice * standardQty,
            },
          });
        }

        for (const [name, qtyRaw] of Object.entries(ticketSelection.variants || {})) {
          const qty = Math.max(0, Math.floor(qtyRaw || 0));
          if (qty < 1) continue;
          const v = variants.find((x) => x.name === name);
          if (!v) {
            throw new BadRequestException(`Variante de precio no válida: ${name}`);
          }
          await tx.bookingItem.create({
            data: {
              bookingId: newBooking.id,
              description: `${hold.offering.name} - ${name} - ${qty}x`,
              quantity: qty,
              unitPrice: v.price,
              totalPrice: v.price * qty,
            },
          });
        }
      } else {
        const selectedVariant = priceVariantName
          ? variants.find((v) => v.name === priceVariantName)
          : undefined;
        const unitPrice = selectedVariant?.price ?? hold.offering.basePrice;

        await tx.bookingItem.create({
          data: {
            bookingId: newBooking.id,
            description: `${hold.offering.name}${priceVariantName ? ` - ${priceVariantName}` : ''} - ${hold.quantity}x`,
            quantity: hold.quantity,
            unitPrice,
            totalPrice: totalAmount,
          },
        });
      }

      return newBooking;
    });

    return {
      id: booking.id,
      code: booking.code,
      status: booking.status,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      customerName: booking.customerName,
      offering: booking.offering ? { id: booking.offering.id, name: booking.offering.name } : undefined,
    };
  }

  /**
   * Confirmar un booking pendiente (HOLD) cuando el pago se completa.
   */
  async confirmPendingBookingPayment(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        tenantId: true,
        offeringId: true,
        slotStart: true,
        status: true,
        quantity: true,
        metadata: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking no encontrado');
    }

    if (booking.status !== 'HOLD') {
      // Idempotencia: si ya está confirmado, no hacer nada.
      if (booking.status === 'CONFIRMED') return { success: true };
      throw new BadRequestException(`Estado de booking inválido: ${booking.status}`);
    }

    const holdId = (booking.metadata as any)?.holdId as string | undefined;
    if (!holdId) {
      throw new BadRequestException('Booking sin holdId asociado');
    }

    const hold = await this.prisma.hold.findFirst({
      where: {
        tenantId: booking.tenantId,
        id: holdId,
        released: false,
      },
      select: {
        id: true,
        offeringId: true,
        slotStart: true,
        quantity: true,
        expiresAt: true,
      },
    });

    if (!hold) {
      throw new NotFoundException('Hold asociado no encontrado');
    }

    if (hold.expiresAt < new Date()) {
      throw new BadRequestException('El hold asociado ha expirado');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });

      await tx.hold.update({
        where: { id: hold.id },
        data: { released: true },
      });

      await tx.inventoryBucket.update({
        where: {
          tenantId_offeringId_slotStart: {
            tenantId: booking.tenantId,
            offeringId: booking.offeringId,
            slotStart: hold.slotStart,
          },
        },
        data: {
          heldCapacity: { decrement: hold.quantity },
          soldCapacity: { increment: hold.quantity },
        },
      });
    });

    return { success: true };
  }

  /**
   * Listar todas las reservas del tenant
   */
  async findAll(tenant: TenantContext): Promise<unknown[]> {
    return this.bookingRepository.findAll(tenant);
  }

  /**
   * Obtener una reserva por código
   */
  async findByCode(code: string, tenant: TenantContext): Promise<unknown> {
    return this.bookingRepository.findByCodeOrFail(code, tenant);
  }

  /**
   * Cancelar una reserva
   */
  async cancel(bookingId: string, tenant: TenantContext) {
    const booking = await this.bookingRepository.findByIdOrFail(
      bookingId,
      tenant,
      {
        items: true,
      },
    );

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('La reserva ya está cancelada');
    }

    // Cancelar y devolver inventario
    await this.prisma.$transaction(async (tx) => {
      // 1. Actualizar booking
      await tx.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      // 2. Devolver inventario
      await tx.inventoryBucket.update({
        where: {
          tenantId_offeringId_slotStart: {
            tenantId: tenant.tenantId,
            offeringId: booking.offeringId,
            slotStart: booking.slotStart,
          },
        },
        data: {
          soldCapacity: {
            decrement: booking.quantity,
          },
        },
      });
    });

    return {
      id: booking.id,
      code: booking.code,
      status: 'CANCELLED',
    };
  }

  /**
   * Confirmar pago (webhook)
   */
  async confirmPayment() {
    // Implementar lógica de confirmación de pago
    // Por ahora retornar placeholder
    return { success: true };
  }
}
