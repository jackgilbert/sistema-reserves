import { IsBoolean, IsNumber, IsOptional, IsString, IsEnum, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class GeneralSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({ required: false, enum: ['museum', 'event', 'restaurant', 'service', 'other'] })
  @IsOptional()
  @IsEnum(['museum', 'event', 'restaurant', 'service', 'other'])
  businessType?: 'museum' | 'event' | 'restaurant' | 'service' | 'other';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

class RegionalSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiProperty({ required: false, enum: ['12h', '24h'] })
  @IsOptional()
  @IsEnum(['12h', '24h'])
  timeFormat?: '12h' | '24h';
}

class BrandingSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customCSS?: string;
}

class PoliciesSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  refundPolicy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  privacyPolicy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minBookingNoticeHours?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxBookingAdvanceDays?: number;
}

class BookingSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requireCustomerPhone?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requireCustomerAddress?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxPartySize?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(5)
  defaultSlotDuration?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bookingCodePrefix?: string;
}

class NotificationSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  sendBookingConfirmation?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  sendBookingReminder?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  reminderHoursBefore?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  sendCancellationNotification?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fromEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fromName?: string;
}

class IntegrationsSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  stripeEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  stripePublicKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  googleAnalyticsId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customWebhookUrl?: string;
}

class SeoSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ogImage?: string;
}

export class UpdateSettingsDto {
  @ApiProperty({ required: false, type: GeneralSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeneralSettingsDto)
  general?: GeneralSettingsDto;

  @ApiProperty({ required: false, type: RegionalSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegionalSettingsDto)
  regional?: RegionalSettingsDto;

  @ApiProperty({ required: false, type: BrandingSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingSettingsDto)
  branding?: BrandingSettingsDto;

  @ApiProperty({ required: false, type: PoliciesSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PoliciesSettingsDto)
  policies?: PoliciesSettingsDto;

  @ApiProperty({ required: false, type: BookingSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BookingSettingsDto)
  booking?: BookingSettingsDto;

  @ApiProperty({ required: false, type: NotificationSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notifications?: NotificationSettingsDto;

  @ApiProperty({ required: false, type: IntegrationsSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IntegrationsSettingsDto)
  integrations?: IntegrationsSettingsDto;

  @ApiProperty({ required: false, type: SeoSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoSettingsDto)
  seo?: SeoSettingsDto;
}
