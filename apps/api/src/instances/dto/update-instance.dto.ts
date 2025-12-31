import { PartialType } from '@nestjs/swagger';
import { CreateInstanceDto } from './create-instance.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInstanceDto extends PartialType(CreateInstanceDto) {
  @ApiPropertyOptional({ description: 'Estado activo/inactivo' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
