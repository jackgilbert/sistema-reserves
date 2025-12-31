import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { UpdateInstanceDto } from './dto/update-instance.dto';

@Injectable()
export class InstancesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInstanceDto) {
    return this.prisma.instance.create({
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

  async findAll() {
    return this.prisma.instance.findMany({
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

  async findOne(id: string) {
    return this.prisma.instance.findUnique({
      where: { id },
      include: {
        domains: true,
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.instance.findUnique({
      where: { slug },
      include: {
        domains: true,
      },
    });
  }

  async update(id: string, dto: UpdateInstanceDto) {
    return this.prisma.instance.update({
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

  async remove(id: string) {
    return this.prisma.instance.delete({
      where: { id },
    });
  }

  async addDomain(instanceId: string, domain: string, isPrimary = false) {
    return this.prisma.domain.create({
      data: {
        domain,
        instanceId,
        isPrimary,
      },
    });
  }

  async removeDomain(domainId: string) {
    return this.prisma.domain.delete({
      where: { id: domainId },
    });
  }
}
