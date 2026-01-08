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

type AppliedDiscount = {
  id: string;
  code: string;
  percentOff: number;
};

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly bookingRepository: BookingRepository,
  ) {}

  private resolveSlotVariantLabel(
    offeringMetadata: any,
    slotVariantKey: string | null | undefined,
  ): string | undefined {
    const key = typeof slotVariantKey === 'string' ? slotVariantKey.trim() : '';
    if (!key) return undefined;

    const variants = offeringMetadata?.slotVariants;
    if (!Array.isArray(variants)) return key;

    const match = variants.find(
      (v: any) => v && typeof v.key === 'string' && v.key === key,
    );
    const label = match && typeof match.label === 'string' ? match.label.trim() : '';
    return label || key;
  }

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
    discount?: AppliedDiscount,
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

    const slotVariantKey: string = (hold as any).slotVariantKey || '';

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

    const normalizeVariantName = (name: string) => name.trim().toLowerCase();
    const normalizeTicketSelection = (
      selection:
        | { standard: number; variants: Record<string, number> }
        | undefined,
    ) => {
      if (!selection) return undefined;

      const adultVariantName = variants.find((v) => {
        const n = normalizeVariantName(v.name);
        return n === 'adult' || n === 'adulto';
      })?.name;

      if (!adultVariantName) return selection;

      const standardQty = Math.max(0, Math.floor(selection.standard || 0));
      if (standardQty < 1) return selection;

      return {
        standard: 0,
        variants: {
          ...selection.variants,
          [adultVariantName]: (selection.variants?.[adultVariantName] || 0) + standardQty,
        },
      };
    };

    const normalizedTicketSelection = normalizeTicketSelection(ticketSelection);

    const computeTotalFromSelection = () => {
      let total = 0;
      total += (normalizedTicketSelection?.standard || 0) * hold.offering.basePrice;
      for (const [name, qty] of Object.entries(normalizedTicketSelection?.variants || {})) {
        const v = variants.find((x) => x.name === name);
        if (!v) {
          throw new BadRequestException(`Variante de precio no válida: ${name}`);
        }
        total += v.price * qty;
      }
      return total;
    };

    const preDiscountTotalAmount = normalizedTicketSelection
      ? computeTotalFromSelection()
      : (() => {
          const selectedVariant = priceVariantName
            ? variants.find((v) => v.name === priceVariantName)
            : undefined;
          const unitPrice = selectedVariant?.price ?? hold.offering.basePrice;
          return unitPrice * hold.quantity;
        })();

    const applyDiscountToAmount = (amount: number) => {
      if (!discount) return amount;
      const p = Math.max(0, Math.min(100, Math.floor(discount.percentOff)));
      const discounted = Math.round((amount * (100 - p)) / 100);
      return Math.max(0, discounted);
    };

    const totalAmount = applyDiscountToAmount(preDiscountTotalAmount);

    // Generar código único
    const code = await this.generateCode();

    // Crear booking en transacción
    const booking = await this.prisma.$transaction(async (tx) => {
      const txAny = tx as any;

      if (discount) {
        const dc = await txAny.discountCode.findFirst({
          where: {
            id: discount.id,
            tenantId: tenant.tenantId,
          },
          select: {
            id: true,
            active: true,
            offeringId: true,
            percentOff: true,
            maxRedemptions: true,
            redemptionCount: true,
            startsAt: true,
            endsAt: true,
          },
        });

        if (!dc) throw new BadRequestException('Código de descuento no encontrado');
        if (!dc.active) throw new BadRequestException('Código de descuento inactivo');
        if (dc.offeringId && dc.offeringId !== hold.offeringId) {
          throw new BadRequestException('Código no válido para esta oferta');
        }
        if (dc.percentOff !== discount.percentOff) {
          throw new BadRequestException('Código de descuento inválido');
        }

        const now = new Date();
        if (dc.startsAt && dc.startsAt > now) {
          throw new BadRequestException('Código de descuento aún no disponible');
        }
        if (dc.endsAt && dc.endsAt < now) {
          throw new BadRequestException('Código de descuento expirado');
        }
        if (
          typeof dc.maxRedemptions === 'number' &&
          dc.redemptionCount >= dc.maxRedemptions
        ) {
          throw new BadRequestException('Código de descuento agotado');
        }

        await txAny.discountCode.update({
          where: { id: dc.id },
          data: { redemptionCount: { increment: 1 } },
        });
      }

      // 1. Crear booking
      const newBooking = await tx.booking.create({
        data: {
          tenantId: tenant.tenantId,
          offeringId: hold.offeringId,
          code,
          slotStart: hold.slotStart,
          slotEnd: hold.slotEnd,
          slotVariantKey,
          quantity: hold.quantity,
          status: 'CONFIRMED',
          totalAmount,
          currency: hold.offering.currency,
          customerEmail: email,
          customerName: name,
          customerPhone: phone || null,
          confirmedAt: new Date(),
          discountCodeId: discount?.id || null,
          metadata: {
            ...(hold.metadata || {}),
            ...(discount
              ? {
                  discount: {
                    code: discount.code,
                    percentOff: discount.percentOff,
                    preDiscountTotalAmount,
                  },
                }
              : {}),
          },
        },
      });

      // 2. Crear booking items
      if (normalizedTicketSelection) {
        const standardQty = Math.max(0, Math.floor(normalizedTicketSelection.standard || 0));
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

        for (const [name, qtyRaw] of Object.entries(normalizedTicketSelection.variants || {})) {
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
          tenantId_offeringId_slotStart_variantKey: {
            tenantId: tenant.tenantId,
            offeringId: hold.offeringId,
            slotStart: hold.slotStart,
            variantKey: slotVariantKey,
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
    discount?: AppliedDiscount,
  ) {
    // Idempotencia: si ya existe un booking HOLD para este hold, reutilizarlo.
    // Esto evita duplicar reservas (descuentos, items, etc.) ante reintentos del checkout.
    const existing = await this.prisma.booking.findFirst({
      where: {
        tenantId: tenant.tenantId,
        status: 'HOLD',
        metadata: {
          path: ['holdId'],
          equals: holdId,
        } as any,
      },
      include: {
        offering: true,
      },
    });

    if (existing) {
      const requestedDiscountId = discount?.id || null;
      const existingDiscountId = (existing as any).discountCodeId || null;
      if (requestedDiscountId !== existingDiscountId) {
        throw new BadRequestException(
          'Ya existe un booking pendiente para este hold con un descuento distinto. Crea un nuevo hold para cambiar el descuento.',
        );
      }

      return {
        id: existing.id,
        code: existing.code,
        status: existing.status,
        totalAmount: existing.totalAmount,
        currency: existing.currency,
        customerName: existing.customerName,
        offering: existing.offering
          ? { id: existing.offering.id, name: existing.offering.name }
          : undefined,
      };
    }

    const hold = await this.prisma.hold.findFirst({
      where: {
        tenantId: tenant.tenantId,
        id: holdId,
        released: false,
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

    const slotVariantKey: string = (hold as any).slotVariantKey || '';

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

    const normalizeVariantName = (name: string) => name.trim().toLowerCase();
    const normalizeTicketSelection = (
      selection:
        | { standard: number; variants: Record<string, number> }
        | undefined,
    ) => {
      if (!selection) return undefined;

      const adultVariantName = variants.find((v) => {
        const n = normalizeVariantName(v.name);
        return n === 'adult' || n === 'adulto';
      })?.name;

      if (!adultVariantName) return selection;

      const standardQty = Math.max(0, Math.floor(selection.standard || 0));
      if (standardQty < 1) return selection;

      return {
        standard: 0,
        variants: {
          ...selection.variants,
          [adultVariantName]: (selection.variants?.[adultVariantName] || 0) + standardQty,
        },
      };
    };

    const normalizedTicketSelection = normalizeTicketSelection(ticketSelection);

    const computeTotalFromSelection = () => {
      let total = 0;
      total += (normalizedTicketSelection?.standard || 0) * hold.offering.basePrice;
      for (const [name, qty] of Object.entries(normalizedTicketSelection?.variants || {})) {
        const v = variants.find((x) => x.name === name);
        if (!v) {
          throw new BadRequestException(`Variante de precio no válida: ${name}`);
        }
        total += v.price * qty;
      }
      return total;
    };

    const preDiscountTotalAmount = normalizedTicketSelection
      ? computeTotalFromSelection()
      : (() => {
          const selectedVariant = priceVariantName
            ? variants.find((v) => v.name === priceVariantName)
            : undefined;
          const unitPrice = selectedVariant?.price ?? hold.offering.basePrice;
          return unitPrice * hold.quantity;
        })();

    const applyDiscountToAmount = (amount: number) => {
      if (!discount) return amount;
      const p = Math.max(0, Math.min(100, Math.floor(discount.percentOff)));
      const discounted = Math.round((amount * (100 - p)) / 100);
      return Math.max(0, discounted);
    };

    const totalAmount = applyDiscountToAmount(preDiscountTotalAmount);

    const code = await this.generateCode();

    const booking = await this.prisma.$transaction(async (tx) => {
      const txAny = tx as any;

      if (discount) {
        const dc = await txAny.discountCode.findFirst({
          where: {
            id: discount.id,
            tenantId: tenant.tenantId,
          },
          select: {
            id: true,
            active: true,
            offeringId: true,
            percentOff: true,
            maxRedemptions: true,
            redemptionCount: true,
            startsAt: true,
            endsAt: true,
          },
        });

        if (!dc) throw new BadRequestException('Código de descuento no encontrado');
        if (!dc.active) throw new BadRequestException('Código de descuento inactivo');
        if (dc.offeringId && dc.offeringId !== hold.offeringId) {
          throw new BadRequestException('Código no válido para esta oferta');
        }
        if (dc.percentOff !== discount.percentOff) {
          throw new BadRequestException('Código de descuento inválido');
        }

        const now = new Date();
        if (dc.startsAt && dc.startsAt > now) {
          throw new BadRequestException('Código de descuento aún no disponible');
        }
        if (dc.endsAt && dc.endsAt < now) {
          throw new BadRequestException('Código de descuento expirado');
        }
        if (
          typeof dc.maxRedemptions === 'number' &&
          dc.redemptionCount >= dc.maxRedemptions
        ) {
          throw new BadRequestException('Código de descuento agotado');
        }

        await txAny.discountCode.update({
          where: { id: dc.id },
          data: { redemptionCount: { increment: 1 } },
        });
      }

      const newBooking = await tx.booking.create({
        data: {
          tenantId: tenant.tenantId,
          offeringId: hold.offeringId,
          code,
          slotStart: hold.slotStart,
          slotEnd: hold.slotEnd,
          slotVariantKey,
          quantity: hold.quantity,
          status: 'HOLD',
          totalAmount,
          currency: hold.offering.currency,
          customerEmail: email,
          customerName: name,
          customerPhone: phone || null,
          metadata: {
            ...(hold.metadata as any),
            holdId,
            ...(discount
              ? {
                  discount: {
                    code: discount.code,
                    percentOff: discount.percentOff,
                    preDiscountTotalAmount,
                  },
                }
              : {}),
          },
          discountCodeId: discount?.id || null,
        },
        include: {
          offering: true,
        },
      });

      if (normalizedTicketSelection) {
        const standardQty = Math.max(0, Math.floor(normalizedTicketSelection.standard || 0));
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

        for (const [name, qtyRaw] of Object.entries(normalizedTicketSelection.variants || {})) {
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
    return await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new NotFoundException('Booking no encontrado');
      }

      if (booking.status !== 'HOLD') {
        // Idempotencia: si ya está confirmado, no hacer nada.
        if (booking.status === 'CONFIRMED') {
          this.logger.log(`Confirm booking no-op (ya CONFIRMED) bookingId=${bookingId}`);
          return { success: true };
        }
        throw new BadRequestException(`Estado de booking inválido: ${booking.status}`);
      }

      const holdId = (booking.metadata as any)?.holdId as string | undefined;
      if (!holdId) {
        throw new BadRequestException('Booking sin holdId asociado');
      }

      const hold = await tx.hold.findFirst({
        where: {
          tenantId: booking.tenantId,
          id: holdId,
        },
      });

      if (!hold) {
        throw new NotFoundException('Hold asociado no encontrado');
      }

      if (hold.released) {
        // Estado inconsistente: hold liberado pero booking sigue en HOLD.
        throw new BadRequestException('Hold asociado ya liberado');
      }

      if (hold.expiresAt < new Date()) {
        throw new BadRequestException('El hold asociado ha expirado');
      }

      // Single-winner update: evita doble confirmación e inventario duplicado ante webhooks concurrentes.
      const bookingUpdated = await tx.booking.updateMany({
        where: {
          id: booking.id,
          status: 'HOLD',
        },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });

      if (bookingUpdated.count === 0) {
        this.logger.log(`Confirm booking no-op (confirmado por otra request) bookingId=${bookingId}`);
        return { success: true };
      }

      const holdUpdated = await tx.hold.updateMany({
        where: {
          id: hold.id,
          released: false,
        },
        data: { released: true },
      });

      if (holdUpdated.count === 0) {
        // Hard-stop: no mover inventario si no somos los que liberan el hold.
        throw new BadRequestException('No se pudo liberar el hold asociado');
      }

      await tx.inventoryBucket.update({
        where: {
          tenantId_offeringId_slotStart_variantKey: {
            tenantId: booking.tenantId,
            offeringId: booking.offeringId,
            slotStart: hold.slotStart,
            variantKey: (booking as any).slotVariantKey || (hold as any).slotVariantKey || '',
          },
        },
        data: {
          heldCapacity: { decrement: hold.quantity },
          soldCapacity: { increment: hold.quantity },
        },
      });

      return { success: true };
    });
  }

  /**
   * Listar todas las reservas del tenant
   */
  async findAll(tenant: TenantContext): Promise<unknown[]> {
    const bookings = await this.bookingRepository.findAll(tenant);
    return bookings.map((b: any) => ({
      ...b,
      slotVariantLabel: this.resolveSlotVariantLabel(
        b?.offering?.metadata,
        b?.slotVariantKey,
      ),
    }));
  }

  /**
   * Obtener una reserva por código
   */
  async findByCode(code: string, tenant: TenantContext): Promise<unknown> {
    const booking = (await this.bookingRepository.findByCodeOrFail(code, tenant)) as any;
    return {
      ...booking,
      slotVariantLabel: this.resolveSlotVariantLabel(
        booking?.offering?.metadata,
        booking?.slotVariantKey,
      ),
    };
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
          tenantId_offeringId_slotStart_variantKey: {
            tenantId: tenant.tenantId,
            offeringId: booking.offeringId,
            slotStart: booking.slotStart,
            variantKey: (booking as any).slotVariantKey || '',
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
