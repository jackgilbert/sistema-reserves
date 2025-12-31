import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { OfferingsService } from './offerings.service';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { QueryOfferingsDto } from './dto/query-offerings.dto';
import { TenantService } from '../tenant/tenant.service';

@ApiTags('Offerings')
@Controller('offerings')
export class OfferingsController {
  constructor(
    private readonly offeringsService: OfferingsService,
    private readonly tenantService: TenantService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva oferta (admin)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true, description: 'Dominio del tenant' })
  @ApiResponse({ status: 201, description: 'Oferta creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(
    @Body() createOfferingDto: CreateOfferingDto,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(domain || 'localhost');
    return this.offeringsService.create(createOfferingDto, tenant);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ofertas (admin)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true, description: 'Dominio del tenant' })
  @ApiResponse({ status: 200, description: 'Lista de ofertas' })
  async findAll(
    @Query() query: QueryOfferingsDto,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(domain || 'localhost');
    return this.offeringsService.findAll(query, tenant);
  }

  @Get('public/:id')
  @ApiOperation({ summary: 'Obtener oferta pública (sin auth)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true, description: 'Dominio del tenant' })
  @ApiResponse({ status: 200, description: 'Detalle de la oferta' })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada' })
  async findOnePublic(
    @Param('id') id: string,
    @Headers('x-tenant-domain') domain: string,
  ) {
    return this.offeringsService.findOnePublic(id, domain || 'localhost');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de oferta (admin)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true, description: 'Dominio del tenant' })
  @ApiResponse({ status: 200, description: 'Detalle de la oferta' })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada' })
  async findOne(
    @Param('id') id: string,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(domain || 'localhost');
    return this.offeringsService.findOne(id, tenant);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar oferta (admin)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true, description: 'Dominio del tenant' })
  @ApiResponse({ status: 200, description: 'Oferta actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateOfferingDto: UpdateOfferingDto,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(domain || 'localhost');
    return this.offeringsService.update(id, updateOfferingDto, tenant);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar oferta (admin)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true, description: 'Dominio del tenant' })
  @ApiResponse({ status: 200, description: 'Oferta desactivada exitosamente' })
  @ApiResponse({ status: 403, description: 'No se puede eliminar por reservas activas' })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada' })
  async remove(
    @Param('id') id: string,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(domain || 'localhost');
    return this.offeringsService.remove(id, tenant);
  }
}
