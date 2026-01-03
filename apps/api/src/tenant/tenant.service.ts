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

    // Normalizar dominios de desarrollo a 'localhost'
    const normalizedDomain = this.normalizeDomain(domain);
    console.log(`🔍 Buscando dominio: ${domain} (normalizado: ${normalizedDomain})`);

    // Verificar cache
    if (this.domainCache.has(normalizedDomain)) {
      console.log(`✅ Dominio ${normalizedDomain} encontrado en cache`);
      return this.domainCache.get(normalizedDomain)!;
    }

    console.log(`📡 Consultando base de datos para: ${normalizedDomain}`);

    // Buscar en base de datos
    let domainRecord;
    try {
      domainRecord = await this.prisma.domain.findUnique({
        where: { domain: normalizedDomain },
        include: { instance: true },
      });
      console.log(`📊 Resultado de búsqueda para ${normalizedDomain}:`, domainRecord ? 'ENCONTRADO' : 'NO ENCONTRADO');
    } catch (error) {
      console.error(`❌ Error al buscar dominio ${normalizedDomain}:`, error);
      throw error;
    }

    // Si no se encuentra el dominio, buscar el primer dominio activo como fallback (desarrollo)
    if (!domainRecord) {
      console.log(`⚠️  Dominio ${normalizedDomain} no encontrado, usando instancia por defecto...`);
      domainRecord = await this.prisma.domain.findFirst({
        where: { 
          instance: { active: true },
          isPrimary: true 
        },
        include: { instance: true },
      });
      
      if (!domainRecord) {
        // Si no hay dominio primario, usar cualquier instancia activa
        domainRecord = await this.prisma.domain.findFirst({
          where: { instance: { active: true } },
          include: { instance: true },
        });
      }
      
      console.log(`📊 Fallback result:`, domainRecord ? `ENCONTRADO: ${domainRecord.domain}` : 'NO ENCONTRADO');
    }

    if (!domainRecord) {
      throw new NotFoundException(
        `No se encontró ninguna instancia activa. Por favor ejecuta: pnpm db:seed`,
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
      domain: normalizedDomain,
    };

    // Guardar en cache (usar el dominio normalizado como key)
    this.domainCache.set(normalizedDomain, tenantContext);

    return tenantContext;
  }

  /**
   * Normaliza el dominio para desarrollo
   * Mapea dominios de GitHub Codespaces, Gitpod, etc. a 'localhost'
   */
  private normalizeDomain(domain: string): string {
    // Si contiene patrones de desarrollo, usar localhost
    if (
      domain.includes('localhost') ||
      domain.includes('.app.github.dev') ||
      domain.includes('.gitpod.io') ||
      domain.includes('.repl.co') ||
      domain.includes('127.0.0.1')
    ) {
      return 'localhost';
    }
    
    return domain;
  }

  /**
   * Limpia el cache de dominios
   */
  clearCache() {
    this.domainCache.clear();
  }
}
