# Settings & Feature Flags System

Sistema completo de gestión de configuraciones y feature flags por tenant.

## 🎯 Características

### Feature Flags Disponibles

#### 1. **Bookings** (Reservas)
```typescript
bookings: {
  enabled: boolean;                    // Habilitar sistema de reservas
  allowPublicCancellation: boolean;    // Permitir cancelación pública
  requirePaymentOnBooking: boolean;    // Requerir pago al reservar
  maxAdvanceBookingDays: number;       // Días máximos de anticipación
  minAdvanceBookingHours: number;      // Horas mínimas de anticipación
}
```

#### 2. **Check-In**
```typescript
checkIn: {
  enabled: boolean;                    // Habilitar check-in
  requireQRCode: boolean;              // Requerir QR code
  allowManualCheckIn: boolean;         // Permitir check-in manual
}
```

#### 3. **Payments** (Pagos)
```typescript
payments: {
  enabled: boolean;                    // Habilitar pagos
  provider: 'stripe' | 'none';         // Proveedor de pago
  requireDeposit: boolean;             // Requerir depósito
  depositPercentage: number;           // % de depósito (0-100)
}
```

#### 4. **Availability** (Disponibilidad)
```typescript
availability: {
  showRealTimeCapacity: boolean;       // Mostrar capacidad en tiempo real
  bufferSlots: number;                 // Slots de buffer no vendibles
}
```

#### 5. **Notifications** (Notificaciones)
```typescript
notifications: {
  enabled: boolean;                    // Habilitar notificaciones
  emailEnabled: boolean;               // Habilitar emails
  smsEnabled: boolean;                 // Habilitar SMS
}
```

#### 6. **Analytics**
```typescript
analytics: {
  enabled: boolean;                    // Habilitar analytics
  trackingEnabled: boolean;            // Habilitar tracking
}
```

#### 7. **Multi-Language**
```typescript
multiLanguage: {
  enabled: boolean;                    // Habilitar múltiples idiomas
  supportedLocales: string[];          // Locales soportados
}
```

## 📡 API Endpoints

### Feature Flags

```http
# Obtener feature flags
GET /settings/features
Headers: x-tenant-domain: museo.example.com

# Actualizar feature flags (admin)
PATCH /settings/features
Headers: x-tenant-domain: museo.example.com
Body: {
  "bookings": {
    "enabled": true,
    "allowPublicCancellation": false,
    "maxAdvanceBookingDays": 60
  },
  "payments": {
    "enabled": true,
    "provider": "stripe",
    "requireDeposit": true,
    "depositPercentage": 20
  }
}

# Resetear a valores por defecto
PATCH /settings/features/reset
Headers: x-tenant-domain: museo.example.com
```

### Tenant Settings

```http
# Obtener configuración completa (admin)
GET /settings
Headers: x-tenant-domain: museo.example.com

# Actualizar configuración (admin)
PATCH /settings
Headers: x-tenant-domain: museo.example.com
Body: {
  "general": {
    "businessName": "Museo Nacional",
    "contactEmail": "info@museo.com",
    "contactPhone": "+34 123 456 789"
  },
  "branding": {
    "primaryColor": "#FF6B6B",
    "secondaryColor": "#4ECDC4"
  },
  "regional": {
    "timezone": "Europe/Madrid",
    "locale": "es-ES",
    "currency": "EUR"
  }
}

# Obtener configuración pública (sin datos sensibles)
GET /settings/public
Headers: x-tenant-domain: museo.example.com
```

## 🛡️ Protección de Rutas con Feature Flags

### Usar el decorador `@RequireFeature`

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequireFeature } from '../settings/decorators/require-feature.decorator';
import { FeatureFlagGuard } from '../settings/guards/feature-flag.guard';

@Controller('bookings')
@UseGuards(FeatureFlagGuard)
export class BookingsController {
  
  @Get()
  @RequireFeature('bookings.enabled')
  async listBookings() {
    // Solo accesible si bookings.enabled === true
  }

  @Post()
  @RequireFeature('bookings.enabled')
  @RequireFeature('payments.enabled') // Múltiples features
  async createWithPayment() {
    // Requiere ambas features habilitadas
  }
}
```

### Verificar programáticamente

```typescript
import { SettingsService } from '../settings/settings.service';

export class SomeService {
  constructor(private readonly settingsService: SettingsService) {}

