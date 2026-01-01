import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';
import { startOfDay, endOfDay, addDays, parseISO, setHours, setMinutes, addMinutes } from 'date-fns';

export interface TimeSlot {
  start: string;
  end: string;
  available: number;
  price: number;
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Calcular disponibilidad para un rango de fechas
   */
  async getAvailability(
    offeringId: string,
    startDate: string,
    endDate: string,
    tenant: TenantContext,
  ): Promise<Record<string, TimeSlot[]>> {
    // Buscar offering
    const offering = await this.prisma.offering.findFirst({
      where: {
        tenantId: tenant.tenantId,
        id: offeringId,
        active: true,
      },
      include: {
        schedules: true,
      },
    });

    if (!offering) {
      throw new NotFoundException('Offering no encontrada');
    }

    if (offering.schedules.length === 0) {
      return {};
    }

    const schedule = offering.schedules[0]; // Usar primer schedule
    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));

    const availability: Record<string, TimeSlot[]> = {};

    // Iterar días
    let currentDate = start;
    while (currentDate <= end) {
      const dayOfWeek = (currentDate.getDay() + 6) % 7; // Convertir domingo=0 a lunes=0

      // Verificar si el día está en el schedule
      if (schedule.daysOfWeek.includes(dayOfWeek)) {
        const slots = await this.generateSlotsForDay(currentDate, offering, schedule, tenant);
        availability[currentDate.toISOString().split('T')[0]] = slots;
      }

      currentDate = addDays(currentDate, 1);
    }

    return availability;
  }

  /**
   * Generar slots para un día específico
   */
  private async generateSlotsForDay(
    date: Date,
    offering: { id: string; capacity: number | null; basePrice: number },
    schedule: { startTime: string; endTime: string; slotDuration: number; daysOfWeek: number[] },
    tenant: TenantContext,
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];

    // Parsear horarios
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);

    let slotStart = setMinutes(setHours(date, startHour), startMin);
    const dayEnd = setMinutes(setHours(date, endHour), endMin);

    // Generar slots
    while (slotStart < dayEnd) {
      const slotEnd = addMinutes(slotStart, schedule.slotDuration);

      // Buscar bucket de inventario
      const bucket = await this.prisma.inventoryBucket.findUnique({
        where: {
          tenantId_offeringId_slotStart: {
            tenantId: tenant.tenantId,
            offeringId: offering.id,
            slotStart,
          },
        },
      });

      const totalCapacity = offering.capacity || 1;
      const held = bucket?.heldCapacity || 0;
      const sold = bucket?.soldCapacity || 0;
      const available = totalCapacity - held - sold;

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        available: Math.max(0, available),
        price: offering.basePrice,
      });

      slotStart = slotEnd;
    }

    return slots;
  }
}
