import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HoldsService } from '../holds/holds.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly holdsService: HoldsService) {}

  /**
   * Liberar holds expirados cada 5 minutos
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async releaseExpiredHolds() {
    this.logger.log('Iniciando liberación de holds expirados...');
    
    try {
      const released = await this.holdsService.releaseExpiredHolds();
      
      if (released.released > 0) {
        this.logger.log(`${released.released} holds expirados liberados exitosamente`);
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
    this.logger.log('Generando reportes diarios...');
    
    // TODO: Implementar generación de reportes
    this.logger.debug('Generación de reportes programada');
  }
}
