import { Injectable, BadRequestException } from '@nestjs/common';
import { FeatureFlags, TenantSettings } from './settings.types';

@Injectable()
export class SettingsValidatorService {
  /**
   * Validar consistencia entre feature flags
   */
  validateFeatureFlags(flags: Partial<FeatureFlags>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Si payments está habilitado, debe tener un provider
    if (flags.payments?.enabled && flags.payments.provider === 'none') {
      errors.push('Payments enabled pero provider es "none". Configure un provider válido.');
    }

    // Si requireDeposit está habilitado, depositPercentage debe ser > 0
    if (flags.payments?.requireDeposit && (flags.payments.depositPercentage ?? 0) <= 0) {
      errors.push('requireDeposit habilitado pero depositPercentage es 0.');
    }

    // Si requirePaymentOnBooking está habilitado, payments debe estar habilitado
    if (flags.bookings?.requirePaymentOnBooking && !flags.payments?.enabled) {
      errors.push('requirePaymentOnBooking habilitado pero payments está deshabilitado.');
    }

    // Si requireQRCode está habilitado, checkIn debe estar habilitado
    if (flags.checkIn?.requireQRCode && !flags.checkIn?.enabled) {
      errors.push('requireQRCode habilitado pero checkIn está deshabilitado.');
    }

    // Validar rangos numéricos
    if (flags.bookings?.maxAdvanceBookingDays && flags.bookings.maxAdvanceBookingDays < 1) {
      errors.push('maxAdvanceBookingDays debe ser al menos 1.');
    }

    if (flags.bookings?.minAdvanceBookingHours && flags.bookings.minAdvanceBookingHours < 0) {
      errors.push('minAdvanceBookingHours no puede ser negativo.');
    }

    if (flags.payments?.depositPercentage) {
      if (flags.payments.depositPercentage < 0 || flags.payments.depositPercentage > 100) {
        errors.push('depositPercentage debe estar entre 0 y 100.');
      }
    }

    // Si multiLanguage está habilitado, debe tener al menos un locale
    if (flags.multiLanguage?.enabled && (!flags.multiLanguage.supportedLocales || flags.multiLanguage.supportedLocales.length === 0)) {
      errors.push('multiLanguage habilitado pero no hay locales configurados.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validar settings
   */
  validateSettings(settings: Partial<TenantSettings>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar email format (básico)
    if (settings.general?.contactEmail && !this.isValidEmail(settings.general.contactEmail)) {
      errors.push('contactEmail no tiene formato válido.');
    }

    if (settings.notifications?.fromEmail && !this.isValidEmail(settings.notifications.fromEmail)) {
      errors.push('fromEmail en notifications no tiene formato válido.');
    }

    // Validar colores hex
    if (settings.branding?.primaryColor && !this.isValidHexColor(settings.branding.primaryColor)) {
      errors.push('primaryColor no es un color hex válido.');
    }

    if (settings.branding?.secondaryColor && !this.isValidHexColor(settings.branding.secondaryColor)) {
      errors.push('secondaryColor no es un color hex válido.');
    }

    if (settings.branding?.accentColor && !this.isValidHexColor(settings.branding.accentColor)) {
      errors.push('accentColor no es un color hex válido.');
    }

    // Validar URLs
    if (settings.integrations?.customWebhookUrl && !this.isValidUrl(settings.integrations.customWebhookUrl)) {
      errors.push('customWebhookUrl no es una URL válida.');
    }

    // Validar rangos numéricos
    if (settings.booking?.maxPartySize && settings.booking.maxPartySize < 1) {
      errors.push('maxPartySize debe ser al menos 1.');
    }

    if (settings.booking?.defaultSlotDuration && settings.booking.defaultSlotDuration < 5) {
      errors.push('defaultSlotDuration debe ser al menos 5 minutos.');
    }

    if (settings.notifications?.reminderHoursBefore && settings.notifications.reminderHoursBefore < 1) {
      errors.push('reminderHoursBefore debe ser al menos 1 hora.');
    }

    if (settings.policies?.minBookingNoticeHours && settings.policies.minBookingNoticeHours < 0) {
      errors.push('minBookingNoticeHours no puede ser negativo.');
    }

    if (settings.policies?.maxBookingAdvanceDays && settings.policies.maxBookingAdvanceDays < 1) {
      errors.push('maxBookingAdvanceDays debe ser al menos 1.');
    }

    // Validar consistencia entre timeFormat
    if (settings.regional?.timeFormat && !['12h', '24h'].includes(settings.regional.timeFormat)) {
      errors.push('timeFormat debe ser "12h" o "24h".');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validar consistencia entre features y settings
   */
  validateConsistency(
    flags: Partial<FeatureFlags>,
    settings: Partial<TenantSettings>
  ): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Si notifications está deshabilitado pero settings tiene notificaciones activadas
    if (!flags.notifications?.enabled && settings.notifications?.sendBookingConfirmation) {
      warnings.push('Notifications feature deshabilitado pero sendBookingConfirmation está activo.');
    }

    // Si payments está deshabilitado pero stripe está configurado
    if (!flags.payments?.enabled && settings.integrations?.stripeEnabled) {
      warnings.push('Payments feature deshabilitado pero Stripe está habilitado.');
    }

    // Si maxAdvanceBookingDays en feature flags difiere del de settings/policies
    if (
      flags.bookings?.maxAdvanceBookingDays &&
      settings.policies?.maxBookingAdvanceDays &&
      flags.bookings.maxAdvanceBookingDays !== settings.policies.maxBookingAdvanceDays
    ) {
      warnings.push('maxAdvanceBookingDays en feature flags difiere de policies. Considere sincronizarlos.');
    }

    return {
      valid: true, // Warnings no invalidan
      warnings,
    };
  }

  /**
   * Helpers
   */
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
