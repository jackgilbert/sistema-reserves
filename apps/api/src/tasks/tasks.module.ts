import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { HoldsModule } from '../holds/holds.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HoldsModule,
  ],
  providers: [TasksService],
})
export class TasksModule {}
