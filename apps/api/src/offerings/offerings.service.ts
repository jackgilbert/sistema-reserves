import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
  metadata?: Record<string, any>;
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
  currency?: string;
  capacity?: number;
  active?: boolean;
  priceVariants?: Array<{ name: string; price: number; description?: string }>;
  metadata?: Record<string, any>;
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
  async create(
    dto: CreateOfferingDto,
    tenant: TenantContext,
  ): Promise<unknown> {
    const {
      slug,
      name,
      description,
      type,
      basePrice,
      currency,
      capacity,
      active,
      metadata,
      schedule,
      priceVariants,
    } = dto;

    // Verificar que el slug no exista
    const existing = await this.prisma.offering.findFirst({
      where: {
        tenantId: tenant.tenantId,
        slug,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Ya existe una offering con el slug "${slug}"`,
      );
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
        metadata: metadata && typeof metadata === 'object' ? metadata : {},
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
  async findAll(tenant: TenantContext, activeOnly = false): Promise<unknown[]> {
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
  async findOne(id: string, tenant: TenantContext): Promise<unknown> {
    console.log(`🔍 [OfferingsService] Buscando offering:`, {
      id,
      tenantId: tenant.tenantId,
    });

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

    console.log(
      `📊 [OfferingsService] Resultado:`,
      offering ? 'ENCONTRADO' : 'NO ENCONTRADO',
    );

    if (!offering) {
      // Log all offerings for this tenant to help debug
      const allOfferings = await this.prisma.offering.findMany({
        where: { tenantId: tenant.tenantId },
        select: { id: true, slug: true, name: true },
      });
      console.log(
        `📋 [OfferingsService] Offerings disponibles para tenant ${tenant.tenantId}:`,
        allOfferings,
      );
      throw new NotFoundException('Offering no encontrada');
    }

    return offering;
  }

  /**
   * Obtener offering por slug
   */
  async findBySlug(slug: string, tenant: TenantContext): Promise<unknown> {
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
  async toggleActive(
    id: string,
    active: boolean,
    tenant: TenantContext,
  ): Promise<unknown> {
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
   * Actualizar campos de una offering
   */
  async update(
    id: string,
    dto: UpdateOfferingDto,
    tenant: TenantContext,
  ): Promise<unknown> {
    await this.findOne(id, tenant);

    const data: Record<string, any> = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description || null;
    if (dto.basePrice !== undefined) data.basePrice = dto.basePrice;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.capacity !== undefined) data.capacity = dto.capacity ?? null;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.priceVariants !== undefined) data.priceVariants = dto.priceVariants;
    if (dto.metadata !== undefined) data.metadata = dto.metadata;

    if (Object.keys(data).length === 0) {
      return this.findOne(id, tenant);
    }

    return this.prisma.offering.update({
      where: { id },
      data,
      include: {
        schedules: true,
        resources: { where: { active: true } },
      },
    });
  }

  /**
   * Crear recursos para una offering tipo RESOURCE
   */
  async createResources(
    dto: CreateResourceDto,
    tenant: TenantContext,
  ): Promise<unknown> {
    const { offeringId, resources } = dto;

    // Verificar que la offering existe y es tipo RESOURCE
    const offering = (await this.findOne(offeringId, tenant)) as {
      type: string;
    };

    if (offering.type !== 'RESOURCE') {
      throw new BadRequestException(
        'Solo se pueden crear recursos para offerings tipo RESOURCE',
      );
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
