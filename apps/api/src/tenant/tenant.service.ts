import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';

@Injectable()
export class TenantService {
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

    console.log(`🔍 Buscando dominio: ${domain}`);

    // Verificar cache
    if (this.domainCache.has(domain)) {
      console.log(`✅ Dominio ${domain} encontrado en cache`);
      return this.domainCache.get(domain)!;
    }

    console.log(`📡 Consultando base de datos para: ${domain}`);

    // Buscar en base de datos
    let domainRecord;
    try {
      domainRecord = await this.prisma.domain.findUnique({
        where: { domain },
        include: { instance: true },
      });
      console.log(`📊 Resultado de búsqueda para ${domain}:`, domainRecord ? 'ENCONTRADO' : 'NO ENCONTRADO');
    } catch (error) {
      console.error(`❌ Error al buscar dominio ${domain}:`, error);
      throw error;
    }

    // Si no se encuentra el dominio, buscar el primer dominio activo como fallback
    if (!domainRecord) {
      console.log(`⚠️  Dominio ${domain} no encontrado, usando instancia por defecto...`);
      domainRecord = await this.prisma.domain.findFirst({
        where: { instance: { active: true } },
        include: { instance: true },
      });
      console.log(`📊 Fallback result:`, domainRecord ? `ENCONTRADO: ${domainRecord.domain}` : 'NO ENCONTRADO');
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
