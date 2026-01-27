import { Module } from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { EmailService } from './notifications.service';

@Module({
  providers: [EmailService, PrismaClient],
  exports: [EmailService],
})
export class NotificationsModule {}
