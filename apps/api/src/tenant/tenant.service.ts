import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';

@Injectable()
export class TenantService {
  // Cache simple en memoria (en producción usar Redis)
  private domainCache = new Map<string, TenantContext>();
  
  /**
   * Resuelve el tenant basado en el dominio de la petición
   */
  async resolveTenantByDomain(domain: string): Promise<TenantContext> {
    // Verificar cache
    if (this.domainCache.has(domain)) {
      return this.domainCache.get(domain)!;
    }

    // Buscar en base de datos
    const domainRecord = await prisma.domain.findUnique({
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

    // Guardar en cache
    this.domainCache.set(domain, tenantContext);

    return tenantContext;
  }

  /**
   * Limpia el cache de dominios
   */
  clearCache() {
    this.domainCache.clear();
  }
}
