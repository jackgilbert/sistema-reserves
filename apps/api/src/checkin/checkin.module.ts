import { Module } from '@nestjs/common';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { TenantModule } from '../tenant/tenant.module';
import { PrismaClient } from '@sistema-reservas/db';
import { BookingRepository } from '../common/repositories/booking.repository';

@Module({
  imports: [TenantModule],
  controllers: [CheckinController],
  providers: [CheckinService, PrismaClient, BookingRepository],
  exports: [CheckinService],
})
export class CheckInModule {}
