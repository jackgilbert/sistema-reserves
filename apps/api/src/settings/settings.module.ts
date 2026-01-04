import { Module } from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsValidatorService } from './settings-validator.service';
import { TenantModule } from '../tenant/tenant.module';
import { FeatureFlagGuard } from './guards/feature-flag.guard';

@Module({
  imports: [TenantModule],
  controllers: [SettingsController],
  providers: [
    PrismaClient,
    SettingsService,
    SettingsValidatorService,
    FeatureFlagGuard,
  ],
  exports: [SettingsService, FeatureFlagGuard],
})
export class SettingsModule {}
