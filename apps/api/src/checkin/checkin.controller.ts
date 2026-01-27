import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { CheckinService, CheckInDto } from './checkin.service';
import { TenantService } from '../tenant/tenant.service';

@ApiTags('Check-In')
@Controller('checkin')
export class CheckinController {
  constructor(
    private readonly checkinService: CheckinService,
    private readonly tenantService: TenantService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Realizar check-in con código QR' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 201, description: 'Check-in realizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Reserva no válida o ya utilizada' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  async checkIn(
    @Body() dto: CheckInDto,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.checkinService.checkIn(dto.code, dto.scannedBy || null, tenant);
  }

  @Get('verify/:code')
  @ApiOperation({ summary: 'Verificar estado de reserva sin hacer check-in' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Estado de la reserva' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  async verifyBooking(
    @Param('code') code: string,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.checkinService.verifyBooking(code, tenant);
  }

  @Get('history')
  @ApiOperation({ summary: 'Obtener historial de check-ins del día' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Historial de check-ins' })
  async getHistory(
    @Query('date') date: string,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    const limit = 50;
    return this.checkinService.getCheckInHistory(tenant, limit);
  }

  @Get('slots')
  @ApiOperation({ summary: 'Listar slots con reservas por fecha' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Lista de slots con conteo' })
  async getSlots(
    @Query('date') date: string,
    @Query('offeringId') offeringId: string | undefined,
    @Headers('x-tenant-domain') domain: string,
  ) {
    if (!date) {
      throw new BadRequestException('Fecha requerida');
    }
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Fecha inválida');
    }
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.checkinService.getSlotsForDate(tenant, parsed, offeringId);
  }

  @Get('list')
  @ApiOperation({ summary: 'Listar reservas para check-in rápido' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Lista de reservas' })
  async listBookings(
    @Query('date') date: string,
    @Query('slotStart') slotStart: string | undefined,
    @Query('slotEnd') slotEnd: string | undefined,
    @Query('offeringId') offeringId: string | undefined,
    @Headers('x-tenant-domain') domain: string,
  ) {
    if (!date) {
      throw new BadRequestException('Fecha requerida');
    }
    const parsedDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Fecha inválida');
    }

    const parsedSlotStart = slotStart ? new Date(slotStart) : undefined;
    const parsedSlotEnd = slotEnd ? new Date(slotEnd) : undefined;
    if ((slotStart && Number.isNaN(parsedSlotStart?.getTime())) || (slotEnd && Number.isNaN(parsedSlotEnd?.getTime()))) {
      throw new BadRequestException('Slot inválido');
    }

    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );

    return this.checkinService.listBookingsForSlot(
      tenant,
      parsedDate,
      parsedSlotStart,
      parsedSlotEnd,
      offeringId,
    );
  }
}
