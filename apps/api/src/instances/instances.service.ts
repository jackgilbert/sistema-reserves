import { Injectable } from '@nestjs/common';
import { prisma, Instance, Domain } from '@sistema-reservas/db';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { UpdateInstanceDto } from './dto/update-instance.dto';

@Injectable()
export class InstancesService {
  /**
   * Crear una nueva instancia
   */
  async create(dto: CreateInstanceDto): Promise<Instance & { domains: Domain[] }> {
    return prisma.instance.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        logo: dto.logo,
        primaryColor: dto.primaryColor || '#3B82F6',
        secondaryColor: dto.secondaryColor || '#10B981',
        timezone: dto.timezone || 'Europe/Madrid',
        locale: dto.locale || 'es-ES',
        currency: dto.currency || 'EUR',
        stripeAccount: dto.stripeAccount,
        featureFlags: dto.featureFlags || {},
        domains: {
          create: dto.domains?.map((domain) => ({
            domain: domain.domain,
            isPrimary: domain.isPrimary || false,
          })),
        },
      },
      include: {
        domains: true,
      },
    });
  }

  /**
   * Listar todas las instancias
   */
  async findAll(): Promise<any[]> {
    return prisma.instance.findMany({
      include: {
        domains: true,
        _count: {
          select: {
            offerings: true,
            bookings: true,
            users: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Obtener una instancia por ID
   */
  async findOne(id: string): Promise<(Instance & { domains: Domain[] }) | null> {
    return prisma.instance.findUnique({
      where: { id },
      include: {
        domains: true,
      },
    });
  }

  /**
   * Obtener una instancia por slug
   */
  async findBySlug(slug: string): Promise<(Instance & { domains: Domain[] }) | null> {
    return prisma.instance.findUnique({
      where: { slug },
      include: {
        domains: true,
      },
    });
  }

  /**
   * Actualizar una instancia
   */
  async update(id: string, dto: UpdateInstanceDto): Promise<Instance & { domains: Domain[] }> {
    return prisma.instance.update({
      where: { id },
      data: {
        name: dto.name,
        logo: dto.logo,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        timezone: dto.timezone,
        locale: dto.locale,
        currency: dto.currency,
        stripeAccount: dto.stripeAccount,
        featureFlags: dto.featureFlags,
        active: dto.active,
      },
      include: {
        domains: true,
      },
    });
  }

  /**
   * Eliminar una instancia
   */
  async remove(id: string): Promise<Instance> {
    return prisma.instance.delete({
      where: { id },
    });
  }

  /**
   * Añadir un dominio a una instancia
   */
  async addDomain(instanceId: string, domain: string, isPrimary = false): Promise<Domain> {
    return prisma.domain.create({
      data: {
        domain,
        instanceId,
        isPrimary,
      },
    });
  }

  /**
   * Eliminar un dominio
   */
  async removeDomain(domainId: string): Promise<Domain> {
    return prisma.domain.delete({
      where: { id: domainId },
    });
  }
}
