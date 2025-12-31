import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantModule } from './tenant/tenant.module';
import { InstancesModule } from './instances/instances.module';
import { AuthModule } from './auth/auth.module';
import { OfferingsModule } from './offerings/offerings.module';
import { AvailabilityModule } from './availability/availability.module';
import { HoldsModule } from './holds/holds.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { CheckInModule } from './checkin/checkin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TenantModule,
    InstancesModule,
    AuthModule,
    OfferingsModule,
    AvailabilityModule,
    HoldsModule,
    BookingsModule,
    PaymentsModule,
    CheckInModule,
  ],
})
export class AppModule {}
