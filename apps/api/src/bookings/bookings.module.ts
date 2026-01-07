import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { TenantModule } from '../tenant/tenant.module';
import { PrismaClient } from '@sistema-reservas/db';
import { BookingRepository } from '../common/repositories/booking.repository';

@Module({
  imports: [TenantModule],
  controllers: [BookingsController],
  providers: [BookingsService, PrismaClient, BookingRepository],
  exports: [BookingsService],
})
export class BookingsModule {}
