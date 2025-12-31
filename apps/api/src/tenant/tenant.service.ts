import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '@sistema-reservas/shared';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  private domainCache = new Map<string, TenantContext>();
  
  async resolveTenantByDomain(domain: string): Promise<TenantContext> {
    if (this.domainCache.has(domain)) {
      return this.domainCache.get(domain)!;
    }

    const domainRecord = await this.prisma.domain.findUnique({
      where: { domain },
      include: { instance: true },
    });

    if (!domainRecord || !domainRecord.instance.active) {
      throw new NotFoundException(`No se encontró una instancia activa para el dominio: ${domain}`);
    }

    const tenantContext: TenantContext = {
      tenantId: domainRecord.instance.id,
      instanceSlug: domainRecord.instance.slug,
      domain: domain,
    };

    this.domainCache.set(domain, tenantContext);
    return tenantContext;
  }

  clearCache() {
    this.domainCache.clear();
  }
}
