import { Injectable, Logger } from '@nestjs/common';

/**
 * Injection token used throughout the parking module to resolve
 * the active GateProvider implementation at runtime.
 *
 * Resolved to:
 *   - HikvisionGateService when HIKVISION_HOST is set (DS-TMG52X & DS-series)
 *   - GateService (stub) otherwise (development / CI)
 */
export const GATE_PROVIDER = Symbol('GATE_PROVIDER');

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
 * Implementación de stub para desarrollo.
 * En producción se usa HikvisionGateService (DS-TMG52X).
 */
@Injectable()
export class GateService implements GateProvider {
  private readonly logger = new Logger(GateService.name);

  /**
   * Simula apertura de barrera (stub para desarrollo/CI).
   * En producción se usa HikvisionGateService con DS-TMG52X.
   */
  async openGate(gateId: string): Promise<void> {
    this.logger.log(`[STUB] Abriendo barrera: ${gateId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.logger.log(`[STUB] Barrera ${gateId} abierta`);
  }
}
