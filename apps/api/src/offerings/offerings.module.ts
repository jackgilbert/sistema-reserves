import { Module } from '@nestjs/common';
import { OfferingsController } from './offerings.controller';
import { OfferingsService } from './offerings.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [OfferingsController],
  providers: [OfferingsService],
  exports: [OfferingsService],
})
export class OfferingsModule {}
