import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class DomainDto {
  @ApiProperty()
  @IsString()
  domain: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class CreateInstanceDto {
  @ApiProperty({ description: 'Slug único de la instancia' })
  @IsString()
  slug: string;

  @ApiProperty({ description: 'Nombre de la instancia' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'URL del logo' })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional({ description: 'Color primario (hex)' })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Color secundario (hex)' })
  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @ApiPropertyOptional({ description: 'Zona horaria' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Locale' })
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional({ description: 'Moneda' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'ID de cuenta Stripe' })
  @IsString()
  @IsOptional()
  stripeAccount?: string;

  @ApiPropertyOptional({ description: 'Feature flags' })
  @IsObject()
  @IsOptional()
  featureFlags?: Record<string, boolean>;

  @ApiPropertyOptional({ description: 'Dominios asociados', type: [DomainDto] })
  @IsArray()
  @IsOptional()
  domains?: DomainDto[];
}
