import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '@sistema-reservas/shared';

/**
 * Decorator para inyectar el contexto del tenant en los controladores
 */
export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);
