import { Controller, Post, Get, Body, Param, Query, Headers } from '@nestjs/common';
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
    const tenant = await this.tenantService.resolveTenantByDomain(domain || 'localhost');
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
    const tenant = await this.tenantService.resolveTenantByDomain(domain || 'localhost');
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
    const tenant = await this.tenantService.resolveTenantByDomain(domain || 'localhost');
    const limit = 50;
    return this.checkinService.getCheckInHistory(tenant, limit);
  }
}
