// Enums y tipos compartidos

export enum OfferingType {
  CAPACITY = 'CAPACITY',
  RESOURCE = 'RESOURCE',
  APPOINTMENT = 'APPOINTMENT',
  SEATS = 'SEATS'
}

export enum BookingStatus {
  HOLD = 'HOLD',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  USED = 'USED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export enum DayOfWeek {
  MONDAY = 0,
  TUESDAY = 1,
  WEDNESDAY = 2,
  THURSDAY = 3,
  FRIDAY = 4,
  SATURDAY = 5,
  SUNDAY = 6
}

export interface TenantContext {
  tenantId: string;
  instanceSlug: string;
  domain: string;
}

export interface BrandingConfig {
  name: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface FeatureFlags {
  [key: string]: boolean;
}

export * from './validators';
