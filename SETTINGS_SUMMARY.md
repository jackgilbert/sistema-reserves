# Sistema de Settings y Feature Flags - Resumen

## ✅ Implementación Completa

### Archivos Creados

```
apps/api/src/settings/
├── settings.module.ts                     # Módulo NestJS
├── settings.service.ts                    # Servicio con lógica de negocio
├── settings.controller.ts                 # API REST endpoints
├── settings.types.ts                      # Interfaces TypeScript y defaults
├── decorators/
│   └── require-feature.decorator.ts       # @RequireFeature decorator
├── guards/
│   └── feature-flag.guard.ts             # FeatureFlagGuard
└── dto/
    ├── update-feature-flags.dto.ts       # DTOs validados con class-validator
    └── update-settings.dto.ts

SETTINGS_GUIDE.md                          # Documentación completa
SETTINGS_EXAMPLES.md                       # Ejemplos de uso
```

## 🎯 Características Implementadas

### 1. **Feature Flags por Tenant**
- ✅ 7 categorías de features (bookings, checkIn, payments, availability, notifications, analytics, multiLanguage)
- ✅ Configuración granular con validaciones
- ✅ Valores por defecto inteligentes
- ✅ Merge profundo con defaults

### 2. **Tenant Settings**
- ✅ 8 secciones de configuración (general, regional, branding, policies, booking, notifications, integrations, seo)
- ✅ Configuración completa del tenant
- ✅ Endpoint público (sin datos sensibles)
- ✅ Mapeo a schema existente (Instance table)

### 3. **API REST Endpoints**

```
GET    /settings/features           - Obtener feature flags
PATCH  /settings/features           - Actualizar feature flags  
PATCH  /settings/features/reset     - Resetear a defaults

GET    /settings                    - Obtener configuración completa (admin)
PATCH  /settings                    - Actualizar configuración (admin)
GET    /settings/public             - Obtener configuración pública
```

### 4. **Protección de Rutas**

```typescript
// Guard + Decorator
@UseGuards(FeatureFlagGuard)
@RequireFeature('bookings.enabled')
async createBooking() { }

// Verificación programática
const enabled = await settingsService.isFeatureEnabled('payments.enabled', tenant);
```

### 5. **DTOs Validados**
- ✅ class-validator para validación automática
- ✅ class-transformer para transformación
- ✅ Documentación Swagger automática
- ✅ Validaciones de rangos (0-100%, min/max values)

## 🔧 Integración

### En app.module.ts
```typescript
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    // ... otros módulos
    SettingsModule,
  ],
})
```

### En cualquier controller/service
```typescript
constructor(private readonly settingsService: SettingsService) {}

async someMethod(tenant: TenantContext) {
  const features = await this.settingsService.getFeatureFlags(tenant);
  const settings = await this.settingsService.getSettings(tenant);
}
```

## 📊 Feature Flags Disponibles

| Categoría | Features | Default |
|-----------|----------|---------|
| **Bookings** | enabled, allowPublicCancellation, requirePaymentOnBooking, maxAdvanceBookingDays (90), minAdvanceBookingHours (2) | enabled: true |
| **CheckIn** | enabled, requireQRCode, allowManualCheckIn | enabled: true |
| **Payments** | enabled, provider (stripe/none), requireDeposit, depositPercentage (0-100) | enabled: false |
| **Availability** | showRealTimeCapacity, bufferSlots | showRealTimeCapacity: true |
| **Notifications** | enabled, emailEnabled, smsEnabled | emailEnabled: true |
| **Analytics** | enabled, trackingEnabled | enabled: false |
| **MultiLanguage** | enabled, supportedLocales[] | enabled: false |

## 🎨 Settings Disponibles

| Sección | Campos Principales |
|---------|-------------------|
| **General** | businessName, businessType, contactEmail, contactPhone, address, description |
| **Regional** | timezone, locale, currency, dateFormat, timeFormat |
| **Branding** | logo, primaryColor, secondaryColor, accentColor, customCSS |
| **Policies** | cancellationPolicy, refundPolicy, termsAndConditions, privacyPolicy, minBookingNoticeHours, maxBookingAdvanceDays |
| **Booking** | requireCustomerPhone/Address, maxPartySize, defaultSlotDuration, bookingCodePrefix |
| **Notifications** | sendBookingConfirmation/Reminder/Cancellation, reminderHoursBefore, fromEmail, fromName |
| **Integrations** | stripeEnabled, stripePublicKey, googleAnalyticsId, customWebhookUrl |
| **SEO** | metaTitle, metaDescription, ogImage |

## 💡 Casos de Uso Pre-configurados

### Museo
- Bookings: ✅ (sin pagos)
- CheckIn: ✅ (con QR)
- Payments: ❌
- Cancelación pública: ✅

### Restaurante
- Bookings: ✅ (con pagos obligatorios)
- CheckIn: ❌
- Payments: ✅ (Stripe + 20% depósito)
- Cancelación pública: ❌
- SMS: ✅

### Evento/Tour
- Bookings: ✅
- CheckIn: ✅
- Payments: ✅ (50% depósito)
- Multi-idioma: ✅
- Analytics: ✅

## 🔒 Seguridad

- ✅ Todos los endpoints requieren x-tenant-domain
- ✅ Endpoints de admin requieren autenticación (por implementar)
- ✅ Endpoint público filtra datos sensibles
- ✅ Validación con class-validator
- ✅ Type-safe con TypeScript

## 🚀 Próximos Pasos Sugeridos

1. **Autenticación Admin**: Agregar JWT guard a endpoints PATCH
2. **Audit Logs**: Registrar cambios en settings
3. **Cache**: Cachear feature flags con Redis
4. **Templates**: Plantillas por tipo de negocio
5. **UI Admin**: Panel web para gestionar settings
6. **Webhooks**: Notificar cambios de configuración
7. **Feature Flag Scheduling**: Activar/desactivar en fechas específicas
8. **A/B Testing**: Variantes de features

## 📝 Notas Técnicas

- **Storage**: Feature flags en `Instance.featureFlags` (JSON field)
- **Deep Merge**: Los updates hacen merge con valores existentes
- **Type Safety**: Interfaces TypeScript completas
- **Multi-tenant**: Todo scoped por tenantId
- **Backwards Compatible**: Merge con defaults si faltan campos
- **Validation**: DTOs anidados con validación completa

## 🧪 Testing

```typescript
// Mock del service
const mockSettingsService = {
  isFeatureEnabled: jest.fn().mockResolvedValue(true),
  getFeatureFlags: jest.fn().mockResolvedValue(DEFAULT_FEATURE_FLAGS),
  getSettings: jest.fn().mockResolvedValue(DEFAULT_TENANT_SETTINGS),
};

// Usar en tests
await expect(controller.createBooking()).resolves.toBeDefined();
```

## 📚 Documentación

- **SETTINGS_GUIDE.md**: Guía completa de uso
- **SETTINGS_EXAMPLES.md**: Ejemplos prácticos y casos de uso
- **Swagger**: Auto-documentación en /api/docs

## ✨ Beneficios

1. **Control Total**: Admin puede habilitar/deshabilitar features sin deploy
2. **Personalización**: Cada tenant con su configuración
3. **Seguridad**: Guard automático en rutas
4. **Type-Safe**: TypeScript end-to-end
5. **Validado**: class-validator automático
6. **Flexible**: Fácil agregar nuevas features
7. **Documentado**: Swagger + guías extensas
8. **Multi-tenant**: Aislamiento perfecto por tenant
