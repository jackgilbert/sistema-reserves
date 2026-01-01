import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OfferingsService, CreateOfferingDto, UpdateOfferingDto } from './offerings.service';
import { Tenant } from '../tenant/tenant.decorator';
import { TenantContext } from '@sistema-reservas/shared';

@ApiTags('Offerings')
@Controller('offerings')
export class OfferingsController {
  constructor(
    private readonly offeringsService: OfferingsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva oferta' })
  @ApiResponse({ status: 201, description: 'Oferta creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(
    @Body() dto: CreateOfferingDto,
    @Tenant() tenant: TenantContext,
  ) {
    return this.offeringsService.create(dto, tenant);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las ofertas' })
  @ApiResponse({ status: 200, description: 'Lista de ofertas' })
  async findAll(
    @Query('activeOnly') activeOnly: string,
    @Tenant() tenant: TenantContext,
  ) {
    const active = activeOnly !== 'false';
    return this.offeringsService.findAll(tenant, active);
  }

  @Get('public/:id')
  @ApiOperation({ summary: 'Obtener una oferta pública por ID' })
  @ApiResponse({ status: 200, description: 'Oferta encontrada' })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada' })
  async findOnePublic(
    @Param('id') id: string,
    @Tenant() tenant: TenantContext,
  ) {
    return this.offeringsService.findOne(id, tenant);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una oferta por ID' })
  @ApiResponse({ status: 200, description: 'Oferta encontrada' })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada' })
  async findOne(
    @Param('id') id: string,
    @Tenant() tenant: TenantContext,
  ) {
    return this.offeringsService.findOne(id, tenant);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una oferta' })
  @ApiResponse({ status: 200, description: 'Oferta actualizada' })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOfferingDto,
    @Tenant() tenant: TenantContext,
  ) {
    return this.offeringsService.toggleActive(id, dto.active ?? true, tenant);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una oferta' })
  @ApiResponse({ status: 200, description: 'Oferta desactivada' })
  async remove(
    @Param('id') id: string,
    @Tenant() tenant: TenantContext,
  ) {
    await this.offeringsService.toggleActive(id, false, tenant);
    return { message: 'Oferta desactivada exitosamente' };
  }

  @Post(':id/variants')
  @ApiOperation({ summary: 'Añadir variante a una oferta' })
  @ApiResponse({ status: 201, description: 'Variante creada' })
  async createVariant() {
    // Variants are stored in JSON field, not implemented yet
    return { message: 'Variants not implemented yet' };
  }

  @Post(':id/resources')
  @ApiOperation({ summary: 'Añadir recurso a una oferta tipo RESOURCE' })
  @ApiResponse({ status: 201, description: 'Recurso creado' })
  @ApiResponse({ status: 400, description: 'La oferta no es tipo RESOURCE' })
  async createResource(
    @Param('id') id: string,
    @Body() dto: { name: string; description?: string },
    @Tenant() tenant: TenantContext,
  ) {
    return this.offeringsService.createResources(
      { offeringId: id, resources: [{ code: dto.name, name: dto.name }] },
      tenant,
    );
  }
}
