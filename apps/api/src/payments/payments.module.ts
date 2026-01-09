import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantModule } from '../tenant/tenant.module';
import { BookingsModule } from '../bookings/bookings.module';
import { SettingsModule } from '../settings/settings.module';
import { RedsysService } from './redsys/redsys.service';

@Module({
	imports: [TenantModule, BookingsModule, SettingsModule],
	controllers: [PaymentsController],
	providers: [PaymentsService, RedsysService, PrismaClient],
})
export class PaymentsModule {}
