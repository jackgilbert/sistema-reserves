import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ParkingController } from './parking.controller';
import { ParkingService } from './parking.service';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantModule } from '../tenant/tenant.module';
import { GateService, GATE_PROVIDER } from './gate.service';
import { HikvisionGateService } from './hikvision-gate.service';

/**
 * Dynamic provider: uses HikvisionGateService (DS-TMG52X / DS-series) when
 * HIKVISION_HOST is configured; falls back to the development stub otherwise.
 */
const gateProviderFactory = {
  provide: GATE_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    if (config.get<string>('HIKVISION_HOST')) {
      return new HikvisionGateService(config);
    }
    return new GateService();
  },
};

@Module({
  imports: [TenantModule, ConfigModule],
  controllers: [ParkingController],
  providers: [PrismaClient, gateProviderFactory, ParkingService],
  exports: [ParkingService],
})
export class ParkingModule {}
