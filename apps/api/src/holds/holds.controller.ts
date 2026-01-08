import { Controller, Post, Get, Body, Param, Headers } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiProperty,
} from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsInt,
  Min,
  IsOptional,
  IsEmail,
  IsObject,
} from 'class-validator';
import { HoldsService } from './holds.service';
import { TenantService } from '../tenant/tenant.service';

class CreateHoldDto {
  @ApiProperty({ description: 'ID de la oferta' })
  @IsString()
  offeringId: string;

  @ApiProperty({
    description: 'Inicio del slot (ISO 8601)',
    example: '2024-01-15T10:00:00.000Z',
  })
  @IsDateString()
  slotStart: string;

  @ApiProperty({
    description: 'Fin del slot (ISO 8601)',
    example: '2024-01-15T11:00:00.000Z',
  })
  @IsDateString()
  slotEnd: string;

  @ApiProperty({ description: 'Cantidad a reservar', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Clave de variante del slot (ej: lang:es, lang:en). Vacío = default',
    required: false,
  })
  @IsOptional()
  @IsString()
  slotVariantKey?: string;

  @ApiProperty({ description: 'Email del cliente', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Nombre del cliente', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Teléfono del cliente', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Nombre de variante de precio (ticket)',
    required: false,
  })
  @IsOptional()
  @IsString()
  priceVariantName?: string;

  @ApiProperty({
    description: 'Desglose de entradas por tipo (standard + variants)',
    required: false,
  })
  @IsOptional()
  @IsObject()
  ticketQuantities?: {
    standard?: number;
    variants?: Record<string, number>;
  };
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
    try {
      const tenant = await this.tenantService.resolveTenantByDomain(
        domain || 'localhost',
      );
      return await this.holdsService.createHold(
        dto.offeringId,
        new Date(dto.slotStart),
        new Date(dto.slotEnd),
        dto.quantity,
        dto.slotVariantKey,
        dto.ticketQuantities,
        dto.priceVariantName,
        { email: dto.email, name: dto.name, phone: dto.phone },
        tenant,
      );
    } catch (error) {
      console.error('Error creating hold:', error);
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un hold por ID' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Hold encontrado' })
  @ApiResponse({ status: 404, description: 'Hold no encontrado' })
  async getHold(
    @Param('id') id: string,
    @Headers('x-tenant-domain') domain: string,
  ): Promise<unknown> {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.holdsService.getHold(id, tenant);
  }
}
