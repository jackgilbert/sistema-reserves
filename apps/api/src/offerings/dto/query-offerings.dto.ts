import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { OfferingType } from '@sistema-reservas/shared';

export class QueryOfferingsDto {
  @ApiPropertyOptional({ 
    description: 'Filtrar por tipo de oferta',
    enum: OfferingType
  })
  @IsOptional()
  @IsEnum(OfferingType)
  type?: OfferingType;

  @ApiPropertyOptional({ description: 'Filtrar solo activas', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}
