import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';
import { differenceInDays, startOfDay } from 'date-fns';
import { BookingRepository } from '../common/repositories/booking.repository';

export interface CheckInDto {
  code: string;
  scannedBy?: string;
}

@Injectable()
export class CheckinService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly bookingRepository: BookingRepository,
  ) {}

  /**
   * Hacer check-in de una reserva por código
   */
  async checkIn(code: string, scannedBy: string | null, tenant: TenantContext) {
    // Buscar booking
    const booking = await this.bookingRepository.findByCodeOrFail(code, tenant);
    
    // Load check-in events
    const bookingWithEvents = await this.prisma.booking.findUnique({
      where: { id: booking.id },
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

    if (!bookingWithEvents) {
      throw new NotFoundException('Booking data not found');
    }

    // Verificar estado
    if (bookingWithEvents.status === 'CANCELLED') {
      throw new BadRequestException('Esta reserva está cancelada');
    }

    if (bookingWithEvents.status !== 'CONFIRMED') {
      throw new BadRequestException('Esta reserva no está confirmada');
    }

    const now = new Date();

    // Validar que el check-in sea en el día correcto (±1 día de flexibilidad)
    const slotDate = startOfDay(bookingWithEvents.slotStart);
    const todayDate = startOfDay(now);
    const daysDiff = Math.abs(differenceInDays(slotDate, todayDate));

    if (daysDiff > 1) {
      throw new BadRequestException(
        `Esta reserva es para el ${bookingWithEvents.slotStart.toLocaleDateString()}. No se puede usar hoy.`,
      );
    }

    // Crear evento de check-in en transacción
    const checkInEvent = await this.prisma.$transaction(async (tx) => {
      // 1. Crear evento
      const event = await tx.checkInEvent.create({
        data: {
          tenantId: tenant.tenantId,
          bookingId: bookingWithEvents.id,
          scannedBy,
          location: 'entrance',
          metadata: {},
        },
      });

      // 2. Actualizar estado del booking a USED
      // 2. Marcar booking como USED
      await tx.booking.update({
        where: {
          id: bookingWithEvents.id,
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
      bookingId: bookingWithEvents.id,
      code: bookingWithEvents.code,
      customerName: bookingWithEvents.customerName,
      customerEmail: bookingWithEvents.customerEmail,
      offering: bookingWithEvents.offering.name,
      slotStart: bookingWithEvents.slotStart.toISOString(),
      slotEnd: bookingWithEvents.slotEnd.toISOString(),
      quantity: bookingWithEvents.quantity,
      status: 'USED',
      checkedInAt: checkInEvent.scannedAt.toISOString(),
      previousCheckIns: bookingWithEvents.checkInEvents.length,
    };
  }

  /**
   * Verificar estado de una reserva (sin hacer check-in)
   */
  async verifyBooking(code: string, tenant: TenantContext) {
    const booking = await this.bookingRepository.findByCodeOrFail(code, tenant);
    
    // Load check-in events
    const bookingWithEvents = await this.prisma.booking.findUnique({
      where: { id: booking.id },
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

    if (!bookingWithEvents) {
      throw new NotFoundException('Booking data not found');
    }

    return {
      code: bookingWithEvents.code,
      status: bookingWithEvents.status,
      customerName: bookingWithEvents.customerName,
      customerEmail: bookingWithEvents.customerEmail,
      offering: bookingWithEvents.offering.name,
      slotStart: bookingWithEvents.slotStart.toISOString(),
      slotEnd: bookingWithEvents.slotEnd.toISOString(),
      quantity: bookingWithEvents.quantity,
      checkInEvents: bookingWithEvents.checkInEvents.map((event) => ({
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
