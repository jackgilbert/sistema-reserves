import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';
import { startOfDay, endOfDay, addDays, parseISO, setHours, setMinutes, addMinutes, differenceInDays } from 'date-fns';

// Constants
const MAX_DATE_RANGE_DAYS = 90;

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
    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));

    // Validate date range
    const daysDiff = differenceInDays(end, start);
    if (daysDiff < 0) {
      throw new BadRequestException('End date must be after start date');
    }
    if (daysDiff > MAX_DATE_RANGE_DAYS) {
      throw new BadRequestException(`Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`);
    }

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

    // **OPTIMIZATION: Fetch all inventory buckets for the date range at once**
    const buckets = await this.prisma.inventoryBucket.findMany({
      where: {
        tenantId: tenant.tenantId,
        offeringId,
        slotStart: {
          gte: start,
          lte: end,
        },
      },
    });

    // Build lookup map for O(1) access
    const bucketMap = new Map(
      buckets.map((b) => [b.slotStart.toISOString(), b])
    );

    const availability: Record<string, TimeSlot[]> = {};

    // Iterar días
    let currentDate = start;
    while (currentDate <= end) {
      const dayOfWeek = (currentDate.getDay() + 6) % 7; // Convertir domingo=0 a lunes=0

      // Verificar si el día está en el schedule
      if (schedule.daysOfWeek.includes(dayOfWeek)) {
        const slots = this.generateSlotsForDay(currentDate, offering, schedule, bucketMap);
        availability[currentDate.toISOString().split('T')[0]] = slots;
      }

      currentDate = addDays(currentDate, 1);
    }

    return availability;
  }

  /**
   * Generar slots para un día específico (optimized - no DB queries)
   */
  private generateSlotsForDay(
    date: Date,
    offering: { id: string; capacity: number | null; basePrice: number },
    schedule: { startTime: string; endTime: string; slotDuration: number; daysOfWeek: number[] },
    bucketMap: Map<string, { heldCapacity: number; soldCapacity: number }>,
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];

    // Parsear horarios
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);

    let slotStart = setMinutes(setHours(date, startHour), startMin);
    const dayEnd = setMinutes(setHours(date, endHour), endMin);

    const totalCapacity = offering.capacity || 1;

    // Generar slots
    while (slotStart < dayEnd) {
      const slotEnd = addMinutes(slotStart, schedule.slotDuration);

      // Lookup bucket from pre-fetched map
      const bucket = bucketMap.get(slotStart.toISOString());
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
