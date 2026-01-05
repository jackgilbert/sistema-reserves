import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);
  
  constructor(private readonly prisma: PrismaClient) {}
  
  // Cache simple en memoria (en producción usar Redis)
  private domainCache = new Map<string, TenantContext>();

  /**
   * Resuelve el tenant basado en el dominio de la petición
   */
  async resolveTenantByDomain(domain: string): Promise<TenantContext> {
    // Validar que domain no sea undefined o vacío
    if (!domain) {
      throw new NotFoundException(
        `Dominio inválido o no proporcionado`,
      );
    }

    // Verificar cache
    if (this.domainCache.has(domain)) {
      return this.domainCache.get(domain)!;
    }

    // Buscar en base de datos
    let domainRecord;
    try {
      domainRecord = await this.prisma.domain.findUnique({
        where: { domain },
        include: { instance: true },
      });
    } catch (error) {
      this.logger.error(`Failed to query domain ${domain}`, error.stack || error);
      throw error;
    }

    // Si no se encuentra el dominio, buscar el primer dominio activo como fallback
    if (!domainRecord) {
      domainRecord = await this.prisma.domain.findFirst({
        where: { instance: { active: true } },
        include: { instance: true },
        orderBy: [
          { isPrimary: 'desc' },
          { domain: 'asc' },
        ],
      });
    }

    if (!domainRecord) {
      throw new NotFoundException(
        `No se encontró ninguna instancia activa. Ejecuta: pnpm db:seed`,
      );
    }

    if (!domainRecord.instance.active) {
      throw new NotFoundException(
        `La instancia para el dominio ${domain} no está activa`,
      );
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
