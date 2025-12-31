import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { QueryOfferingsDto } from './dto/query-offerings.dto';
import { TenantContext } from '@sistema-reservas/shared';

@Injectable()
export class OfferingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear una nueva oferta para el tenant actual
   */
  async create(createOfferingDto: CreateOfferingDto, tenant: TenantContext) {
    const { schedule, ...offeringData } = createOfferingDto;

    const offering = await this.prisma.offering.create({
      data: {
        ...offeringData,
        tenantId: tenant.tenantId,
        // TODO: Implementar creación de schedules
      },
      include: {
        schedules: true,
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    return offering;
  }

  /**
   * Listar ofertas del tenant actual
   */
  async findAll(query: QueryOfferingsDto, tenant: TenantContext) {
    const where: any = {
      tenantId: tenant.tenantId,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.active !== undefined) {
      where.active = query.active;
    }

    const offerings = await this.prisma.offering.findMany({
      where,
      include: {
        schedules: true,
        _count: {
          select: {
            bookings: true,
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
   * Obtener una oferta por ID (verificando que pertenece al tenant)
   */
  async findOne(id: string, tenant: TenantContext) {
    const offering = await this.prisma.offering.findUnique({
      where: {
        tenantId_id: {
          tenantId: tenant.tenantId,
          id,
        },
      },
      include: {
        schedules: true,
        resources: {
          where: {
            active: true,
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!offering) {
      throw new NotFoundException(`Oferta con ID ${id} no encontrada`);
    }

    return offering;
  }

  /**
   * Actualizar una oferta
   */
  async update(id: string, updateOfferingDto: UpdateOfferingDto, tenant: TenantContext) {
    // Verificar que existe y pertenece al tenant
    await this.findOne(id, tenant);

    const { schedule, ...offeringData } = updateOfferingDto;

    const offering = await this.prisma.offering.update({
      where: {
        tenantId_id: {
          tenantId: tenant.tenantId,
          id,
        },
      },
      data: {
        ...offeringData,
        // TODO: Implementar actualización de schedules
      },
      include: {
        schedules: true,
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    return offering;
  }

  /**
   * Eliminar (soft delete) una oferta
   */
  async remove(id: string, tenant: TenantContext) {
    // Verificar que existe y pertenece al tenant
    await this.findOne(id, tenant);

    // Verificar si tiene reservas asociadas
    const bookingsCount = await this.prisma.booking.count({
      where: {
        tenantId: tenant.tenantId,
        offeringId: id,
        status: {
          in: ['CONFIRMED', 'HOLD'],
        },
      },
    });

    if (bookingsCount > 0) {
      throw new ForbiddenException(
        `No se puede eliminar la oferta porque tiene ${bookingsCount} reserva(s) activa(s). Desactívala en su lugar.`
      );
    }

    // Soft delete: marcar como inactiva
    const offering = await this.prisma.offering.update({
      where: {
        tenantId_id: {
          tenantId: tenant.tenantId,
          id,
        },
      },
      data: {
        active: false,
      },
    });

    return { message: 'Oferta desactivada exitosamente', offering };
  }

  /**
   * Obtener oferta para usuarios públicos (sin necesidad de autenticación)
   */
  async findOnePublic(id: string, domain: string) {
    // Obtener el tenant desde el dominio
    const domainRecord = await this.prisma.domain.findUnique({
      where: { domain },
      include: { instance: true },
    });

    if (!domainRecord) {
      throw new NotFoundException('Dominio no encontrado');
    }

    const offering = await this.prisma.offering.findUnique({
      where: {
        tenantId_id: {
          tenantId: domainRecord.instanceId,
          id,
        },
        active: true,
      },
      include: {
        schedules: true,
        instance: {
          select: {
            name: true,
            logo: true,
            primaryColor: true,
            secondaryColor: true,
            timezone: true,
            locale: true,
            currency: true,
          },
        },
      },
    });

    if (!offering) {
      throw new NotFoundException('Oferta no encontrada o inactiva');
    }

    return offering;
  }
}
