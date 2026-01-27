import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { HoldsModule } from '../holds/holds.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaClient } from '@sistema-reservas/db';

@Module({
  imports: [ScheduleModule.forRoot(), HoldsModule, NotificationsModule],
  providers: [TasksService, PrismaClient],
})
export class TasksModule {}
