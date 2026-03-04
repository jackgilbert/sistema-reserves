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
  AvailabilityCalendarService,
  CreateAvailabilityOverrideDto,
  UpdateAvailabilityOverrideDto,
} from './availability-calendar.service';
import { Tenant } from '../tenant/tenant.decorator';
import { TenantContext } from '@sistema-reservas/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Availability Calendar')
@Controller('availability-calendar')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AvailabilityCalendarController {
  constructor(private readonly calendarService: AvailabilityCalendarService) {}

  @Post()
  @ApiOperation({
    summary: 'Create an availability override (blackout, capacity, pricing)',
  })
  @ApiResponse({ status: 201, description: 'Override created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async create(
    @Body() dto: CreateAvailabilityOverrideDto,
    @Tenant() tenant: TenantContext,
  ): Promise<unknown> {
    return this.calendarService.create(dto, tenant);
  }

  @Get('offering/:offeringId')
  @ApiOperation({ summary: 'List all overrides for an offering' })
  @ApiResponse({ status: 200, description: 'List of overrides' })
  async findAll(
    @Param('offeringId') offeringId: string,
    @Tenant() tenant: TenantContext,
  ): Promise<unknown[]> {
    return this.calendarService.findAll(offeringId, tenant);
  }

  @Get('offering/:offeringId/range')
  @ApiOperation({ summary: 'List overrides for a date range' })
  @ApiResponse({ status: 200, description: 'List of overrides in range' })
  async findByDateRange(
    @Param('offeringId') offeringId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Tenant() tenant: TenantContext,
  ): Promise<unknown[]> {
    return this.calendarService.findByDateRange(
      offeringId,
      startDate,
      endDate,
      tenant,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific override by ID' })
  @ApiResponse({ status: 200, description: 'Override found' })
  @ApiResponse({ status: 404, description: 'Override not found' })
  async findOne(
    @Param('id') id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<unknown> {
    return this.calendarService.findOne(id, tenant);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an availability override' })
  @ApiResponse({ status: 200, description: 'Override updated' })
  @ApiResponse({ status: 404, description: 'Override not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityOverrideDto,
    @Tenant() tenant: TenantContext,
  ): Promise<unknown> {
    return this.calendarService.update(id, dto, tenant);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an availability override' })
  @ApiResponse({ status: 200, description: 'Override deleted' })
  async remove(@Param('id') id: string, @Tenant() tenant: TenantContext) {
    await this.calendarService.remove(id, tenant);
    return { message: 'Override deleted successfully' };
  }
}
