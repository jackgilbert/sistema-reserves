import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HoldsService } from '../holds/holds.service';
import { PrismaClient } from '@sistema-reservas/db';
import { addHours, addMinutes } from 'date-fns';
import { EmailService } from '../notifications/notifications.service';
import { DEFAULT_TENANT_SETTINGS } from '../settings/settings.types';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private readonly cronEnabled = process.env.ENABLE_CRON !== 'false';

  constructor(
    private readonly holdsService: HoldsService,
    private readonly prisma: PrismaClient,
    private readonly emailService: EmailService,
  ) {
    if (!this.cronEnabled) {
      this.logger.warn('⚠️  Cron jobs deshabilitados (ENABLE_CRON=false)');
    }
  }

  /**
   * Liberar holds expirados cada 15 minutos
   */
  @Cron('*/15 * * * *')
  async releaseExpiredHolds() {
    if (!this.cronEnabled) return;

    this.logger.log('Iniciando liberación de holds expirados...');

    try {
      const released = await this.holdsService.releaseExpiredHolds();

      if (released.released > 0) {
        this.logger.log(
          `${released.released} holds expirados liberados exitosamente`,
        );
      } else {
        this.logger.debug('No hay holds expirados para liberar');
      }
    } catch (error) {
      this.logger.error('Error al liberar holds expirados:', error);
    }
  }

  /**
   * Limpiar eventos de check-in antiguos (mantener solo últimos 90 días)
   * Se ejecuta a las 3:00 AM todos los días
   */
  @Cron('0 3 * * *')
  async cleanOldCheckInEvents() {
    if (!this.cronEnabled) return;

    this.logger.log('Limpiando eventos de check-in antiguos...');

    // TODO: Implementar limpieza de eventos antiguos
    this.logger.debug('Limpieza de eventos programada');
  }

  /**
   * Generar reportes diarios
   * Se ejecuta a las 1:00 AM todos los días
   */
  @Cron('0 1 * * *')
  async generateDailyReports() {
    if (!this.cronEnabled) return;

    this.logger.log('Generando reportes diarios...');

    // TODO: Implementar generación de reportes
    this.logger.debug('Generación de reportes programada');
  }

  /**
   * Enviar recordatorios de reserva
   * Se ejecuta cada 15 minutos
   */
  @Cron('*/15 * * * *')
  async sendBookingReminders() {
    if (!this.cronEnabled) return;

    const now = new Date();
    try {
      const instances = await this.prisma.instance.findMany({
        select: {
          id: true,
          notificationSettings: true,
        },
      });

      for (const instance of instances) {
        const settings = {
          ...DEFAULT_TENANT_SETTINGS.notifications,
          ...(instance.notificationSettings as Record<string, any>),
        };

        if (!settings.sendBookingReminder) continue;

        const hours = settings.reminderHoursBefore ?? 24;
        const target = addHours(now, hours);
        const windowStart = addMinutes(target, -15);
        const windowEnd = addMinutes(target, 15);

        const bookings = await this.prisma.booking.findMany({
          where: {
            tenantId: instance.id,
            status: 'CONFIRMED',
            slotStart: {
              gte: windowStart,
              lte: windowEnd,
            },
          },
          include: {
            offering: { select: { name: true } },
          },
        });

        for (const booking of bookings) {
          const meta = (booking.metadata || {}) as Record<string, any>;
          if (meta.reminderSentAt) continue;

          try {
            await this.emailService.sendBookingReminder(instance.id, {
              code: booking.code,
              customerName: booking.customerName,
              customerEmail: booking.customerEmail,
              slotStart: booking.slotStart,
              offeringName: booking.offering?.name,
            });

            await this.prisma.booking.update({
              where: { id: booking.id },
              data: {
                metadata: {
                  ...meta,
                  reminderSentAt: now.toISOString(),
                },
              },
            });
          } catch (error) {
            this.logger.warn(
              `Error enviando recordatorio ${booking.code}: ${(error as Error)?.message}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Error al enviar recordatorios:', error);
    }
  }
}
