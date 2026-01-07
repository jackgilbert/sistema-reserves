import { IsObject, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyTemplateDto {
  @ApiProperty({
    description: 'Tipo de plantilla a aplicar',
    enum: ['museum', 'restaurant', 'event', 'service'],
  })
  @IsEnum(['museum', 'restaurant', 'event', 'service'])
  template: 'museum' | 'restaurant' | 'event' | 'service';

  @ApiProperty({
    description: 'Sobrescribir configuración existente',
    required: false,
    default: false,
  })
  @IsOptional()
  overwrite?: boolean;
}

export class ExportSettingsDto {
  @ApiProperty({
    description: 'Incluir feature flags',
    required: false,
    default: true,
  })
  @IsOptional()
  includeFeatureFlags?: boolean;

  @ApiProperty({
    description: 'Incluir settings',
    required: false,
    default: true,
  })
  @IsOptional()
  includeSettings?: boolean;

  @ApiProperty({
    description: 'Formato de exportación',
    enum: ['json', 'yaml'],
    required: false,
    default: 'json',
  })
  @IsOptional()
  @IsEnum(['json', 'yaml'])
  format?: 'json' | 'yaml';
}

export class ImportSettingsDto {
  @ApiProperty({ description: 'Feature flags a importar' })
  @IsOptional()
  @IsObject()
  featureFlags?: Record<string, any>;

  @ApiProperty({ description: 'Settings a importar' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiProperty({
    description: 'Validar antes de importar',
    required: false,
    default: true,
  })
  @IsOptional()
  validate?: boolean;
}

export class ValidateSettingsDto {
  @ApiProperty({ description: 'Feature flags a validar' })
  @IsOptional()
  @IsObject()
  featureFlags?: Record<string, any>;

  @ApiProperty({ description: 'Settings a validar' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
