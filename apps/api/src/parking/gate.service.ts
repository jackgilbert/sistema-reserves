import { Injectable, Logger } from '@nestjs/common';

/**
 * Interfaz abstracta para control de barreras
 * Implementaciones concretas se conectarán a relés GPIO/HTTP
 */
export interface GateProvider {
  /**
   * Abre la barrera identificada por gateId
   * @param gateId Identificador de la barrera
   * @returns Promise<void>
   */
  openGate(gateId: string): Promise<void>;
}

/**
 * Implementación de stub para desarrollo
 * En producción se sustituirá por GpioGateProvider o HttpRelayProvider
 */
@Injectable()
export class GateService implements GateProvider {
  private readonly logger = new Logger(GateService.name);

  /**
   * Simula apertura de barrera
   * TODO: Conectar con hardware real (GPIO, HTTP relay, etc.)
   */
  async openGate(gateId: string): Promise<void> {
    this.logger.log(`[STUB] Abriendo barrera: ${gateId}`);
    
    // Simular delay de apertura física
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    this.logger.log(`[STUB] Barrera ${gateId} abierta`);
    
    // En producción:
    // - Enviar señal GPIO a relé
    // - Llamar HTTP endpoint del controlador de barrera
    // - Enviar MQTT message a dispositivo IoT
    // - etc.
  }
}
