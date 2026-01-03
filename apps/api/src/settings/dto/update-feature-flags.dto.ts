import { IsBoolean, IsNumber, IsOptional, IsString, IsArray, IsEnum, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class BookingFeaturesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowPublicCancellation?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requirePaymentOnBooking?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  maxAdvanceBookingDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(72)
  minAdvanceBookingHours?: number;
}

class CheckInFeaturesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requireQRCode?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowManualCheckIn?: boolean;
}

class PaymentFeaturesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false, enum: ['stripe', 'none'] })
  @IsOptional()
  @IsEnum(['stripe', 'none'])
  provider?: 'stripe' | 'none';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requireDeposit?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  depositPercentage?: number;
}

class AvailabilityFeaturesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showRealTimeCapacity?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bufferSlots?: number;
}

class NotificationFeaturesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;
}

class AnalyticsFeaturesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  trackingEnabled?: boolean;
}

class MultiLanguageFeaturesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedLocales?: string[];
}

export class UpdateFeatureFlagsDto {
  @ApiProperty({ required: false, type: BookingFeaturesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BookingFeaturesDto)
  bookings?: BookingFeaturesDto;

  @ApiProperty({ required: false, type: CheckInFeaturesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckInFeaturesDto)
  checkIn?: CheckInFeaturesDto;

  @ApiProperty({ required: false, type: PaymentFeaturesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentFeaturesDto)
  payments?: PaymentFeaturesDto;

  @ApiProperty({ required: false, type: AvailabilityFeaturesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AvailabilityFeaturesDto)
  availability?: AvailabilityFeaturesDto;

  @ApiProperty({ required: false, type: NotificationFeaturesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationFeaturesDto)
  notifications?: NotificationFeaturesDto;

  @ApiProperty({ required: false, type: AnalyticsFeaturesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AnalyticsFeaturesDto)
  analytics?: AnalyticsFeaturesDto;

  @ApiProperty({ required: false, type: MultiLanguageFeaturesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MultiLanguageFeaturesDto)
  multiLanguage?: MultiLanguageFeaturesDto;
}
