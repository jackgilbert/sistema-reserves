import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  OfferingsService,
  CreateOfferingDto,
  UpdateOfferingDto,
} from './offerings.service';
import { Tenant } from '../tenant/tenant.decorator';
import { TenantContext } from '@sistema-reservas/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Offerings')
@Controller('offerings')
export class OfferingsController {
  constructor(private readonly offeringsService: OfferingsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva oferta' })
  @ApiResponse({ status: 201, description: 'Oferta creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async create(
    @Body() dto: CreateOfferingDto,
    @Tenant() tenant: TenantContext,
  ): Promise<unknown> {
    return this.offeringsService.create(dto, tenant);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las ofertas' })
  @ApiResponse({ status: 200, description: 'Lista de ofertas' })
  async findAll(
    @Query('activeOnly') activeOnly: string,
    @Tenant() tenant: TenantContext,
  ): Promise<unknown[]> {
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
  ): Promise<unknown> {
    return this.offeringsService.findOne(id, tenant);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una oferta por ID' })
  @ApiResponse({ status: 200, description: 'Oferta encontrada' })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findOne(
    @Param('id') id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<unknown> {
    return this.offeringsService.findOne(id, tenant);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una oferta' })
  @ApiResponse({ status: 200, description: 'Oferta actualizada' })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOfferingDto,
    @Tenant() tenant: TenantContext,
  ): Promise<unknown> {
    return this.offeringsService.update(id, dto, tenant);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una oferta' })
  @ApiResponse({ status: 200, description: 'Oferta desactivada' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async remove(@Param('id') id: string, @Tenant() tenant: TenantContext) {
    await this.offeringsService.toggleActive(id, false, tenant);
    return { message: 'Oferta desactivada exitosamente' };
  }

  @Post(':id/variants')
  @ApiOperation({ summary: 'Añadir variante a una oferta' })
  @ApiResponse({ status: 201, description: 'Variante creada' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createVariant() {
    // Variants are stored in JSON field, not implemented yet
    return { message: 'Variants not implemented yet' };
  }

  @Post(':id/resources')
  @ApiOperation({ summary: 'Añadir recurso a una oferta tipo RESOURCE' })
  @ApiResponse({ status: 201, description: 'Recurso creado' })
  @ApiResponse({ status: 400, description: 'La oferta no es tipo RESOURCE' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createResource(
    @Param('id') id: string,
    @Body() dto: { name: string; description?: string },
    @Tenant() tenant: TenantContext,
  ): Promise<unknown> {
    return this.offeringsService.createResources(
      { offeringId: id, resources: [{ code: dto.name, name: dto.name }] },
      tenant,
    );
  }
}
