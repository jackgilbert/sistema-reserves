import { Module } from '@nestjs/common';
import { ParkingController } from './parking.controller';
import { ParkingService } from './parking.service';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantModule } from '../tenant/tenant.module';
import { GateService } from './gate.service';

@Module({
  imports: [TenantModule],
  controllers: [ParkingController],
  providers: [ParkingService, GateService, PrismaClient],
  exports: [ParkingService],
})
export class ParkingModule {}
