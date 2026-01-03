# Settings & Feature Flags - Ejemplos de Uso

## Ejemplo 1: Proteger endpoints con Feature Flags

### Bookings Controller con Feature Guard

```typescript
import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { RequireFeature } from '../settings/decorators/require-feature.decorator';
import { FeatureFlagGuard } from '../settings/guards/feature-flag.guard';

@Controller('bookings')
@UseGuards(FeatureFlagGuard) // Aplicar guard a todo el controlador
export class BookingsController {
  
  @Post()
  @RequireFeature('bookings.enabled') // Requiere que bookings esté habilitado
  async createBooking() {
    // Este endpoint solo será accesible si bookings.enabled === true
  }

  @Patch(':code/cancel')
  @RequireFeature('bookings.enabled')
  @RequireFeature('bookings.allowPublicCancellation') // Requiere cancelación pública
  async cancelBooking() {
    // Requiere ambas features habilitadas
  }
}
```

### Payments Controller

```typescript
@Controller('payments')
@UseGuards(FeatureFlagGuard)
export class PaymentsController {
  
  @Post('process')
  @RequireFeature('payments.enabled')
  async processPayment() {
    // Solo accesible si payments.enabled === true
  }

  @Post('deposit')
  @RequireFeature('payments.enabled')
  @RequireFeature('payments.requireDeposit')
  async processDeposit() {
    // Requiere pagos habilitados Y depósitos requeridos
  }
}
```

## Ejemplo 2: Verificación programática en Services

```typescript
import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { TenantContext } from '@sistema-reservas/shared';

@Injectable()
export class BookingsService {
  constructor(private readonly settingsService: SettingsService) {}

  async createBooking(data: any, tenant: TenantContext) {
    // Obtener feature flags completos
    const features = await this.settingsService.getFeatureFlags(tenant);

    // Verificar si pagos están habilitados
    if (features.payments.enabled && features.payments.requirePaymentOnBooking) {
      // Procesar pago inmediatamente
      await this.processPayment(data);
    }

    // Verificar tiempo de anticipación
    const minHours = features.bookings.minAdvanceBookingHours;
    if (!this.isValidBookingTime(data.date, minHours)) {
      throw new BadRequestException(
        `Debe reservar con al menos ${minHours} horas de anticipación`
      );
    }

    // Continuar con la reserva...
  }

  async cancelBooking(code: string, tenant: TenantContext) {
    // Verificar si cancelación pública está permitida
    const allowed = await this.settingsService.isFeatureEnabled(
      'bookings.allowPublicCancellation',
      tenant
    );

    if (!allowed) {
      throw new ForbiddenException('Cancelación pública no permitida');
    }

    // Continuar con cancelación...
  }
}
```

## Ejemplo 3: Usar Settings en lógica de negocio

```typescript
@Injectable()
export class NotificationService {
  constructor(private readonly settingsService: SettingsService) {}

  async sendBookingConfirmation(booking: any, tenant: TenantContext) {
    // Obtener configuración
    const settings = await this.settingsService.getSettings(tenant);
    const features = await this.settingsService.getFeatureFlags(tenant);

    // Verificar si notificaciones están habilitadas
    if (!features.notifications.enabled || !features.notifications.emailEnabled) {
      return; // No enviar email
    }

    // Verificar si debe enviar confirmación
    if (!settings.notifications.sendBookingConfirmation) {
      return;
    }

    // Enviar email con configuración personalizada
    await this.emailService.send({
      to: booking.email,
      from: settings.notifications.fromEmail || 'noreply@sistema.com',
      fromName: settings.notifications.fromName || settings.general.businessName,
      subject: `Confirmación de reserva - ${settings.general.businessName}`,
      template: 'booking-confirmation',
      data: {
        booking,
        branding: settings.branding,
        policies: settings.policies,
      },
    });
  }

  async sendBookingReminder(booking: any, tenant: TenantContext) {
    const settings = await this.settingsService.getSettings(tenant);

    if (!settings.notifications.sendBookingReminder) {
      return;
    }

    const hoursBefore = settings.notifications.reminderHoursBefore;
    // Programar recordatorio X horas antes...
  }
}
```

## Ejemplo 4: Validaciones basadas en Settings

```typescript
@Injectable()
export class AvailabilityService {
  constructor(private readonly settingsService: SettingsService) {}

  async getAvailableSlots(offeringId: string, date: Date, tenant: TenantContext) {
    const features = await this.settingsService.getFeatureFlags(tenant);
    const settings = await this.settingsService.getSettings(tenant);

    // Verificar límite de días de anticipación
    const maxDays = features.bookings.maxAdvanceBookingDays;
    const maxDate = addDays(new Date(), maxDays);
    
    if (date > maxDate) {
      throw new BadRequestException(
        `No puede reservar con más de ${maxDays} días de anticipación`
      );
    }

    // Obtener slots disponibles
    let availableSlots = await this.calculateSlots(offeringId, date, tenant);

    // Aplicar buffer si está configurado
    if (features.availability.bufferSlots > 0) {
      availableSlots = availableSlots.map(slot => ({
        ...slot,
        capacity: Math.max(0, slot.capacity - features.availability.bufferSlots),
      }));
    }

    // Mostrar u ocultar capacidad real
    if (!features.availability.showRealTimeCapacity) {
      // No mostrar números exactos
      availableSlots = availableSlots.map(slot => ({
        ...slot,
        capacity: slot.capacity > 0 ? 'available' : 'full',
      }));
    }

    return availableSlots;
  }
}
```

