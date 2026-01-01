import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';
import { differenceInDays, startOfDay } from 'date-fns';

export interface CheckInDto {
  code: string;
  scannedBy?: string;
}

@Injectable()
export class CheckinService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Hacer check-in de una reserva por código
   */
  async checkIn(code: string, scannedBy: string | null, tenant: TenantContext) {
    // Buscar booking
    const booking = await this.prisma.booking.findFirst({
      where: {
        tenantId: tenant.tenantId,
        code,
      },
      include: {
        offering: {
          select: {
            name: true,
            type: true,
          },
        },
        checkInEvents: {
          orderBy: {
            scannedAt: 'desc',
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Verificar estado
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Esta reserva está cancelada');
    }

    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestException('Esta reserva no está confirmada');
    }

    const now = new Date();

    // Validar que el check-in sea en el día correcto (±1 día de flexibilidad)
    const slotDate = startOfDay(booking.slotStart);
    const todayDate = startOfDay(now);
    const daysDiff = Math.abs(differenceInDays(slotDate, todayDate));

    if (daysDiff > 1) {
      throw new BadRequestException(
        `Esta reserva es para el ${booking.slotStart.toLocaleDateString()}. No se puede usar hoy.`,
      );
    }

    // Crear evento de check-in en transacción
    const checkInEvent = await this.prisma.$transaction(async (tx) => {
      // 1. Crear evento
      const event = await tx.checkInEvent.create({
        data: {
          tenantId: tenant.tenantId,
          bookingId: booking.id,
          scannedBy,
          location: 'entrance',
          metadata: {},
        },
      });

      // 2. Actualizar estado del booking a USED
      await tx.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          status: 'USED',
          usedAt: now,
        },
      });

      return event;
    });

    return {
      success: true,
      bookingId: booking.id,
      code: booking.code,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      offering: booking.offering.name,
      slotStart: booking.slotStart.toISOString(),
      slotEnd: booking.slotEnd.toISOString(),
      quantity: booking.quantity,
      status: 'USED',
      checkedInAt: checkInEvent.scannedAt.toISOString(),
      previousCheckIns: booking.checkInEvents.length,
    };
  }

  /**
   * Verificar estado de una reserva (sin hacer check-in)
   */
  async verifyBooking(code: string, tenant: TenantContext) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        tenantId: tenant.tenantId,
        code,
      },
      include: {
        offering: {
          select: {
            name: true,
            type: true,
          },
        },
        checkInEvents: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    return {
      code: booking.code,
      status: booking.status,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      offering: booking.offering.name,
      slotStart: booking.slotStart.toISOString(),
      slotEnd: booking.slotEnd.toISOString(),
      quantity: booking.quantity,
      checkInEvents: booking.checkInEvents.map((event) => ({
        scannedAt: event.scannedAt.toISOString(),
        scannedBy: event.scannedBy,
      })),
    };
  }

  /**
   * Obtener historial de check-ins
   */
  async getCheckInHistory(tenant: TenantContext, limit = 50) {
    const events = await this.prisma.checkInEvent.findMany({
      where: {
        tenantId: tenant.tenantId,
      },
      include: {
        booking: {
          include: {
            offering: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        scannedAt: 'desc',
      },
      take: limit,
    });

    return events.map((event) => ({
      id: event.id,
      bookingCode: event.booking.code,
      customerName: event.booking.customerName,
      offering: event.booking.offering.name,
      scannedAt: event.scannedAt.toISOString(),
      quantity: event.booking.quantity,
    }));
  }
}
