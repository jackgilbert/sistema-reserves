import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { TenantModule } from '../tenant/tenant.module';
import { PrismaClient } from '@sistema-reservas/db';

@Module({
  imports: [TenantModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, PrismaClient],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
