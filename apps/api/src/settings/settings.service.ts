import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';
import {
  FeatureFlags,
  TenantSettings,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_TENANT_SETTINGS,
} from './settings.types';
import { UpdateFeatureFlagsDto } from './dto/update-feature-flags.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SETTINGS_TEMPLATES, TemplateType } from './settings.templates';
import { SettingsValidatorService } from './settings-validator.service';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly validator: SettingsValidatorService,
  ) {}

  /**
   * Obtener feature flags del tenant
   */
  async getFeatureFlags(tenant: TenantContext): Promise<FeatureFlags> {
    const instance = await this.prisma.instance.findUnique({
      where: { id: tenant.tenantId },
      select: { featureFlags: true },
    });

    if (!instance) {
      throw new NotFoundException('Tenant no encontrado');
    }

    // Merge con defaults para asegurar que todas las propiedades existen
    return this.mergeWithDefaults(
      instance.featureFlags as Partial<FeatureFlags>,
      DEFAULT_FEATURE_FLAGS,
    );
  }

  /**
   * Actualizar feature flags del tenant
   */
  async updateFeatureFlags(
    dto: UpdateFeatureFlagsDto,
    tenant: TenantContext,
  ): Promise<FeatureFlags> {
    const current = await this.getFeatureFlags(tenant);

    // Deep merge de los nuevos valores
    const updated = this.deepMerge(current, dto);

    await this.prisma.instance.update({
      where: { id: tenant.tenantId },
      data: { featureFlags: updated as any },
    });

    return updated;
  }

  /**
   * Resetear feature flags a valores por defecto
   */
  async resetFeatureFlags(tenant: TenantContext): Promise<FeatureFlags> {
    await this.prisma.instance.update({
      where: { id: tenant.tenantId },
      data: { featureFlags: DEFAULT_FEATURE_FLAGS as any },
    });

    return DEFAULT_FEATURE_FLAGS;
  }

  /**
   * Verificar si una feature está habilitada
   */
  async isFeatureEnabled(
    featurePath: string,
    tenant: TenantContext,
  ): Promise<boolean> {
    const flags = await this.getFeatureFlags(tenant);
    const value = this.getNestedValue(flags, featurePath);

    return value === true;
  }

  /**
   * Obtener configuración completa del tenant
   */
  async getSettings(tenant: TenantContext): Promise<TenantSettings> {
    const instance = await this.prisma.instance.findUnique({
      where: { id: tenant.tenantId },
      select: {
        name: true,
        logo: true,
        primaryColor: true,
        secondaryColor: true,
        timezone: true,
        locale: true,
        currency: true,
        stripeAccount: true,
        featureFlags: true,
        extendedSettings: true,
      },
    });

    if (!instance) {
      throw new NotFoundException('Tenant no encontrado');
    }

    // Obtener extended settings y hacer merge con defaults
    const extendedSettings = (instance.extendedSettings as any) || {};

    // Construir settings desde la instance actual
    const settings: TenantSettings = {
      general: {
        businessName: instance.name,
        businessType: extendedSettings.general?.businessType || 'other',
        contactEmail:
          extendedSettings.general?.contactEmail || 'info@example.com',
        contactPhone: extendedSettings.general?.contactPhone,
        address: extendedSettings.general?.address,
        description: extendedSettings.general?.description,
      },
      regional: {
        timezone: instance.timezone,
        locale: instance.locale,
        currency: instance.currency,
        dateFormat: extendedSettings.regional?.dateFormat || 'dd/MM/yyyy',
        timeFormat: extendedSettings.regional?.timeFormat || '24h',
      },
      branding: {
        logo: instance.logo || undefined,
        primaryColor: instance.primaryColor,
        secondaryColor: instance.secondaryColor,
        accentColor: extendedSettings.branding?.accentColor,
        customCSS: extendedSettings.branding?.customCSS,
      },
      policies: extendedSettings.policies || DEFAULT_TENANT_SETTINGS.policies,
      booking: extendedSettings.booking || DEFAULT_TENANT_SETTINGS.booking,
      notifications:
        extendedSettings.notifications || DEFAULT_TENANT_SETTINGS.notifications,
      integrations: {
        stripeEnabled: !!instance.stripeAccount,
        stripePublicKey: extendedSettings.integrations?.stripePublicKey,
        googleAnalyticsId: extendedSettings.integrations?.googleAnalyticsId,
        customWebhookUrl: extendedSettings.integrations?.customWebhookUrl,
      },
      tax: extendedSettings.tax || DEFAULT_TENANT_SETTINGS.tax,
      seo: extendedSettings.seo || {},
    };

    return settings;
  }

  /**
   * Actualizar configuración del tenant
   */
  async updateSettings(
    dto: UpdateSettingsDto,
    tenant: TenantContext,
  ): Promise<TenantSettings> {
    const updates: any = {};
    const currentSettings = await this.getSettings(tenant);

    // Mapear campos del DTO a la tabla Instance
    if (dto.general?.businessName) {
      updates.name = dto.general.businessName;
    }

    if (dto.regional) {
      if (dto.regional.timezone) updates.timezone = dto.regional.timezone;
      if (dto.regional.locale) updates.locale = dto.regional.locale;
      if (dto.regional.currency) updates.currency = dto.regional.currency;
    }

    if (dto.branding) {
      if (dto.branding.logo !== undefined) updates.logo = dto.branding.logo;
      if (dto.branding.primaryColor)
        updates.primaryColor = dto.branding.primaryColor;
      if (dto.branding.secondaryColor)
        updates.secondaryColor = dto.branding.secondaryColor;
    }

    // Actualizar extendedSettings con el resto de la configuración
    const extendedSettings = this.deepMerge(currentSettings, dto);

    // Remover campos que se guardan en columnas dedicadas
    delete extendedSettings.general?.businessName;

    updates.extendedSettings = {
      general: extendedSettings.general,
      regional: {
        dateFormat: extendedSettings.regional.dateFormat,
        timeFormat: extendedSettings.regional.timeFormat,
      },
      branding: {
        accentColor: extendedSettings.branding.accentColor,
        customCSS: extendedSettings.branding.customCSS,
      },
      policies: extendedSettings.policies,
      booking: extendedSettings.booking,
      notifications: extendedSettings.notifications,
      integrations: {
        stripePublicKey: extendedSettings.integrations.stripePublicKey,
        googleAnalyticsId: extendedSettings.integrations.googleAnalyticsId,
        customWebhookUrl: extendedSettings.integrations.customWebhookUrl,
      },
      tax: extendedSettings.tax,
      seo: extendedSettings.seo,
    };

    if (Object.keys(updates).length > 0) {
      await this.prisma.instance.update({
        where: { id: tenant.tenantId },
        data: updates,
      });
    }

    // Retornar settings actualizados
    return this.getSettings(tenant);
  }

  /**
   * Obtener configuración pública (sin datos sensibles)
   */
  async getPublicSettings(
    tenant: TenantContext,
  ): Promise<Partial<TenantSettings>> {
    const settings = await this.getSettings(tenant);
    const flags = await this.getFeatureFlags(tenant);

    return {
      general: settings.general,
      regional: settings.regional,
      branding: settings.branding,
      policies: {
        cancellationPolicy: settings.policies.cancellationPolicy,
        refundPolicy: settings.policies.refundPolicy,
        termsAndConditions: settings.policies.termsAndConditions,
        privacyPolicy: settings.policies.privacyPolicy,
        minBookingNoticeHours: settings.policies.minBookingNoticeHours,
        maxBookingAdvanceDays: settings.policies.maxBookingAdvanceDays,
      },
      seo: settings.seo,
      // Agregar info de features habilitadas
      ...({
        features: {
          bookingsEnabled: flags.bookings.enabled,
          checkInEnabled: flags.checkIn.enabled,
          paymentsEnabled: flags.payments.enabled,
        },
      } as any),
    };
  }

  /**
   * Helper: Deep merge de objetos
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target };

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }

    return output;
  }

  /**
   * Helper: Merge con valores por defecto
   */
  private mergeWithDefaults(
    partial: Partial<FeatureFlags>,
    defaults: FeatureFlags,
  ): FeatureFlags {
    return this.deepMerge(defaults, partial);
  }

  /**
   * Helper: Obtener valor anidado de un objeto
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Helper: Verificar si es un objeto
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * ============================================================================
   * ADVANCED FEATURES
   * ============================================================================
   */

  /**
   * Aplicar plantilla pre-configurada por tipo de negocio
   */
  async applyTemplate(
    templateType: TemplateType,
    tenant: TenantContext,
    overwrite = false,
  ): Promise<{ featureFlags: FeatureFlags; settings: TenantSettings }> {
    const template = SETTINGS_TEMPLATES[templateType];

    if (!template) {
      throw new BadRequestException(
        `Plantilla "${templateType}" no encontrada`,
      );
    }

    if (overwrite) {
      // Sobrescribir completamente
      await this.prisma.instance.update({
        where: { id: tenant.tenantId },
        data: {
          featureFlags: template.featureFlags as any,
          name: template.settings.general.businessName,
          timezone: template.settings.regional.timezone,
          locale: template.settings.regional.locale,
          currency: template.settings.regional.currency,
          primaryColor: template.settings.branding.primaryColor,
          secondaryColor: template.settings.branding.secondaryColor,
        },
      });
    } else {
      // Merge con valores existentes
      const currentFlags = await this.getFeatureFlags(tenant);
      const mergedFlags = this.deepMerge(currentFlags, template.featureFlags);

      await this.prisma.instance.update({
        where: { id: tenant.tenantId },
        data: { featureFlags: mergedFlags as any },
      });
    }

    return {
      featureFlags: await this.getFeatureFlags(tenant),
      settings: await this.getSettings(tenant),
    };
  }

  /**
   * Listar todas las plantillas disponibles
   */
  getAvailableTemplates() {
    return Object.entries(SETTINGS_TEMPLATES).map(([key, template]) => ({
      id: key,
      name: template.name,
      description: template.description,
    }));
  }

  /**
   * Validar feature flags y settings
   */
  async validateConfiguration(
    featureFlags?: Partial<FeatureFlags>,
    settings?: Partial<TenantSettings>,
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (featureFlags) {
      const flagsValidation = this.validator.validateFeatureFlags(featureFlags);
      if (!flagsValidation.valid) {
        errors.push(...flagsValidation.errors);
      }
    }

    if (settings) {
      const settingsValidation = this.validator.validateSettings(settings);
      if (!settingsValidation.valid) {
        errors.push(...settingsValidation.errors);
      }
    }

    if (featureFlags && settings) {
      const consistencyValidation = this.validator.validateConsistency(
        featureFlags,
        settings,
      );
      warnings.push(...consistencyValidation.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Exportar configuración completa
   */
  async exportConfiguration(
    tenant: TenantContext,
    includeFeatureFlags = true,
    includeSettings = true,
  ): Promise<any> {
    const result: any = {
      tenantId: tenant.tenantId,
      exportedAt: new Date().toISOString(),
    };

    if (includeFeatureFlags) {
      result.featureFlags = await this.getFeatureFlags(tenant);
    }

    if (includeSettings) {
      result.settings = await this.getSettings(tenant);
    }

    return result;
  }

  /**
   * Importar configuración (con validación)
   */
  async importConfiguration(
    tenant: TenantContext,
    data: {
      featureFlags?: Partial<FeatureFlags>;
      settings?: Partial<UpdateSettingsDto>;
    },
    validate = true,
  ): Promise<{ success: boolean; errors?: string[]; warnings?: string[] }> {
    // Validar antes de importar
    if (validate) {
      const validation = await this.validateConfiguration(
        data.featureFlags,
        data.settings as any,
      );

      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        };
      }
    }

    // Aplicar cambios
    try {
      if (data.featureFlags) {
        await this.updateFeatureFlags(data.featureFlags as any, tenant);
      }

      if (data.settings) {
        await this.updateSettings(data.settings as any, tenant);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        errors: [
          error instanceof Error
            ? error.message
            : 'Error desconocido al importar',
        ],
      };
    }
  }

  /**
   * Comparar configuración actual con una plantilla
   */
  async compareWithTemplate(
    templateType: TemplateType,
    tenant: TenantContext,
  ): Promise<{
    differences: {
      featureFlags: Record<string, any>;
      settings: Record<string, any>;
    };
    summary: {
      totalDifferences: number;
      flagsDifferent: number;
      settingsDifferent: number;
    };
  }> {
    const template = SETTINGS_TEMPLATES[templateType];
    const current = {
      featureFlags: await this.getFeatureFlags(tenant),
      settings: await this.getSettings(tenant),
    };

    const flagsDiff = this.findDifferences(
      current.featureFlags,
      template.featureFlags,
    );
    const settingsDiff = this.findDifferences(
      current.settings,
      template.settings,
    );

    return {
      differences: {
        featureFlags: flagsDiff,
        settings: settingsDiff,
      },
      summary: {
        totalDifferences:
          Object.keys(flagsDiff).length + Object.keys(settingsDiff).length,
        flagsDifferent: Object.keys(flagsDiff).length,
        settingsDifferent: Object.keys(settingsDiff).length,
      },
    };
  }

  /**
   * Helper: Encontrar diferencias entre dos objetos
   */
  private findDifferences(
    current: any,
    template: any,
    prefix = '',
  ): Record<string, any> {
    const differences: Record<string, any> = {};

    const allKeys = new Set([
      ...Object.keys(current || {}),
      ...Object.keys(template || {}),
    ]);

    for (const key of allKeys) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const currentVal = current?.[key];
      const templateVal = template?.[key];

      if (this.isObject(currentVal) && this.isObject(templateVal)) {
        const nested = this.findDifferences(currentVal, templateVal, fullKey);
        Object.assign(differences, nested);
      } else if (JSON.stringify(currentVal) !== JSON.stringify(templateVal)) {
        differences[fullKey] = {
          current: currentVal,
          template: templateVal,
        };
      }
    }

    return differences;
  }
}
