// Enums y tipos compartidos - usando const objects para compatibilidad con Node v24

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

// export * from './validators.js'; // TODO: Crear archivo de validators
