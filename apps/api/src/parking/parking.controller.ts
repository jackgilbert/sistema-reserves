import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Tenant } from '../tenant/tenant.decorator';
import { TenantContext } from '@sistema-reservas/shared';
import {
  ParkingService,
  EntryRequest,
  QuoteRequest,
  PayRequest,
} from './parking.service';

/**
 * Controlador para el sistema de parking por minutos
 * 
 * Flujo normal:
 * 1. POST /parking/entry - Validar y crear sesión, abrir barrera entrada
 * 2. POST /parking/exit/quote - Calcular minutos y precio
 * 3. POST /parking/exit/pay - Procesar pago y abrir barrera salida
 * 
 * Admin:
 * - GET /parking/sessions - Listar sesiones
 * - POST /parking/admin/open-gate - Override manual de barrera
 */
@Controller('parking')
export class ParkingController {
  private readonly logger = new Logger(ParkingController.name);

  constructor(private readonly parkingService: ParkingService) {}

  /**
   * POST /parking/entry
   * 
   * Validar reserva, matrícula, rango horario y abrir barrera de entrada
   * 
   * Body:
   * {
   *   "bookingCode": "RES-ABC123",
   *   "plate": "1234ABC",
   *   "gateId": "entrada-principal" (opcional)
   * }
   * 
   * Respuesta:
   * {
   *   "sessionId": "uuid",
   *   "entryAt": "2025-01-07T18:30:00.000Z",
   *   "status": "IN_PROGRESS",
   *   "message": "Acceso concedido"
   * }
   */
  @Post('entry')
  async entry(@Body() dto: EntryRequest, @Tenant() tenant: TenantContext) {
    this.logger.log(
      `[ENTRY] bookingCode=${dto.bookingCode}, plate=${dto.plate}`,
    );
    return this.parkingService.entry(dto, tenant);
  }

  /**
   * POST /parking/exit/quote
   * 
   * Calcular minutos transcurridos y precio a pagar
   * 
   * Body:
   * {
   *   "bookingCode": "RES-ABC123",
   *   "plate": "1234ABC",
   *   "gateId": "salida-principal" (opcional)
   * }
   * 
   * Respuesta:
   * {
   *   "sessionId": "uuid",
   *   "entryAt": "2025-01-07T18:30:00.000Z",
   *   "minutes": 45,
   *   "amountDue": 900,
   *   "currency": "EUR",
   *   "pricePerMinute": 20
   * }
   */
  @Post('exit/quote')
  async quote(@Body() dto: QuoteRequest, @Tenant() tenant: TenantContext) {
    this.logger.log(
      `[QUOTE] bookingCode=${dto.bookingCode}, plate=${dto.plate}`,
    );
    return this.parkingService.quote(dto, tenant);
  }

  /**
   * POST /parking/exit/pay
   * 
   * Procesar pago, cerrar sesión y abrir barrera de salida
   * 
   * Body:
   * {
   *   "sessionId": "uuid",
   *   "paymentMethod": "terminal" (opcional),
   *   "gateId": "salida-principal" (opcional)
   * }
   * 
   * Respuesta:
   * {
   *   "sessionId": "uuid",
   *   "status": "CLOSED",
   *   "entryAt": "2025-01-07T18:30:00.000Z",
   *   "exitAt": "2025-01-07T19:15:00.000Z",
   *   "amountPaid": 900,
   *   "message": "Pago procesado, salida autorizada"
   * }
   */
  @Post('exit/pay')
  async pay(@Body() dto: PayRequest, @Tenant() tenant: TenantContext) {
    this.logger.log(`[PAY] sessionId=${dto.sessionId}`);
    return this.parkingService.pay(dto, tenant);
  }

  /**
   * GET /parking/sessions
   * 
   * Listar sesiones de parking (admin)
   * 
   * Query params:
   * - status: IN_PROGRESS | PAYMENT_PENDING | PAID | CLOSED
   * 
   * Requiere autenticación JWT
   */
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async listSessions(
    @Query('status') status: string,
    @Tenant() tenant: TenantContext,
  ): Promise<any[]> {
    return this.parkingService.listSessions(tenant, status);
  }

  /**
   * POST /parking/admin/open-gate
   * 
   * Abrir barrera manualmente (override de emergencia)
   * 
   * Body:
   * {
   *   "gateId": "entrada-principal",
   *   "reason": "Emergencia / Fallo técnico / etc."
   * }
   * 
   * Requiere autenticación JWT
   */
  @Post('admin/open-gate')
  @UseGuards(JwtAuthGuard)
  async manualOpenGate(
    @Body('gateId') gateId: string,
    @Body('reason') reason: string,
    @Tenant() tenant: TenantContext,
  ) {
    this.logger.warn(
      `[ADMIN] Manual gate open: gateId=${gateId}, reason=${reason}`,
    );
    return this.parkingService.manualOpenGate(gateId, reason, tenant);
  }
}
