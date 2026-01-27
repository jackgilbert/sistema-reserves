import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaClient } from '@sistema-reservas/db';
import { Tenant } from '../tenant/tenant.decorator';
import { TenantContext } from '@sistema-reservas/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface CreateScheduleDto {
  offeringId: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  validFrom: string;
  validTo?: string;
  minAdvanceMinutes?: number;
  maxAdvanceDays?: number;
  cutoffMinutes?: number;
}

@ApiTags('Offerings Schedules')
@Controller('offerings/:offeringId/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class SchedulesController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get()
  @ApiOperation({ summary: 'List all schedules for an offering' })
  @ApiResponse({ status: 200, description: 'List of schedules' })
  async findAll(
    @Param('offeringId') offeringId: string,
    @Tenant() tenant: TenantContext,
  ) {
    const schedules = await this.prisma.schedule.findMany({
      where: {
        tenantId: tenant.tenantId,
        offeringId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return schedules;
  }

  @Post()
  @ApiOperation({ summary: 'Create a recurring schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async create(
    @Param('offeringId') offeringId: string,
    @Body() dto: CreateScheduleDto,
    @Tenant() tenant: TenantContext,
  ) {
    // Verify offering exists
    const offering = await this.prisma.offering.findFirst({
      where: {
        tenantId: tenant.tenantId,
        id: offeringId,
        active: true,
      },
    });

    if (!offering) {
      throw new Error('Offering not found');
    }

    const schedule = await this.prisma.schedule.create({
      data: {
        tenantId: tenant.tenantId,
        offeringId,
        daysOfWeek: dto.daysOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        slotDuration: dto.slotDuration,
        validFrom: new Date(dto.validFrom),
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        minAdvanceMinutes: dto.minAdvanceMinutes ?? 0,
        maxAdvanceDays: dto.maxAdvanceDays ?? 90,
        cutoffMinutes: dto.cutoffMinutes ?? 0,
        closedDates: [],
        capacityOverrides: {},
      },
    });

    return schedule;
  }

  @Delete(':scheduleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a schedule' })
  @ApiResponse({ status: 204, description: 'Schedule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async delete(
    @Param('offeringId') offeringId: string,
    @Param('scheduleId') scheduleId: string,
    @Tenant() tenant: TenantContext,
  ) {
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        tenantId: tenant.tenantId,
        offeringId,
      },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    await this.prisma.schedule.delete({
      where: { id: scheduleId },
    });

    return;
  }
}
