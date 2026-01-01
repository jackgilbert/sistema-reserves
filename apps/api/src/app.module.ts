import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantModule } from './tenant/tenant.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { InstancesModule } from './instances/instances.module';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { OfferingsModule } from './offerings/offerings.module';
import { HoldsModule } from './holds/holds.module';
import { BookingsModule } from './bookings/bookings.module';
import { CheckInModule } from './checkin/checkin.module';
import { PaymentsModule } from './payments/payments.module';
import { TasksModule } from './tasks/tasks.module';

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
    TasksModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}
