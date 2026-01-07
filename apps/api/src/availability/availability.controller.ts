import { Controller, Get, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { AvailabilityService, TimeSlot } from './availability.service';
import { QueryAvailabilityDto } from './dto/query-availability.dto';
import { TenantService } from '../tenant/tenant.service';

@ApiTags('Availability')
@Controller('availability')
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly tenantService: TenantService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener disponibilidad de una oferta' })
  @ApiHeader({
    name: 'x-tenant-domain',
    required: true,
    description: 'Dominio del tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidad calculada',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', example: '2025-01-15' },
          slots: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                start: { type: 'string', example: '2025-01-15T10:00:00.000Z' },
                end: { type: 'string', example: '2025-01-15T10:30:00.000Z' },
                available: { type: 'number', example: 50 },
                price: { type: 'number', example: 1200 },
                resourceId: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada' })
  async getAvailability(
    @Query() query: QueryAvailabilityDto,
    @Headers('x-tenant-domain') domain: string,
  ): Promise<Record<string, TimeSlot[]>> {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.availabilityService.getAvailability(
      query.offeringId,
      query.startDate,
      query.endDate,
      tenant,
    );
  }
}
