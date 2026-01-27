import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PriceVariant } from '@sistema-reservas/shared';

export class PriceVariantDto implements PriceVariant {
  @IsString()
  name: string;

  @IsString()
  label: string;

  @IsInt()
  @Min(0)
  price: number; // in cents

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  minAge?: number;

  @IsInt()
  @IsOptional()
  maxAge?: number;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdatePriceVariantsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceVariantDto)
  variants: PriceVariantDto[];
}

export class VariantSelectionDto {
  @IsString()
  variantKey: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
