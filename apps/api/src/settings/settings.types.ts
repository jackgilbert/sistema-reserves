/**
 * Feature Flags - Sistema de control de características por tenant
 */
export interface FeatureFlags {
  // Módulos principales
  bookings: {
    enabled: boolean;
    allowPublicCancellation: boolean;
    requirePaymentOnBooking: boolean;
    maxAdvanceBookingDays: number;
    minAdvanceBookingHours: number;
  };
  checkIn: {
    enabled: boolean;
    requireQRCode: boolean;
    allowManualCheckIn: boolean;
  };
  payments: {
    enabled: boolean;
    provider: 'stripe' | 'none';
    requireDeposit: boolean;
    depositPercentage: number;
  };
  availability: {
    showRealTimeCapacity: boolean;
    bufferSlots: number; // slots de seguridad no vendibles
  };
  notifications: {
    enabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
  };
  analytics: {
    enabled: boolean;
    trackingEnabled: boolean;
  };
  multiLanguage: {
    enabled: boolean;
    supportedLocales: string[];
  };
}

/**
 * Settings del tenant - Configuraciones personalizables
 */
export interface TenantSettings {
  // Información general
  general: {
    businessName: string;
    businessType: 'museum' | 'event' | 'restaurant' | 'service' | 'other';
    contactEmail: string;
    contactPhone?: string;
    address?: string;
    description?: string;
  };

  // Configuración regional
  regional: {
    timezone: string;
    locale: string;
    currency: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };

  // Branding
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    customCSS?: string;
  };

  // Políticas de negocio
  policies: {
    cancellationPolicy: string;
    refundPolicy: string;
    termsAndConditions?: string;
    privacyPolicy?: string;
    minBookingNoticeHours: number;
    maxBookingAdvanceDays: number;
  };

  // Configuración de reservas
  booking: {
    requireCustomerPhone: boolean;
    requireCustomerAddress: boolean;
    maxPartySize: number;
    defaultSlotDuration: number; // minutos
    bookingCodePrefix: string;
  };

  // Notificaciones
  notifications: {
    sendBookingConfirmation: boolean;
    sendBookingReminder: boolean;
    reminderHoursBefore: number;
    sendCancellationNotification: boolean;
    fromEmail?: string;
    fromName?: string;
  };

  // Integrations
  integrations: {
    stripeEnabled: boolean;
    stripePublicKey?: string;
    googleAnalyticsId?: string;
    customWebhookUrl?: string;
  };

  // Tax & Invoicing
  tax: {
    businessLegalName: string;
    taxId?: string; // VAT/NIF/CIF
    taxIdType?: 'VAT' | 'NIF' | 'CIF' | 'EIN' | 'OTHER';
    taxRate: number; // Default tax rate percentage
    includeTaxInPrice: boolean;
    invoicePrefix: string; // e.g., "INV"
    invoiceNumberStart: number;
    invoiceFooter?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankName?: string;
    swiftBic?: string;
    iban?: string;
  };

  // SEO y Marketing
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
  };
}

/**
 * Configuración por defecto de feature flags
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  bookings: {
    enabled: true,
    allowPublicCancellation: true,
    requirePaymentOnBooking: false,
    maxAdvanceBookingDays: 90,
    minAdvanceBookingHours: 2,
  },
  checkIn: {
    enabled: true,
    requireQRCode: false,
    allowManualCheckIn: true,
  },
  payments: {
    enabled: false,
    provider: 'none',
    requireDeposit: false,
    depositPercentage: 0,
  },
  availability: {
    showRealTimeCapacity: true,
    bufferSlots: 0,
  },
  notifications: {
    enabled: true,
    emailEnabled: true,
    smsEnabled: false,
  },
  analytics: {
    enabled: false,
    trackingEnabled: false,
  },
  multiLanguage: {
    enabled: false,
    supportedLocales: ['es-ES'],
  },
};

/**
 * Configuración por defecto de settings
 */
export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  general: {
    businessName: 'Mi Negocio',
    businessType: 'other',
    contactEmail: 'info@example.com',
  },
  regional: {
    timezone: 'Europe/Madrid',
    locale: 'es-ES',
    currency: 'EUR',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
  },
  branding: {
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
  },
  policies: {
    cancellationPolicy: 'Cancelación gratuita hasta 24 horas antes.',
    refundPolicy: 'Reembolso completo para cancelaciones elegibles.',
    minBookingNoticeHours: 2,
    maxBookingAdvanceDays: 90,
  },
  booking: {
    requireCustomerPhone: false,
    requireCustomerAddress: false,
    maxPartySize: 10,
    defaultSlotDuration: 60,
    bookingCodePrefix: 'BK',
  },
  notifications: {
    sendBookingConfirmation: true,
    sendBookingReminder: false,
    reminderHoursBefore: 24,
    sendCancellationNotification: true,
  },
  integrations: {
    stripeEnabled: false,
  },
  tax: {
    businessLegalName: 'Mi Negocio S.L.',
    taxRate: 21,
    includeTaxInPrice: true,
    invoicePrefix: 'INV',
    invoiceNumberStart: 1,
  },
  seo: {},
};
