import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAvailabilityDto {
  @ApiProperty({ description: 'ID de la oferta', example: '6438be0f-32e5-419c-9c1b-91157dabb934' })
  @IsString()
  @IsNotEmpty()
  offeringId: string;

  @ApiProperty({ description: 'Fecha de inicio (ISO 8601)', example: '2025-01-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Fecha de fin (ISO 8601)', example: '2025-01-22' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Cantidad de personas', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'ID de recurso específico (para RESOURCE)' })
  @IsOptional()
  @IsString()
  resourceId?: string;
}
