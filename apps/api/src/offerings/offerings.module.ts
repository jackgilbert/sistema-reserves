import { Module } from '@nestjs/common';
import { OfferingsController } from './offerings.controller';
import { OfferingsService } from './offerings.service';
import { TenantModule } from '../tenant/tenant.module';
import { PrismaClient } from '@sistema-reservas/db';

@Module({
  imports: [TenantModule],
  controllers: [OfferingsController],
  providers: [OfferingsService, PrismaClient],
  exports: [OfferingsService],
})
export class OfferingsModule {}
