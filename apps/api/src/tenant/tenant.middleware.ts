import {
  Injectable,
  NestMiddleware,
  NotFoundException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';
import { TenantContext } from '@sistema-reservas/shared';

// Extender el tipo Request para incluir tenant
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  private normalizeDomain(input: string | undefined): string | undefined {
    if (!input) return undefined;

    const trimmed = input.trim();
    if (!trimmed) return undefined;

    // Por seguridad, tomar sólo el primer valor si viniera una lista.
    const first = trimmed.split(',')[0].trim();

    // Remover el puerto si existe (localhost:3000 -> localhost)
    return first.split(':')[0];
  }

  async use(req: Request, res: Response, next: NextFunction) {
    // Obtener el dominio del header x-tenant-domain primero, luego Host
    let domain = this.normalizeDomain(req.get('x-tenant-domain'));

    if (!domain) {
      // Obtener el dominio del header Host
      const host = req.get('host') || req.hostname;
      domain = this.normalizeDomain(host);
    }

    if (!domain) {
      throw new NotFoundException('Dominio inválido o no proporcionado');
    }

    try {
      // Resolver tenant
      const tenant = await this.tenantService.resolveTenantByDomain(domain);

      // Adjuntar al request
      req.tenant = tenant;

      next();
    } catch (error) {
      // No enmascarar HttpExceptions (ej: DB vacía / dominio inválido)
      if (error instanceof HttpException) {
        throw error;
      }

      // Si hay un error inesperado (DB caído, env faltante, etc.), devolver 500.
      console.error('❌ Error resolviendo tenant', {
        domain,
        error,
      });

      const isProduction = process.env.NODE_ENV === 'production';
      const detail =
        !isProduction && (error as any)?.message
          ? `: ${(error as any).message}`
          : '';

      throw new InternalServerErrorException(`Error al resolver el tenant${detail}`);
    }
  }
}
