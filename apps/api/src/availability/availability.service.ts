import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAvailabilityDto } from './dto/query-availability.dto';
import { TenantContext } from '@sistema-reservas/shared';
import { addDays, startOfDay, endOfDay, parse, format, isBefore, isAfter, addMinutes } from 'date-fns';

interface TimeSlot {
  start: string; // ISO 8601
  end: string; // ISO 8601
  available: number;
  price: number;
  resourceId?: string;
}

interface DayAvailability {
  date: string; // YYYY-MM-DD
  slots: TimeSlot[];
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcular disponibilidad para un rango de fechas
   */
  async getAvailability(query: QueryAvailabilityDto, tenant: TenantContext): Promise<DayAvailability[]> {
    const { offeringId, startDate, endDate, quantity = 1, resourceId } = query;

    // Validar fechas
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isAfter(start, end)) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    // Obtener offering con schedules
    const offering = await this.prisma.offering.findUnique({
      where: {
        tenantId_id: {
          tenantId: tenant.tenantId,
          id: offeringId,
        },
        active: true,
      },
      include: {
        schedules: true,
        resources: resourceId ? {
          where: { id: resourceId, active: true },
        } : {
          where: { active: true },
        },
      },
    });

    if (!offering) {
      throw new NotFoundException('Oferta no encontrada o inactiva');
    }

    if (offering.schedules.length === 0) {
      throw new BadRequestException('La oferta no tiene horarios configurados');
    }

    // Generar disponibilidad según el tipo de offering
    switch (offering.type) {
      case 'CAPACITY':
        return this.getCapacityAvailability(offering, start, end, quantity, tenant);
      case 'RESOURCE':
        return this.getResourceAvailability(offering, start, end, resourceId, tenant);
      case 'APPOINTMENT':
        return this.getAppointmentAvailability(offering, start, end, tenant);
      case 'SEATS':
        return this.getSeatsAvailability(offering, start, end, quantity, tenant);
      default:
        throw new BadRequestException(`Tipo de oferta no soportado: ${offering.type}`);
    }
  }

  /**
   * Disponibilidad para tipo CAPACITY
   */
  private async getCapacityAvailability(
    offering: any,
    startDate: Date,
    endDate: Date,
    quantity: number,
    tenant: TenantContext,
  ): Promise<DayAvailability[]> {
    const schedule = offering.schedules[0]; // Usar el primer schedule activo
    const result: DayAvailability[] = [];

    let currentDate = startOfDay(startDate);
    while (!isAfter(currentDate, endOfDay(endDate))) {
      const dayOfWeek = (currentDate.getDay() + 6) % 7; // Convertir domingo=0 a lunes=0

      // Verificar si este día está en el schedule
      if (schedule.daysOfWeek.includes(dayOfWeek)) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        // Obtener inventory bucket para este día
        const bucket = await this.prisma.inventoryBucket.findFirst({
          where: {
            tenantId: tenant.tenantId,
            offeringTenantId: tenant.tenantId,
            offeringId: offering.id,
            date: currentDate,
          },
        });

        // Generar slots para el día
        const slots = this.generateTimeSlots(
          schedule.startTime,
          schedule.endTime,
          schedule.slotDuration,
          currentDate,
          offering.capacity || 50,
          bucket,
          offering.basePrice,
        );

        if (slots.length > 0) {
          result.push({
            date: dateStr,
            slots: slots.filter(slot => slot.available >= quantity),
          });
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    return result;
  }

  /**
   * Disponibilidad para tipo RESOURCE
   */
  private async getResourceAvailability(
    offering: any,
    startDate: Date,
    endDate: Date,
    resourceId: string | undefined,
    tenant: TenantContext,
  ): Promise<DayAvailability[]> {
    const schedule = offering.schedules[0];
    const result: DayAvailability[] = [];

    // Si se especificó resourceId, solo usar ese recurso
    const resources = resourceId 
      ? offering.resources.filter((r: any) => r.id === resourceId)
      : offering.resources;

    if (resources.length === 0) {
      throw new NotFoundException('Recurso no encontrado');
    }

    let currentDate = startOfDay(startDate);
    while (!isAfter(currentDate, endOfDay(endDate))) {
      const dayOfWeek = (currentDate.getDay() + 6) % 7;

      if (schedule.daysOfWeek.includes(dayOfWeek)) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const slots: TimeSlot[] = [];

        // Para recursos, cada recurso puede tener su propia disponibilidad
        for (const resource of resources) {
          // Verificar si el recurso está reservado este día
          const allocations = await this.prisma.resourceAllocation.findMany({
            where: {
              resourceId: resource.id,
              startTime: {
                gte: startOfDay(currentDate),
                lt: endOfDay(currentDate),
              },
            },
          });

          // Si no hay allocations, el recurso está disponible todo el día
          if (allocations.length === 0) {
            slots.push({
              start: new Date(currentDate.setHours(parseInt(schedule.startTime.split(':')[0]), parseInt(schedule.startTime.split(':')[1]))).toISOString(),
              end: new Date(currentDate.setHours(parseInt(schedule.endTime.split(':')[0]), parseInt(schedule.endTime.split(':')[1]))).toISOString(),
              available: 1,
              price: offering.basePrice,
              resourceId: resource.id,
            });
          }
        }

        if (slots.length > 0) {
          result.push({
            date: dateStr,
            slots,
          });
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    return result;
  }

  /**
   * Disponibilidad para tipo APPOINTMENT (slots individuales)
   */
  private async getAppointmentAvailability(
    offering: any,
    startDate: Date,
    endDate: Date,
    tenant: TenantContext,
  ): Promise<DayAvailability[]> {
    // Similar a CAPACITY pero cada slot es para 1 persona
    return this.getCapacityAvailability(offering, startDate, endDate, 1, tenant);
  }

  /**
   * Disponibilidad para tipo SEATS
   */
  private async getSeatsAvailability(
    offering: any,
    startDate: Date,
    endDate: Date,
    quantity: number,
    tenant: TenantContext,
  ): Promise<DayAvailability[]> {
    // Similar a CAPACITY
    return this.getCapacityAvailability(offering, startDate, endDate, quantity, tenant);
  }

  /**
   * Generar slots de tiempo para un día específico
   */
  private generateTimeSlots(
    startTime: string,
    endTime: string,
    slotDuration: number,
    date: Date,
    capacity: number,
    bucket: any,
    basePrice: number,
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    let currentTime = new Date(date);
    currentTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(date);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    while (isBefore(currentTime, endDateTime)) {
      const slotEnd = addMinutes(currentTime, slotDuration);
      
      // Capacidad disponible = capacidad base - reservas en este slot
      const slotCapacity = bucket?.quantityUsed 
        ? Math.max(0, capacity - bucket.quantityUsed) 
        : capacity;

      if (slotCapacity > 0) {
        slots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString(),
          available: slotCapacity,
          price: basePrice,
        });
      }

      currentTime = slotEnd;
    }

    return slots;
  }
}
