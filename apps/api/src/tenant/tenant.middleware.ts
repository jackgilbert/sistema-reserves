import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';
import { TenantContext } from '@sistema-reservas/shared';

// Extender el tipo Request para incluir tenant
declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Obtener el dominio del header Host
    const host = req.get('host') || req.hostname;
    
    // Remover el puerto si existe
    const domain = host.split(':')[0];

    try {
      // Resolver tenant
      const tenant = await this.tenantService.resolveTenantByDomain(domain);
      
      // Adjuntar al request
      req.tenant = tenant;
      
      next();
    } catch (error) {
      // Si no se encuentra el tenant, devolver 404
      throw new NotFoundException(`Instancia no encontrada para el dominio: ${domain}`);
    }
  }
}
