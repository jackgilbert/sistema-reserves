import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from '../decorators/require-feature.decorator';
import { SettingsService } from '../settings.service';
import { TenantContext } from '@sistema-reservas/shared';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly settingsService: SettingsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featurePath = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!featurePath) {
      // Sin decorador, permitir acceso
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant as TenantContext;

    if (!tenant) {
      throw new ForbiddenException('Tenant no identificado');
    }

    const isEnabled = await this.settingsService.isFeatureEnabled(
      featurePath,
      tenant,
    );

    if (!isEnabled) {
      throw new ForbiddenException(
        `La característica ${featurePath} no está habilitada`,
      );
    }

    return true;
  }
}
