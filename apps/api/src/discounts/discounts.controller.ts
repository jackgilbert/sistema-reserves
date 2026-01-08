import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantService } from '../tenant/tenant.service';
import { DiscountsService } from './discounts.service';

class ValidateDiscountDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  offeringId?: string;
}

class CreateBatchDto {
  @IsInt()
  @Min(1)
  @Max(500)
  count: number;

  @IsInt()
  @Min(0)
  @Max(100)
  percentOff: number;

  @IsOptional()
  @IsString()
  offeringId?: string;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsString()
  batchId?: string;
}

class DeactivateBatchDto {
  @IsString()
  batchId: string;
}

class SetDiscountActiveDto {
  @IsString()
  code: string;

  @IsBoolean()
  active: boolean;
}

@ApiTags('Discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(
    private readonly discountsService: DiscountsService,
    private readonly tenantService: TenantService,
  ) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validar un código de descuento (público)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200 })
  async validate(
    @Body() dto: ValidateDiscountDto,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.discountsService.validate(dto.code, tenant, dto.offeringId);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Crear códigos de descuento en batch (admin)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 201 })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createBatch(
    @Body() dto: CreateBatchDto,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.discountsService.createBatch(tenant, dto);
  }

  @Get('batch')
  @ApiOperation({ summary: 'Listar códigos por batchId (admin)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200 })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async listByBatch(
    @Query('batchId') batchId: string,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );

    const id = (batchId || '').trim();
    if (!id) {
      return { batchId: '', codes: [] };
    }

    const rows = await this.discountsService.listByBatch(tenant, id);
    return { batchId: id, codes: rows };
  }

  @Post('batch/deactivate')
  @ApiOperation({ summary: 'Desactivar todos los códigos de un batch (admin)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200 })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deactivateBatch(
    @Body() dto: DeactivateBatchDto,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    const batchId = (dto.batchId || '').trim();
    if (!batchId) {
      return { batchId: '', updated: 0 };
    }

    const updated = await this.discountsService.deactivateBatch(tenant, batchId);
    return { batchId, updated };
  }

  @Patch('code')
  @ApiOperation({ summary: 'Activar/Desactivar un código (admin)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200 })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async setCodeActive(
    @Body() dto: SetDiscountActiveDto,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );

    const code = (dto.code || '').trim();
    if (!code) {
      return { code: '', updated: 0, active: dto.active };
    }

    const updated = await this.discountsService.setActiveByCode(
      tenant,
      code,
      dto.active,
    );
    return { code: code.toUpperCase(), updated, active: dto.active };
  }
}
