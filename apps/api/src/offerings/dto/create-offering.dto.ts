import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsBoolean, IsObject, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OfferingType } from '@sistema-reservas/shared';

class ScheduleRuleDto {
  @ApiProperty({ description: 'Días de la semana (0=lunes, 6=domingo)', example: [0, 1, 2, 3, 4] })
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek: number[];

  @ApiProperty({ description: 'Hora de inicio (HH:MM)', example: '09:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'Hora de fin (HH:MM)', example: '18:00' })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ description: 'Duración del slot en minutos', example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  slotDuration?: number;

  @ApiPropertyOptional({ description: 'Capacidad por slot', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;
}

export class CreateOfferingDto {
  @ApiProperty({ description: 'Slug único del tenant', example: 'entrada-general' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ description: 'Nombre de la oferta', example: 'Entrada General' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción detallada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Tipo de primitiva',
    enum: OfferingType,
    example: OfferingType.CAPACITY 
  })
  @IsEnum(OfferingType)
  type: OfferingType;

  @ApiProperty({ description: 'Precio base en céntimos', example: 1500 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ description: 'Duración en minutos (para APPOINTMENT)', example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({ description: 'Capacidad total (para CAPACITY)', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Reglas de horario' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleRuleDto)
  schedule?: ScheduleRuleDto;

  @ApiPropertyOptional({ description: 'Activa o no', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Configuración adicional' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
