import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { BookingsService, CreateBookingFromHoldDto } from './bookings.service';
import { TenantService } from '../tenant/tenant.service';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly tenantService: TenantService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear booking desde un hold' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 201, description: 'Booking creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o hold expirado' })
  @ApiResponse({ status: 404, description: 'Hold no encontrado' })
  async createBooking(
    @Body() dto: CreateBookingFromHoldDto,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.bookingsService.createBookingFromHold(
      dto.holdId,
      dto.email,
      dto.name,
      dto.phone,
      tenant,
    );
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Obtener booking por código' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Booking encontrado' })
  @ApiResponse({ status: 404, description: 'Booking no encontrado' })
  async getBookingByCode(
    @Param('code') code: string,
    @Headers('x-tenant-domain') domain: string,
  ): Promise<unknown> {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.bookingsService.findByCode(code, tenant);
  }

  @Get('public/:code')
  @ApiOperation({ summary: 'Obtener booking público por código' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Booking encontrado' })
  @ApiResponse({ status: 404, description: 'Booking no encontrado' })
  async getBookingByCodePublic(
    @Param('code') code: string,
    @Headers('x-tenant-domain') domain: string,
  ): Promise<unknown> {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.bookingsService.findByCode(code, tenant);
  }

  @Patch('public/:code/cancel')
  @ApiOperation({ summary: 'Cancelar booking público' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Booking cancelado' })
  @ApiResponse({ status: 400, description: 'No se puede cancelar' })
  async cancelBookingPublic(
    @Param('code') code: string,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    const booking = (await this.bookingsService.findByCode(code, tenant)) as {
      id: string;
    };
    await this.bookingsService.cancel(booking.id, tenant);
    return { message: 'Reserva cancelada exitosamente' };
  }

  @Patch('code/:code/cancel')
  @ApiOperation({ summary: 'Cancelar booking' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Booking cancelado' })
  @ApiResponse({ status: 400, description: 'No se puede cancelar' })
  async cancelBooking(
    @Param('code') code: string,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    const booking = (await this.bookingsService.findByCode(code, tenant)) as {
      id: string;
    };
    await this.bookingsService.cancel(booking.id, tenant);
    return { message: 'Reserva cancelada exitosamente' };
  }

  @Get()
  @ApiOperation({ summary: 'Listar bookings (admin)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Lista de bookings' })
  async listBookings(
    @Headers('x-tenant-domain') domain: string,
  ): Promise<unknown[]> {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.bookingsService.findAll(tenant);
  }
}
