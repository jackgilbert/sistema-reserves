import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';
import { GateService } from './gate.service';

/**
 * Normaliza matrícula: uppercase, sin espacios ni guiones
 */
function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Compara matrículas con tolerancia de 1 carácter (distancia Hamming <= 1)
 */
function plateMatches(expected: string, provided: string): boolean {
  const exp = normalizePlate(expected);
  const prov = normalizePlate(provided);

  if (exp.length === 0 || prov.length === 0) return false;
  if (exp.length !== prov.length) return false;

  let diff = 0;
  for (let i = 0; i < exp.length; i++) {
    if (exp[i] !== prov[i]) diff++;
    if (diff > 1) return false;
  }
  return true;
}

export interface EntryRequest {
  bookingCode: string;
  plate: string;
  gateId?: string;
}

export interface QuoteRequest {
  bookingCode: string;
  plate: string;
  gateId?: string;
}

export interface PayRequest {
  sessionId: string;
  paymentMethod?: string;
  gateId?: string;
}

@Injectable()
export class ParkingService {
  private readonly logger = new Logger(ParkingService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly gateService: GateService,
  ) {}

  /**
   * POST /parking/entry
   * Valida rango, matrícula, crea sesión y abre barrera de entrada
   */
  async entry(dto: EntryRequest, tenant: TenantContext) {
    const { bookingCode, plate, gateId } = dto;
    const now = new Date();

    this.logger.log(`[ENTRY] tenantId=${tenant.tenantId}, code=${bookingCode}, plate=${plate}`);

    // 1) Buscar booking
    const booking = await this.prisma.booking.findFirst({
      where: {
        tenantId: tenant.tenantId,
        code: bookingCode,
      },
      include: {
        offering: true,
        parkingSession: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // 2) Validar rango: slotStart <= now <= slotEnd
    if (now < booking.slotStart || now > booking.slotEnd) {
      throw new BadRequestException(
        `Fuera de rango. Entrada permitida entre ${booking.slotStart.toISOString()} y ${booking.slotEnd.toISOString()}`,
      );
    }

    // 3) Validar matrícula tolerante
    const expectedPlate = (booking.metadata as any)?.plate;
    if (!expectedPlate) {
      throw new BadRequestException('Esta reserva no tiene matrícula asociada');
    }

    if (!plateMatches(expectedPlate, plate)) {
      throw new BadRequestException(
        'La matrícula no coincide con la reserva (tolerancia: 1 carácter)',
      );
    }

    // 4) Verificar que no existe sesión activa
    if (booking.parkingSession) {
      if (booking.parkingSession.status === 'CLOSED') {
        throw new ConflictException('Esta reserva ya fue utilizada');
      }
      throw new ConflictException('Esta reserva ya tiene una sesión activa');
    }

    // 5) Obtener precio por minuto de la oferta
    const parkingMeta = (booking.offering.metadata as any)?.parking;
    if (!parkingMeta || typeof parkingMeta.pricePerMinuteCents !== 'number') {
      throw new BadRequestException(
        'La oferta no tiene configuración de parking',
      );
    }

    const pricePerMinute = parkingMeta.pricePerMinuteCents;
    const gateIdEntry = parkingMeta.gateIdEntry || gateId || 'default';

    // 6) Crear sesión
    const session = await this.prisma.parkingSession.create({
      data: {
        tenantId: tenant.tenantId,
        bookingId: booking.id,
        plate: normalizePlate(plate),
        entryAt: now,
        status: 'IN_PROGRESS',
        pricePerMinute,
        amountDue: 0,
        metadata: {
          gateIdEntry,
          matchedBy: normalizePlate(expectedPlate) === normalizePlate(plate) ? 'exact' : 'tolerant',
        },
      },
    });

    // 7) Abrir barrera entrada
    try {
      await this.gateService.openGate(gateIdEntry);
    } catch (error) {
      this.logger.error(`Error abriendo barrera ${gateIdEntry}:`, error);
      // Registro evento de fallo sin dejar una sesión “atascada”
      await this.prisma.gateEvent.create({
        data: {
          tenantId: tenant.tenantId,
          parkingSessionId: null,
          type: 'ENTRY_ATTEMPT',
          source: 'QR',
          metadata: {
            error: (error as any)?.message || String(error),
            gateId: gateIdEntry,
            bookingCode,
            plate,
            parkingSessionId: session.id,
          },
        },
      });

      // Limpiar la sesión creada (no se abrió la barrera)
      try {
        await this.prisma.parkingSession.delete({ where: { id: session.id } });
      } catch {
        // No bloquear la respuesta si ya fue borrada/alterada
      }
      throw new BadRequestException('Error al abrir barrera de entrada');
    }

    // 8) Registro evento exitoso
    await this.prisma.gateEvent.create({
      data: {
        tenantId: tenant.tenantId,
        parkingSessionId: session.id,
        type: 'ENTRY_OPENED',
        source: 'QR',
        metadata: {
          gateId: gateIdEntry,
          plate,
        },
      },
    });

    return {
      sessionId: session.id,
      entryAt: session.entryAt.toISOString(),
      status: session.status,
      message: 'Acceso concedido',
    };
  }

  /**
   * POST /parking/exit/quote
   * Calcula minutos y precio
   */
  async quote(dto: QuoteRequest, tenant: TenantContext) {
    const { bookingCode, plate, gateId } = dto;
    const now = new Date();

    // 1) Buscar booking y sesión
    const booking = await this.prisma.booking.findFirst({
      where: {
        tenantId: tenant.tenantId,
        code: bookingCode,
      },
      include: {
        parkingSession: true,
      },
    });

    if (!booking || !booking.parkingSession) {
      throw new NotFoundException('Sesión de parking no encontrada');
    }

    const session = booking.parkingSession;

    if (session.status === 'CLOSED') {
      throw new BadRequestException('Esta sesión ya fue cerrada');
    }

    // 2) Validar matrícula tolerante
    if (!plateMatches(session.plate, plate)) {
      throw new BadRequestException(
        'La matrícula no coincide con la sesión (tolerancia: 1 carácter)',
      );
    }

    // 3) Calcular minutos con ceil
    const diffMs = now.getTime() - session.entryAt.getTime();
    const minutes = Math.ceil(diffMs / 60_000);

    // 4) Calcular importe
    const amountDue = minutes * session.pricePerMinute;

    // 5) Actualizar sesión
    await this.prisma.parkingSession.update({
      where: { id: session.id },
      data: {
        amountDue,
        status: 'PAYMENT_PENDING',
      },
    });

    // 6) Registrar evento
    await this.prisma.gateEvent.create({
      data: {
        tenantId: tenant.tenantId,
        parkingSessionId: session.id,
        type: 'QUOTE_CREATED',
        source: 'QR',
        metadata: {
          minutes,
          amountDue,
          gateId: gateId || 'default',
        },
      },
    });

    return {
      sessionId: session.id,
      entryAt: session.entryAt.toISOString(),
      minutes,
      amountDue,
      currency: 'EUR',
      pricePerMinute: session.pricePerMinute,
    };
  }

  /**
   * POST /parking/exit/pay
   * Procesa pago y abre barrera de salida
   */
  async pay(dto: PayRequest, tenant: TenantContext) {
    const { sessionId, paymentMethod, gateId } = dto;
    const now = new Date();

    // 1) Buscar sesión
    const session = await this.prisma.parkingSession.findFirst({
      where: {
        tenantId: tenant.tenantId,
        id: sessionId,
      },
      include: {
        booking: {
          include: {
            offering: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    if (session.status === 'CLOSED') {
      throw new BadRequestException('Sesión ya cerrada');
    }

    // Permitir reintentos: si ya está PAID, reintentar abrir barrera y cerrar.
    // Si está IN_PROGRESS, exigir quote primero.
    if (session.status !== 'PAYMENT_PENDING' && session.status !== 'PAID') {
      throw new BadRequestException('Debe calcular el importe primero (POST /parking/exit/quote)');
    }

    let paymentId: string | undefined;

    if (session.status === 'PAYMENT_PENDING') {
      // 2) Crear pago (simplificado, sin integración real por ahora)
      const payment = await this.prisma.payment.create({
        data: {
          bookingId: session.bookingId,
          amount: session.amountDue,
          currency: 'EUR',
          status: 'COMPLETED', // En producción esto vendría del webhook
          provider: paymentMethod || 'parking-terminal',
          metadata: {
            sessionId: session.id,
            minutes: Math.ceil((now.getTime() - session.entryAt.getTime()) / 60_000),
          },
        },
      });
      paymentId = payment.id;

      // 3) Marcar sesión como PAID
      await this.prisma.parkingSession.update({
        where: { id: session.id },
        data: {
          status: 'PAID',
          paidAt: now,
        },
      });

      // 4) Registrar evento pago
      await this.prisma.gateEvent.create({
        data: {
          tenantId: tenant.tenantId,
          parkingSessionId: session.id,
          type: 'PAYMENT_OK',
          source: paymentMethod || 'MANUAL',
          metadata: {
            paymentId: payment.id,
            amount: session.amountDue,
          },
        },
      });
    }

    // 5) Abrir barrera salida
    const parkingMeta = (session.booking.offering.metadata as any)?.parking;
    const gateIdExit = parkingMeta?.gateIdExit || gateId || 'default';

    try {
      await this.gateService.openGate(gateIdExit);
    } catch (error) {
      this.logger.error(`Error abriendo barrera salida ${gateIdExit}:`, error);
      await this.prisma.gateEvent.create({
        data: {
          tenantId: tenant.tenantId,
          parkingSessionId: session.id,
          type: 'EXIT_ATTEMPT',
          source: paymentMethod || 'MANUAL',
          metadata: {
            gateId: gateIdExit,
            error: (error as any)?.message || String(error),
            paymentId,
          },
        },
      });
      throw new BadRequestException('Error al abrir barrera de salida');
    }

    // 6) Cerrar sesión
    await this.prisma.parkingSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        exitAt: now,
      },
    });

    // 7) Registrar evento salida
    await this.prisma.gateEvent.create({
      data: {
        tenantId: tenant.tenantId,
        parkingSessionId: session.id,
        type: 'EXIT_OPENED',
        source: 'QR',
        metadata: {
          gateId: gateIdExit,
          paymentId,
        },
      },
    });

    return {
      sessionId: session.id,
      status: 'CLOSED',
      entryAt: session.entryAt.toISOString(),
      exitAt: now.toISOString(),
      amountPaid: session.amountDue,
      message: 'Pago procesado, salida autorizada',
    };
  }

  /**
   * GET /parking/sessions (admin)
   */
  async listSessions(tenant: TenantContext, status?: string): Promise<any[]> {
    return this.prisma.parkingSession.findMany({
      where: {
        tenantId: tenant.tenantId,
        ...(status ? { status } : {}),
      },
      include: {
        booking: {
          select: {
            code: true,
            customerName: true,
            customerEmail: true,
          },
        },
      },
      orderBy: {
        entryAt: 'desc',
      },
      take: 100,
    });
  }

  /**
   * POST /parking/admin/open-gate (override manual)
   */
  async manualOpenGate(
    gateId: string,
    reason: string,
    tenant: TenantContext,
  ) {
    this.logger.warn(
      `[MANUAL] Abriendo barrera ${gateId} por motivo: ${reason}`,
    );

    await this.gateService.openGate(gateId);

    // Registro evento manual (sin sesión asociada)
    await this.prisma.gateEvent.create({
      data: {
        tenantId: tenant.tenantId,
        parkingSessionId: null,
        type: 'EXIT_OPENED',
        source: 'MANUAL',
        metadata: {
          gateId,
          reason,
        },
      },
    });

    return {
      message: `Barrera ${gateId} abierta manualmente`,
      reason,
    };
  }
}
