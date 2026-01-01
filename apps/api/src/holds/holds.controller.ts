import { Controller, Post, Get, Body, Param, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { HoldsService } from './holds.service';
import { TenantService } from '../tenant/tenant.service';

class CreateHoldDto {
  offeringId: string;
  slotStart: Date;
  slotEnd: Date;
  quantity: number;
  email?: string;
  name?: string;
  phone?: string;
}

@ApiTags('Holds')
@Controller('holds')
export class HoldsController {
  constructor(
    private readonly holdsService: HoldsService,
    private readonly tenantService: TenantService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear un hold temporal' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 201, description: 'Hold creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'No hay disponibilidad' })
  async createHold(
    @Body() dto: CreateHoldDto,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(domain || 'localhost');
    return this.holdsService.createHold(
      dto.offeringId,
      new Date(dto.slotStart),
      new Date(dto.slotEnd),
      dto.quantity,
      { email: dto.email, name: dto.name, phone: dto.phone },
      tenant,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un hold por ID' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Hold encontrado' })
  @ApiResponse({ status: 404, description: 'Hold no encontrado' })
  async getHold(
    @Param('id') id: string,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(domain || 'localhost');
    return this.holdsService.getHold(id, tenant);
  }
}
