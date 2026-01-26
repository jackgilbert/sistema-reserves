import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext, AvailabilityOverrideType } from '@sistema-reservas/shared';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export interface CreateAvailabilityOverrideDto {
  offeringId: string;
  dateFrom: string; // ISO date
  dateTo: string; // ISO date
  type: AvailabilityOverrideType;
  isClosed?: boolean;
  capacityOverride?: number;
  priceOverride?: number;
  priceMultiplier?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface UpdateAvailabilityOverrideDto {
  dateFrom?: string;
  dateTo?: string;
  type?: AvailabilityOverrideType;
  isClosed?: boolean;
  capacityOverride?: number;
  priceOverride?: number;
  priceMultiplier?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AvailabilityCalendarService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create an availability override
   */
  async create(dto: CreateAvailabilityOverrideDto, tenant: TenantContext): Promise<unknown> {
    const { offeringId, dateFrom, dateTo, type, isClosed, capacityOverride, priceOverride, priceMultiplier, reason, metadata } = dto;

    // Verify offering exists
    const offering = await this.prisma.offering.findFirst({
      where: {
        tenantId: tenant.tenantId,
        id: offeringId,
        active: true,
      },
    });

    if (!offering) {
      throw new NotFoundException('Offering not found');
    }

    // Validate dates
    const from = startOfDay(parseISO(dateFrom));
    const to = endOfDay(parseISO(dateTo));

    if (from > to) {
      throw new BadRequestException('dateFrom must be before or equal to dateTo');
    }

    // Create override
    const override = await this.prisma.availabilityOverride.create({
      data: {
        tenantId: tenant.tenantId,
        offeringId,
        dateFrom: from,
        dateTo: to,
        type,
        isClosed: isClosed ?? false,
        capacityOverride: capacityOverride ?? null,
        priceOverride: priceOverride ?? null,
        priceMultiplier: priceMultiplier ?? null,
        reason: reason ?? null,
        metadata: metadata && typeof metadata === 'object' ? metadata : {},
      },
    });

    return override;
  }

  /**
   * List all availability overrides for an offering
   */
  async findAll(offeringId: string, tenant: TenantContext): Promise<unknown[]> {
    const overrides = await this.prisma.availabilityOverride.findMany({
      where: {
        tenantId: tenant.tenantId,
        offeringId,
      },
      orderBy: {
        dateFrom: 'asc',
      },
    });

    return overrides;
  }

  /**
   * List availability overrides for a date range
   */
  async findByDateRange(
    offeringId: string,
    startDate: string,
    endDate: string,
    tenant: TenantContext,
  ): Promise<unknown[]> {
    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));

    const overrides = await this.prisma.availabilityOverride.findMany({
      where: {
        tenantId: tenant.tenantId,
        offeringId,
        OR: [
          // Override starts within range
          {
            dateFrom: {
              gte: start,
              lte: end,
            },
          },
          // Override ends within range
          {
            dateTo: {
              gte: start,
              lte: end,
            },
          },
          // Override spans the entire range
          {
            dateFrom: {
              lte: start,
            },
            dateTo: {
              gte: end,
            },
          },
        ],
      },
      orderBy: {
        dateFrom: 'asc',
      },
    });

    return overrides;
  }

  /**
   * Get a specific override by ID
   */
  async findOne(id: string, tenant: TenantContext): Promise<unknown> {
    const override = await this.prisma.availabilityOverride.findFirst({
      where: {
        tenantId: tenant.tenantId,
        id,
      },
    });

    if (!override) {
      throw new NotFoundException('Availability override not found');
    }

    return override;
  }

  /**
   * Update an availability override
   */
  async update(id: string, dto: UpdateAvailabilityOverrideDto, tenant: TenantContext): Promise<unknown> {
    // Verify exists
    await this.findOne(id, tenant);

    const updateData: any = {};

    if (dto.dateFrom !== undefined) {
      updateData.dateFrom = startOfDay(parseISO(dto.dateFrom));
    }
    if (dto.dateTo !== undefined) {
      updateData.dateTo = endOfDay(parseISO(dto.dateTo));
    }
    if (dto.type !== undefined) {
      updateData.type = dto.type;
    }
    if (dto.isClosed !== undefined) {
      updateData.isClosed = dto.isClosed;
    }
    if (dto.capacityOverride !== undefined) {
      updateData.capacityOverride = dto.capacityOverride;
    }
    if (dto.priceOverride !== undefined) {
      updateData.priceOverride = dto.priceOverride;
    }
    if (dto.priceMultiplier !== undefined) {
      updateData.priceMultiplier = dto.priceMultiplier;
    }
    if (dto.reason !== undefined) {
      updateData.reason = dto.reason;
    }
    if (dto.metadata !== undefined) {
      updateData.metadata = dto.metadata;
    }

    const override = await this.prisma.availabilityOverride.update({
      where: { id },
      data: updateData,
    });

    return override;
  }

  /**
   * Delete an availability override
   */
  async remove(id: string, tenant: TenantContext): Promise<void> {
    // Verify exists
    await this.findOne(id, tenant);

    await this.prisma.availabilityOverride.delete({
      where: { id },
    });
  }

  /**
   * Get the effective override for a specific date (used by availability service)
   */
  async getEffectiveOverride(
    offeringId: string,
    date: Date,
    tenant: TenantContext,
  ): Promise<unknown | null> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Find all overrides that apply to this date
    const overrides = await this.prisma.availabilityOverride.findMany({
      where: {
        tenantId: tenant.tenantId,
        offeringId,
        dateFrom: {
          lte: dayEnd,
        },
        dateTo: {
          gte: dayStart,
        },
      },
      orderBy: {
        createdAt: 'desc', // Most recent override takes precedence
      },
    });

    // Return the most recent override if any
    return overrides.length > 0 ? overrides[0] : null;
  }
}
