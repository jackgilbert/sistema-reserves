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

// Price Variant types (inline to avoid ESM resolution issues)
export interface PriceVariant {
  name: string;
  label: string;
  price: number;
  description?: string;
  minAge?: number;
  maxAge?: number;
  sortOrder?: number;
}

export interface VariantSelection {
  variantKey: string;
  quantity: number;
}

export interface PriceBreakdown {
  basePrice: number;
  currency: string;
  variants: Array<{
    key: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  total: number;
}

// i18n types (inline to avoid ESM resolution issues)
export const SupportedLanguages = {
  ES: 'es',
  EN: 'en',
  CA: 'ca',
  FR: 'fr',
  DE: 'de',
} as const;

export type SupportedLanguage = typeof SupportedLanguages[keyof typeof SupportedLanguages];

export interface TranslatedText {
  es?: string;
  en?: string;
  ca?: string;
  fr?: string;
  de?: string;
}

export interface OfferingTranslations {
  [lang: string]: {
    name: string;
    description?: string;
  };
}

export interface SiteTranslations {
  [lang: string]: {
    siteTitle?: string;
    siteDescription?: string;
    [key: string]: string | undefined;
  };
}
