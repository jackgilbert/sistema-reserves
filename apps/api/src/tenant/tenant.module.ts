import { Module, Global } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { PrismaClient } from '@sistema-reservas/db';

@Global()
@Module({
  providers: [TenantService, PrismaClient],
  exports: [TenantService],
})
export class TenantModule {}
