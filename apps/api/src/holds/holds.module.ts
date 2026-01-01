import { Module } from '@nestjs/common';
import { HoldsController } from './holds.controller';
import { HoldsService } from './holds.service';
import { TenantModule } from '../tenant/tenant.module';
import { PrismaClient } from '@sistema-reservas/db';

@Module({
  imports: [TenantModule],
  controllers: [HoldsController],
  providers: [HoldsService, PrismaClient],
  exports: [HoldsService],
})
export class HoldsModule {}
