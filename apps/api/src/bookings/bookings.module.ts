import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { TenantModule } from '../tenant/tenant.module';
import { PrismaClient } from '@sistema-reservas/db';
import { BookingRepository } from '../common/repositories/booking.repository';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TenantModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService, PrismaClient, BookingRepository],
  exports: [BookingsService],
})
export class BookingsModule {}