## Ejemplo 5: Frontend - Obtener configuración pública

```typescript
// En tu cliente API
const response = await fetch('https://api.example.com/settings/public', {
  headers: {
    'x-tenant-domain': 'museo.example.com',
  },
});

const config = await response.json();

// Usar configuración para personalizar UI
document.documentElement.style.setProperty('--primary-color', config.branding.primaryColor);
document.documentElement.style.setProperty('--secondary-color', config.branding.secondaryColor);

// Mostrar/ocultar features según configuración
if (config.features.paymentsEnabled) {
  showPaymentOptions();
}

if (config.features.checkInEnabled) {
  showQRCode();
}

// Usar políticas en UI
document.getElementById('cancellation-policy').textContent = config.policies.cancellationPolicy;
```

## Ejemplo 6: Admin Panel - Actualizar Feature Flags

```typescript
// Habilitar pagos con Stripe
const response = await fetch('https://api.example.com/settings/features', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-domain': 'museo.example.com',
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN',
  },
  body: JSON.stringify({
    payments: {
      enabled: true,
      provider: 'stripe',
      requireDeposit: true,
      depositPercentage: 25,
    },
    notifications: {
      enabled: true,
      emailEnabled: true,
      smsEnabled: false,
    },
  }),
});

const updatedFeatures = await response.json();
console.log('Features actualizados:', updatedFeatures);
```

## Ejemplo 7: Configuración por tipo de negocio

### Museo (sin pagos, con check-in)
```json
{
  "bookings": {
    "enabled": true,
    "allowPublicCancellation": true,
    "requirePaymentOnBooking": false,
    "maxAdvanceBookingDays": 30,
    "minAdvanceBookingHours": 2
  },
  "checkIn": {
    "enabled": true,
    "requireQRCode": true,
    "allowManualCheckIn": true
  },
  "payments": {
    "enabled": false
  },
  "availability": {
    "showRealTimeCapacity": true,
    "bufferSlots": 2
  },
  "notifications": {
    "enabled": true,
    "emailEnabled": true,
    "smsEnabled": false
  }
}
```

### Restaurante (con pagos, sin check-in)
```json
{
  "bookings": {
    "enabled": true,
    "allowPublicCancellation": false,
    "requirePaymentOnBooking": true,
    "maxAdvanceBookingDays": 60,
    "minAdvanceBookingHours": 24
  },
  "checkIn": {
    "enabled": false
  },
  "payments": {
    "enabled": true,
    "provider": "stripe",
    "requireDeposit": true,
    "depositPercentage": 20
  },
  "availability": {
    "showRealTimeCapacity": false,
    "bufferSlots": 0
  },
  "notifications": {
    "enabled": true,
    "emailEnabled": true,
    "smsEnabled": true
  }
}
```

### Evento/Tour (con todo habilitado)
```json
{
  "bookings": {
    "enabled": true,
    "allowPublicCancellation": true,
    "requirePaymentOnBooking": true,
    "maxAdvanceBookingDays": 90,
    "minAdvanceBookingHours": 48
  },
  "checkIn": {
    "enabled": true,
    "requireQRCode": true,
    "allowManualCheckIn": false
  },
  "payments": {
    "enabled": true,
    "provider": "stripe",
    "requireDeposit": true,
    "depositPercentage": 50
  },
  "availability": {
    "showRealTimeCapacity": true,
    "bufferSlots": 5
  },
  "notifications": {
    "enabled": true,
    "emailEnabled": true,
    "smsEnabled": true
  },
  "analytics": {
    "enabled": true,
    "trackingEnabled": true
  },
  "multiLanguage": {
    "enabled": true,
    "supportedLocales": ["es-ES", "en-GB", "fr-FR"]
  }
}
```

## Testing con Feature Flags

```typescript
describe('BookingsController', () => {
  let controller: BookingsController;
  let settingsService: SettingsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: {
            isFeatureEnabled: jest.fn(),
            getFeatureFlags: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
    settingsService = module.get<SettingsService>(SettingsService);
  });

  it('should allow booking when feature is enabled', async () => {
    jest.spyOn(settingsService, 'isFeatureEnabled').mockResolvedValue(true);
    
    const result = await controller.createBooking(mockData, mockTenant);
    expect(result).toBeDefined();
  });

  it('should block booking when feature is disabled', async () => {
    jest.spyOn(settingsService, 'isFeatureEnabled').mockResolvedValue(false);
    
    await expect(
      controller.createBooking(mockData, mockTenant)
    ).rejects.toThrow(ForbiddenException);
  });
});
```
