import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

export interface CreateBookingFromHoldDto {
  holdId: string;
  email: string;
  name: string;
  phone?: string;
}

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Generar código único para la reserva
   */
  private async generateCode(): Promise<string> {
    let code = nanoid();
    let exists = await this.prisma.booking.findUnique({ where: { code } });

    while (exists) {
      code = nanoid();
      exists = await this.prisma.booking.findUnique({ where: { code } });
    }

    return code;
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

    // Calcular precio
    const price = hold.offering.basePrice;
    const totalAmount = price * hold.quantity;

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
          metadata: hold.metadata as any,
        },
      });

      // 2. Crear booking item
      await tx.bookingItem.create({
        data: {
          bookingId: newBooking.id,
          description: `${hold.offering.name} - ${hold.quantity}x`,
          quantity: hold.quantity,
          unitPrice: price,
          totalPrice: totalAmount,
        },
      });

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
   * Listar todas las reservas del tenant
   */
  async findAll(tenant: TenantContext) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId: tenant.tenantId,
      },
      include: {
        offering: {
          select: {
            name: true,
            type: true,
          },
        },
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return bookings;
  }

  /**
   * Obtener una reserva por código
   */
  async findByCode(code: string, tenant: TenantContext) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        tenantId: tenant.tenantId,
        code,
      },
      include: {
        offering: true,
        items: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    return booking;
  }

  /**
   * Cancelar una reserva
   */
  async cancel(bookingId: string, tenant: TenantContext) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        tenantId: tenant.tenantId,
        id: bookingId,
      },
      include: {
        items: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

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
  async confirmPayment(paymentId: string, tenant: TenantContext) {
    // Implementar lógica de confirmación de pago
    // Por ahora retornar placeholder
    return { success: true };
  }
}
