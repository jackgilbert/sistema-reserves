import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilityCalendarController } from './availability-calendar.controller';
import { AvailabilityCalendarService } from './availability-calendar.service';
import { TenantModule } from '../tenant/tenant.module';
import { PrismaClient } from '@sistema-reservas/db';

@Module({
  imports: [TenantModule],
  controllers: [AvailabilityController, AvailabilityCalendarController],
  providers: [AvailabilityService, AvailabilityCalendarService, PrismaClient],
  exports: [AvailabilityService, AvailabilityCalendarService],
})
export class AvailabilityModule {}
