import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsISO8601,
  IsEnum,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { AvailabilityOverrideType } from '@sistema-reservas/shared';

export class CreateAvailabilityOverrideDto {
  @IsString()
  offeringId: string;

  @IsISO8601()
  dateFrom: string; // ISO date string

  @IsISO8601()
  dateTo: string; // ISO date string

  @IsEnum(AvailabilityOverrideType)
  type: keyof typeof AvailabilityOverrideType;

  @IsBoolean()
  @IsOptional()
  isClosed?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  capacityOverride?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  priceOverride?: number; // in cents

  @IsInt()
  @Min(0)
  @Max(500)
  @IsOptional()
  priceMultiplier?: number; // percentage (e.g., 120 for 20% increase)

  @IsString()
  @IsOptional()
  reason?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateAvailabilityOverrideDto {
  @IsISO8601()
  @IsOptional()
  dateFrom?: string;

  @IsISO8601()
  @IsOptional()
  dateTo?: string;

  @IsEnum(AvailabilityOverrideType)
  @IsOptional()
  type?: keyof typeof AvailabilityOverrideType;

  @IsBoolean()
  @IsOptional()
  isClosed?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  capacityOverride?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  priceOverride?: number;

  @IsInt()
  @Min(0)
  @Max(500)
  @IsOptional()
  priceMultiplier?: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class AvailabilityOverrideResponseDto {
  id: string;
  tenantId: string;
  offeringId: string;
  dateFrom: string;
  dateTo: string;
  type: string;
  isClosed: boolean;
  capacityOverride?: number;
  priceOverride?: number;
  priceMultiplier?: number;
  reason?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
