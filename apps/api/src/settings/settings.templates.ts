import { FeatureFlags, TenantSettings } from './settings.types';

/**
 * Plantillas pre-configuradas por tipo de negocio
 */
export const SETTINGS_TEMPLATES = {
  museum: {
    name: 'Museo / Galería',
    description: 'Configuración para museos y galerías con check-in por QR',
    featureFlags: {
      bookings: {
        enabled: true,
        allowPublicCancellation: true,
        requirePaymentOnBooking: false,
        maxAdvanceBookingDays: 30,
        minAdvanceBookingHours: 2,
      },
      checkIn: {
        enabled: true,
        requireQRCode: true,
        allowManualCheckIn: true,
      },
      payments: {
        enabled: false,
        provider: 'none' as const,
        requireDeposit: false,
        depositPercentage: 0,
      },
      availability: {
        showRealTimeCapacity: true,
        bufferSlots: 2,
      },
      notifications: {
        enabled: true,
        emailEnabled: true,
        smsEnabled: false,
      },
      analytics: {
        enabled: true,
        trackingEnabled: true,
      },
      multiLanguage: {
        enabled: true,
        supportedLocales: ['es-ES', 'en-GB'],
      },
    } as FeatureFlags,
    settings: {
      general: {
        businessName: 'Mi Museo',
        businessType: 'museum' as const,
        contactEmail: 'info@museo.com',
      },
      regional: {
        timezone: 'Europe/Madrid',
        locale: 'es-ES',
        currency: 'EUR',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: '24h' as const,
      },
      branding: {
        primaryColor: '#1E40AF',
        secondaryColor: '#7C3AED',
      },
      policies: {
        cancellationPolicy: 'Cancelación gratuita hasta 24 horas antes de la visita.',
        refundPolicy: 'Reembolso completo para cancelaciones elegibles.',
        minBookingNoticeHours: 2,
        maxBookingAdvanceDays: 30,
      },
      booking: {
        requireCustomerPhone: false,
        requireCustomerAddress: false,
        maxPartySize: 20,
        defaultSlotDuration: 60,
        bookingCodePrefix: 'MUS',
      },
      notifications: {
        sendBookingConfirmation: true,
        sendBookingReminder: true,
        reminderHoursBefore: 24,
        sendCancellationNotification: true,
      },
      integrations: {
        stripeEnabled: false,
      },
      seo: {},
    } as TenantSettings,
  },

  restaurant: {
    name: 'Restaurante',
    description: 'Configuración para restaurantes con pagos y depósito',
    featureFlags: {
      bookings: {
        enabled: true,
        allowPublicCancellation: false,
        requirePaymentOnBooking: true,
        maxAdvanceBookingDays: 60,
        minAdvanceBookingHours: 24,
      },
      checkIn: {
        enabled: false,
        requireQRCode: false,
        allowManualCheckIn: true,
      },
      payments: {
        enabled: true,
        provider: 'stripe' as const,
        requireDeposit: true,
        depositPercentage: 20,
      },
      availability: {
        showRealTimeCapacity: false,
        bufferSlots: 0,
      },
      notifications: {
        enabled: true,
        emailEnabled: true,
        smsEnabled: true,
      },
      analytics: {
        enabled: true,
        trackingEnabled: true,
      },
      multiLanguage: {
        enabled: false,
        supportedLocales: ['es-ES'],
      },
    } as FeatureFlags,
    settings: {
      general: {
        businessName: 'Mi Restaurante',
        businessType: 'restaurant' as const,
        contactEmail: 'reservas@restaurante.com',
      },
      regional: {
        timezone: 'Europe/Madrid',
        locale: 'es-ES',
        currency: 'EUR',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: '24h' as const,
      },
      branding: {
        primaryColor: '#DC2626',
        secondaryColor: '#F59E0B',
      },
      policies: {
        cancellationPolicy: 'Cancelación hasta 24 horas antes. Después se pierde el depósito.',
        refundPolicy: 'Reembolso del depósito solo para cancelaciones con 24h de anticipación.',
        minBookingNoticeHours: 24,
        maxBookingAdvanceDays: 60,
      },
      booking: {
        requireCustomerPhone: true,
        requireCustomerAddress: false,
        maxPartySize: 12,
        defaultSlotDuration: 120,
        bookingCodePrefix: 'REST',
      },
      notifications: {
        sendBookingConfirmation: true,
        sendBookingReminder: true,
        reminderHoursBefore: 4,
        sendCancellationNotification: true,
      },
      integrations: {
        stripeEnabled: true,
      },
      seo: {},
    } as TenantSettings,
  },

  event: {
    name: 'Eventos / Tours',
    description: 'Configuración para eventos y tours con todas las funciones',
    featureFlags: {
      bookings: {
        enabled: true,
        allowPublicCancellation: true,
        requirePaymentOnBooking: true,
        maxAdvanceBookingDays: 90,
        minAdvanceBookingHours: 48,
      },
      checkIn: {
        enabled: true,
        requireQRCode: true,
        allowManualCheckIn: false,
      },
      payments: {
        enabled: true,
        provider: 'stripe' as const,
        requireDeposit: true,
        depositPercentage: 50,
      },
      availability: {
        showRealTimeCapacity: true,
        bufferSlots: 5,
      },
      notifications: {
        enabled: true,
        emailEnabled: true,
        smsEnabled: true,
      },
      analytics: {
        enabled: true,
        trackingEnabled: true,
      },
      multiLanguage: {
        enabled: true,
        supportedLocales: ['es-ES', 'en-GB', 'fr-FR', 'de-DE'],
      },
    } as FeatureFlags,
    settings: {
      general: {
        businessName: 'Mi Evento',
        businessType: 'event' as const,
        contactEmail: 'info@evento.com',
      },
      regional: {
        timezone: 'Europe/Madrid',
        locale: 'es-ES',
        currency: 'EUR',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: '24h' as const,
      },
      branding: {
        primaryColor: '#8B5CF6',
        secondaryColor: '#EC4899',
      },
      policies: {
        cancellationPolicy: 'Cancelación gratuita hasta 48 horas antes. Después 50% de reembolso.',
        refundPolicy: 'Reembolso del 100% hasta 48h antes, 50% hasta 24h antes, 0% después.',
        minBookingNoticeHours: 48,
        maxBookingAdvanceDays: 90,
      },
      booking: {
        requireCustomerPhone: true,
        requireCustomerAddress: true,
        maxPartySize: 50,
        defaultSlotDuration: 180,
        bookingCodePrefix: 'EVT',
      },
      notifications: {
        sendBookingConfirmation: true,
        sendBookingReminder: true,
        reminderHoursBefore: 48,
        sendCancellationNotification: true,
      },
      integrations: {
        stripeEnabled: true,
      },
      seo: {},
    } as TenantSettings,
  },

  service: {
    name: 'Servicios / Consultas',
    description: 'Configuración para servicios profesionales y consultas',
    featureFlags: {
      bookings: {
        enabled: true,
        allowPublicCancellation: true,
        requirePaymentOnBooking: false,
        maxAdvanceBookingDays: 30,
        minAdvanceBookingHours: 24,
      },
      checkIn: {
        enabled: false,
        requireQRCode: false,
        allowManualCheckIn: true,
      },
      payments: {
        enabled: true,
        provider: 'stripe' as const,
        requireDeposit: false,
        depositPercentage: 0,
      },
      availability: {
        showRealTimeCapacity: false,
        bufferSlots: 0,
      },
      notifications: {
        enabled: true,
        emailEnabled: true,
        smsEnabled: true,
      },
      analytics: {
        enabled: false,
        trackingEnabled: false,
      },
      multiLanguage: {
        enabled: false,
        supportedLocales: ['es-ES'],
      },
    } as FeatureFlags,
    settings: {
      general: {
        businessName: 'Mi Servicio',
        businessType: 'service' as const,
        contactEmail: 'contacto@servicio.com',
      },
      regional: {
        timezone: 'Europe/Madrid',
        locale: 'es-ES',
        currency: 'EUR',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: '24h' as const,
      },
      branding: {
        primaryColor: '#059669',
        secondaryColor: '#06B6D4',
      },
      policies: {
        cancellationPolicy: 'Cancelación gratuita hasta 24 horas antes de la cita.',
        refundPolicy: 'Reembolso completo para cancelaciones con aviso previo.',
        minBookingNoticeHours: 24,
        maxBookingAdvanceDays: 30,
      },
      booking: {
        requireCustomerPhone: true,
        requireCustomerAddress: false,
        maxPartySize: 1,
        defaultSlotDuration: 60,
        bookingCodePrefix: 'SRV',
      },
      notifications: {
        sendBookingConfirmation: true,
        sendBookingReminder: true,
        reminderHoursBefore: 24,
        sendCancellationNotification: true,
      },
      integrations: {
        stripeEnabled: false,
      },
      seo: {},
    } as TenantSettings,
  },
};

export type TemplateType = keyof typeof SETTINGS_TEMPLATES;
