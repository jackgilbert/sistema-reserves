import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';

export interface CreateOfferingDto {
  slug: string;
  name: string;
  description?: string;
  type: string; // 'CAPACITY' | 'RESOURCE' | 'APPOINTMENT' | 'SEATS'
  basePrice: number;
  currency?: string;
  capacity?: number;
  active?: boolean;
  schedule?: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    slotDuration: number;
    validFrom: Date;
    validTo?: Date;
  };
  priceVariants?: Array<{ name: string; price: number; description?: string }>;
}

export interface UpdateOfferingDto {
  name?: string;
  description?: string;
  basePrice?: number;
  capacity?: number;
  active?: boolean;
}

export interface CreateResourceDto {
  offeringId: string;
  resources: Array<{ code: string; name: string }>;
}

@Injectable()
export class OfferingsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Crear nueva offering
   */
  async create(dto: CreateOfferingDto, tenant: TenantContext) {
    const { slug, name, description, type, basePrice, currency, capacity, active, schedule, priceVariants } = dto;

    // Verificar que el slug no exista
    const existing = await this.prisma.offering.findFirst({
      where: {
        tenantId: tenant.tenantId,
        slug,
      },
    });

    if (existing) {
      throw new BadRequestException(`Ya existe una offering con el slug "${slug}"`);
    }

    // Crear offering con schedule opcional
    const offering = await this.prisma.offering.create({
      data: {
        tenantId: tenant.tenantId,
        slug,
        name,
        description: description || null,
        type,
        basePrice,
        currency: currency || 'EUR',
        capacity: capacity || null,
        active: active !== undefined ? active : true,
        priceVariants: priceVariants || [],
        schedules: schedule
          ? {
              create: {
                tenantId: tenant.tenantId,
                daysOfWeek: schedule.daysOfWeek,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                slotDuration: schedule.slotDuration,
                validFrom: schedule.validFrom,
                validTo: schedule.validTo || null,
              },
            }
          : undefined,
      },
      include: {
        schedules: true,
      },
    });

    return offering;
  }

  /**
   * Listar todas las offerings del tenant
   */
  async findAll(tenant: TenantContext, activeOnly = false) {
    const offerings = await this.prisma.offering.findMany({
      where: {
        tenantId: tenant.tenantId,
        ...(activeOnly ? { active: true } : {}),
      },
      include: {
        schedules: true,
        _count: {
          select: {
            resources: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return offerings;
  }

  /**
   * Obtener una offering por ID
   */
  async findOne(id: string, tenant: TenantContext) {
    const offering = await this.prisma.offering.findFirst({
      where: {
        tenantId: tenant.tenantId,
        id,
      },
      include: {
        schedules: true,
        resources: {
          where: { active: true },
        },
      },
    });

    if (!offering) {
      throw new NotFoundException('Offering no encontrada');
    }

    return offering;
  }

  /**
   * Obtener offering por slug
   */
  async findBySlug(slug: string, tenant: TenantContext) {
    const offering = await this.prisma.offering.findFirst({
      where: {
        tenantId: tenant.tenantId,
        slug,
        active: true,
      },
      include: {
        schedules: true,
      },
    });

    if (!offering) {
      throw new NotFoundException('Offering no encontrada');
    }

    return offering;
  }

  /**
   * Activar/desactivar offering
   */
  async toggleActive(id: string, active: boolean, tenant: TenantContext) {
    await this.findOne(id, tenant);

    const updated = await this.prisma.offering.update({
      where: {
        id,
      },
      data: {
        active,
      },
    });

    return updated;
  }

  /**
   * Crear recursos para una offering tipo RESOURCE
   */
  async createResources(dto: CreateResourceDto, tenant: TenantContext) {
    const { offeringId, resources } = dto;

    // Verificar que la offering existe y es tipo RESOURCE
    const offering = await this.findOne(offeringId, tenant);

    if (offering.type !== 'RESOURCE') {
      throw new BadRequestException('Solo se pueden crear recursos para offerings tipo RESOURCE');
    }

    // Crear recursos en batch
    const created = await this.prisma.$transaction(
      resources.map((resource) =>
        this.prisma.resource.create({
          data: {
            tenantId: tenant.tenantId,
            offeringId,
            code: resource.code,
            name: resource.name,
            active: true,
          },
        }),
      ),
    );

    return created;
  }
}
