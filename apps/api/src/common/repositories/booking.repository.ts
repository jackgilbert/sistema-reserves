import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient, Booking } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';

type BookingWithOfferingAndItems = Prisma.BookingGetPayload<{
  include: {
    offering: {
      select: {
        name: true;
        type: true;
        metadata: true;
      };
    };
    items: true;
  };
}>;

/**
 * Shared repository for booking-related database operations
 * Reduces code duplication across services
 */
@Injectable()
export class BookingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find booking by code with standard includes
   */
  async findByCode(
    code: string,
    tenant: TenantContext,
    includes?: {
      offering?: boolean;
      items?: boolean;
      tickets?: boolean;
    },
  ): Promise<Booking | null> {
    return this.prisma.booking.findFirst({
      where: {
        tenantId: tenant.tenantId,
        code,
      },
      include: includes || {
        offering: true,
        items: true,
      },
    });
  }

  /**
   * Find booking by code or throw NotFoundException
   */
  async findByCodeOrFail(
    code: string,
    tenant: TenantContext,
    includes?: {
      offering?: boolean;
      items?: boolean;
      tickets?: boolean;
    },
  ): Promise<Booking> {
    const booking = await this.findByCode(code, tenant, includes);

    if (!booking) {
      throw new NotFoundException(`Booking with code ${code} not found`);
    }

    return booking;
  }

  /**
   * Find booking by ID
   */
  async findById(
    id: string,
    tenant: TenantContext,
    includes?: {
      offering?: boolean;
      items?: boolean;
      tickets?: boolean;
    },
  ): Promise<Booking | null> {
    return this.prisma.booking.findFirst({
      where: {
        tenantId: tenant.tenantId,
        id,
      },
      include: includes || {
        offering: true,
        items: true,
      },
    });
  }

  /**
   * Find booking by ID or throw NotFoundException
   */
  async findByIdOrFail(
    id: string,
    tenant: TenantContext,
    includes?: {
      offering?: boolean;
      items?: boolean;
      tickets?: boolean;
    },
  ): Promise<Booking> {
    const booking = await this.findById(id, tenant, includes);

    if (!booking) {
      throw new NotFoundException(`Booking with id ${id} not found`);
    }

    return booking;
  }

  /**
   * List all bookings for tenant with optional filters
   */
  async findAll(
    tenant: TenantContext,
    filters?: {
      status?: string;
      offeringId?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<BookingWithOfferingAndItems[]> {
    const where: Prisma.BookingWhereInput = {
      tenantId: tenant.tenantId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.offeringId) {
      where.offeringId = filters.offeringId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.slotStart = {};
      if (filters.startDate) {
        where.slotStart.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.slotStart.lte = filters.endDate;
      }
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        offering: {
          select: {
            name: true,
            type: true,
            metadata: true,
          },
        },
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