  async doSomething(tenant: TenantContext) {
    const isEnabled = await this.settingsService.isFeatureEnabled(
      'payments.enabled',
      tenant
    );

    if (isEnabled) {
      // Procesar pago
    }
  }
}
```

## 🎨 Tenant Settings - Configuraciones

### General
- `businessName`: Nombre del negocio
- `businessType`: Tipo de negocio (museum, event, restaurant, service, other)
- `contactEmail`: Email de contacto
- `contactPhone`: Teléfono de contacto
- `address`: Dirección física
- `description`: Descripción del negocio

### Regional
- `timezone`: Zona horaria (ej: Europe/Madrid)
- `locale`: Locale (ej: es-ES)
- `currency`: Moneda (ej: EUR)
- `dateFormat`: Formato de fecha
- `timeFormat`: Formato de hora (12h/24h)

### Branding
- `logo`: URL del logo
- `primaryColor`: Color primario (hex)
- `secondaryColor`: Color secundario (hex)
- `accentColor`: Color de acento (hex)
- `customCSS`: CSS personalizado

### Policies
- `cancellationPolicy`: Política de cancelación
- `refundPolicy`: Política de reembolso
- `termsAndConditions`: Términos y condiciones
- `privacyPolicy`: Política de privacidad
- `minBookingNoticeHours`: Horas mínimas de aviso
- `maxBookingAdvanceDays`: Días máximos de anticipación

### Booking
- `requireCustomerPhone`: Requerir teléfono del cliente
- `requireCustomerAddress`: Requerir dirección del cliente
- `maxPartySize`: Tamaño máximo del grupo
- `defaultSlotDuration`: Duración de slot por defecto (minutos)
- `bookingCodePrefix`: Prefijo para códigos de reserva

### Notifications
- `sendBookingConfirmation`: Enviar confirmación de reserva
- `sendBookingReminder`: Enviar recordatorio
- `reminderHoursBefore`: Horas antes para recordatorio
- `sendCancellationNotification`: Enviar notificación de cancelación
- `fromEmail`: Email remitente
- `fromName`: Nombre remitente

### Integrations
- `stripeEnabled`: Stripe habilitado
- `stripePublicKey`: Clave pública de Stripe
- `googleAnalyticsId`: ID de Google Analytics
- `customWebhookUrl`: URL de webhook personalizado

### SEO
- `metaTitle`: Título meta
- `metaDescription`: Descripción meta
- `ogImage`: Imagen Open Graph

## 💡 Casos de Uso

### 1. Museo con Check-in por QR
```json
{
  "bookings": {
    "enabled": true,
    "allowPublicCancellation": true,
    "requirePaymentOnBooking": false,
    "maxAdvanceBookingDays": 30
  },
  "checkIn": {
    "enabled": true,
    "requireQRCode": true,
    "allowManualCheckIn": false
  },
  "payments": {
    "enabled": false
  }
}
```

### 2. Restaurante con Pagos y Depósito
```json
{
  "bookings": {
    "enabled": true,
    "allowPublicCancellation": false,
    "requirePaymentOnBooking": true,
    "maxAdvanceBookingDays": 60
  },
  "payments": {
    "enabled": true,
    "provider": "stripe",
    "requireDeposit": true,
    "depositPercentage": 20
  },
  "notifications": {
    "enabled": true,
    "emailEnabled": true,
    "smsEnabled": true
  }
}
```

### 3. Eventos con Capacidad Limitada
```json
{
  "bookings": {
    "enabled": true,
    "maxAdvanceBookingDays": 90,
    "minAdvanceBookingHours": 24
  },
  "availability": {
    "showRealTimeCapacity": true,
    "bufferSlots": 5
  },
  "analytics": {
    "enabled": true,
    "trackingEnabled": true
  }
}
```

## 🔧 Arquitectura

```
apps/api/src/settings/
├── settings.module.ts              # Módulo principal
├── settings.service.ts             # Lógica de negocio
├── settings.controller.ts          # Endpoints API
├── settings.types.ts               # Tipos e interfaces
├── decorators/
│   └── require-feature.decorator.ts  # Decorador @RequireFeature
├── guards/
│   └── feature-flag.guard.ts       # Guard para validar features
└── dto/
    ├── update-feature-flags.dto.ts # DTO para feature flags
    └── update-settings.dto.ts      # DTO para settings
```

## 🚀 Próximos Pasos

1. **Agregar autenticación**: Proteger endpoints de admin con JWT
2. **Audit logs**: Registrar cambios en configuraciones
3. **Webhooks**: Notificar cambios de configuración
4. **Templates**: Plantillas predefinidas por tipo de negocio
5. **Validaciones**: Validaciones más estrictas entre features relacionadas
6. **Cache**: Cachear feature flags para mejor performance
7. **UI Admin**: Panel de administración para gestionar settings

## 📝 Notas

- Los feature flags se almacenan en `Instance.featureFlags` (JSON)
- Los settings se distribuyen entre campos de `Instance` y JSON
- Todos los cambios son por tenant (multi-tenant)
- Los endpoints públicos filtran datos sensibles
