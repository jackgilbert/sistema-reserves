// Enums y tipos compartidos (como const objects para compatibilidad con Node.js v24)

export const OfferingType = {
  CAPACITY: 'CAPACITY',
  RESOURCE: 'RESOURCE',
  APPOINTMENT: 'APPOINTMENT',
  SEATS: 'SEATS'
} as const;

export type OfferingType = typeof OfferingType[keyof typeof OfferingType];

export const BookingStatus = {
  HOLD: 'HOLD',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  USED: 'USED'
} as const;

export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus];

export const PaymentStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
} as const;

export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

export const DayOfWeek = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6
} as const;

export type DayOfWeek = typeof DayOfWeek[keyof typeof DayOfWeek];

// Price Variant types
export interface PriceVariant {
  name: string; // e.g., "adult", "senior", "child", "student"
  label: string; // e.g., "Adult", "Senior (65+)", "Child (3-12)"
  price: number; // price in cents
  description?: string;
  minAge?: number; // optional age restrictions
  maxAge?: number;
  sortOrder?: number; // for display ordering
}

// Availability Override types
export const AvailabilityOverrideType = {
  BLACKOUT: 'BLACKOUT',
  CAPACITY_OVERRIDE: 'CAPACITY_OVERRIDE',
  PRICE_OVERRIDE: 'PRICE_OVERRIDE',
  CUSTOM: 'CUSTOM'
} as const;

export type AvailabilityOverrideType = typeof AvailabilityOverrideType[keyof typeof AvailabilityOverrideType];

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

export type FeatureFlags = {
  [key: string]: boolean;
};

// Export price variant utilities
export * from './price-variants';

// Export i18n utilities
export * from './i18n';
