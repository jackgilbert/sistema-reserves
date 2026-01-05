import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate limiting: 10 requests per minute by default
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10,
      },
    ]),
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
    HealthModule,
  ],
  providers: [
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}
