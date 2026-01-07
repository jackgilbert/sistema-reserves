# Settings System - Advanced Features Documentation

## 🚀 New Features Added

### 1. **Settings Templates** 📋
Pre-configured settings optimized for different business types.

#### Available Templates:
- **Museum/Gallery** - Check-in with QR, no payments, multi-language
- **Restaurant** - Payments with deposit, SMS notifications, no check-in
- **Event/Tour** - All features enabled, 50% deposit, multi-language
- **Service/Consultation** - Appointments, optional payments, SMS reminders

#### Endpoints:

```http
# List all available templates
GET /settings/templates

Response:
[
  {
    "id": "museum",
    "name": "Museo / Galería",
    "description": "Configuración para museos y galerías con check-in por QR"
  },
  {
    "id": "restaurant",
    "name": "Restaurante",
    "description": "Configuración para restaurantes con pagos y depósito"
  },
  ...
]
```

```http
# Apply a template
POST /settings/templates/apply
Headers: x-tenant-domain: example.com
Body: {
  "template": "museum",
  "overwrite": false  // false = merge, true = replace
}

Response:
{
  "featureFlags": { ... },
  "settings": { ... }
}
```

```http
# Compare current configuration with a template
GET /settings/templates/compare?template=restaurant
Headers: x-tenant-domain: example.com

Response:
{
  "differences": {
    "featureFlags": {
      "payments.enabled": {
        "current": false,
        "template": true
      },
      ...
    },
    "settings": { ... }
  },
  "summary": {
    "totalDifferences": 12,
    "flagsDifferent": 7,
    "settingsDifferent": 5
  }
}
```

### 2. **Configuration Validation** ✅

Validates consistency between features and settings before applying changes.

#### Validation Rules:
- ✅ Payments provider required if payments enabled
- ✅ Deposit percentage must be > 0 if deposit required
- ✅ Payment feature must be enabled if requirePaymentOnBooking is true
- ✅ CheckIn must be enabled if requireQRCode is true
- ✅ Email format validation
- ✅ Hex color format validation
- ✅ URL validation for webhooks
- ✅ Numeric range validations
- ✅ Cross-feature consistency checks

#### Endpoint:

```http
POST /settings/validate
Body: {
  "featureFlags": {
    "payments": {
      "enabled": true,
      "provider": "none"  // ❌ Invalid!
    }
  },
  "settings": {
    "branding": {
      "primaryColor": "invalid-color"  // ❌ Invalid!
    }
  }
}

Response:
{
  "valid": false,
  "errors": [
    "Payments enabled pero provider es 'none'. Configure un provider válido.",
    "primaryColor no es un color hex válido."
  ],
  "warnings": []
}
```

### 3. **Import/Export Configuration** 📦

Backup, migrate, or share configurations between tenants.

#### Export:

```http
GET /settings/export?includeFeatureFlags=true&includeSettings=true
Headers: x-tenant-domain: example.com

Response:
{
  "tenantId": "uuid-here",
  "exportedAt": "2026-01-01T12:00:00Z",
  "featureFlags": { ... },
  "settings": { ... }
}
```

#### Import with Validation:

```http
POST /settings/import
Headers: x-tenant-domain: example.com
Body: {
  "featureFlags": { ... },
  "settings": { ... },
  "validate": true  // Validate before importing
}

Response:
{
  "success": true
}

// Or if validation fails:
{
  "success": false,
  "errors": ["..."],
  "warnings": ["..."]
}
```

## 💡 Usage Examples

### Example 1: Set up a Museum from Scratch

```typescript
// 1. Apply museum template
const response = await fetch('/settings/templates/apply', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-domain': 'museo.example.com',
  },
  body: JSON.stringify({
    template: 'museum',
    overwrite: false,
  }),
});

// 2. Customize specific settings
await fetch('/settings', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-domain': 'museo.example.com',
  },
  body: JSON.stringify({
    general: {
      businessName: 'Museo Nacional de Arte',
      contactEmail: 'info@museonacional.com',
      contactPhone: '+34 912 345 678',
    },
    branding: {
      primaryColor: '#2C3E50',
      secondaryColor: '#E74C3C',
    },
  }),
});
```

### Example 2: Validate Before Applying Changes

```typescript
// First validate
const validation = await fetch('/settings/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    featureFlags: {
      payments: {
        enabled: true,
        provider: 'stripe',
        requireDeposit: true,
        depositPercentage: 25,
      },
    },
  }),
});

const { valid, errors, warnings } = await validation.json();

if (valid) {
  // Apply changes
  await fetch('/settings/features', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-domain': 'example.com',
    },
    body: JSON.stringify({
      payments: {
        enabled: true,
        provider: 'stripe',
        requireDeposit: true,
        depositPercentage: 25,
      },
    }),
  });
} else {
  console.error('Validation failed:', errors);
}
```

### Example 3: Clone Configuration Between Tenants

```typescript
// 1. Export from source tenant
const exportData = await fetch('/settings/export', {
  headers: { 'x-tenant-domain': 'source.example.com' },
});

const config = await exportData.json();

// 2. Import to destination tenant
await fetch('/settings/import', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-domain': 'destination.example.com',
  },
  body: JSON.stringify({
    featureFlags: config.featureFlags,
    settings: config.settings,
    validate: true,
  }),
});
```

### Example 4: Compare with Template to See Changes

```typescript
// Check what would change if you apply a template
const comparison = await fetch(
  '/settings/templates/compare?template=restaurant',
  {
    headers: { 'x-tenant-domain': 'example.com' },
  }
);

const { differences, summary } = await comparison.json();

console.log(`Would change ${summary.totalDifferences} settings:`);
console.log('Feature flags differences:', differences.featureFlags);
console.log('Settings differences:', differences.settings);
```

### Example 5: Admin Panel - Template Selector

```typescript
// Get all available templates
const templates = await fetch('/settings/templates');
const templateList = await templates.json();

// Show in UI
templateList.forEach(template => {
  console.log(`${template.name}: ${template.description}`);
});

// User selects a template
const selectedTemplate = 'restaurant';

// Show preview of changes
const preview = await fetch(
  `/settings/templates/compare?template=${selectedTemplate}`,
  { headers: { 'x-tenant-domain': domain } }
);

const changes = await preview.json();

// Show confirmation dialog with number of changes
if (confirm(`This will change ${changes.summary.totalDifferences} settings. Continue?`)) {
  // Apply template
  await fetch('/settings/templates/apply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-domain': domain,
    },
    body: JSON.stringify({
      template: selectedTemplate,
      overwrite: false,
    }),
  });
}
```

## 🔒 Validation Rules Reference

### Feature Flags Validations

| Rule | Description | Error Message |
|------|-------------|---------------|
| **Payments Provider** | If payments enabled, provider must not be 'none' | "Payments enabled pero provider es 'none'" |
| **Deposit Percentage** | If requireDeposit true, depositPercentage must be > 0 | "requireDeposit habilitado pero depositPercentage es 0" |
| **Payment on Booking** | If requirePaymentOnBooking true, payments must be enabled | "requirePaymentOnBooking habilitado pero payments está deshabilitado" |
| **QR Code** | If requireQRCode true, checkIn must be enabled | "requireQRCode habilitado pero checkIn está deshabilitado" |
| **Advance Days** | maxAdvanceBookingDays must be >= 1 | "maxAdvanceBookingDays debe ser al menos 1" |
| **Advance Hours** | minAdvanceBookingHours must be >= 0 | "minAdvanceBookingHours no puede ser negativo" |
| **Deposit Range** | depositPercentage must be 0-100 | "depositPercentage debe estar entre 0 y 100" |
| **Multi-language Locales** | If multiLanguage enabled, must have locales | "multiLanguage habilitado pero no hay locales configurados" |

### Settings Validations

| Field | Validation | Error Message |
|-------|------------|---------------|
| **contactEmail** | Valid email format | "contactEmail no tiene formato válido" |
| **fromEmail** | Valid email format | "fromEmail en notifications no tiene formato válido" |
| **primaryColor** | Valid hex color (#RRGGBB) | "primaryColor no es un color hex válido" |
| **secondaryColor** | Valid hex color (#RRGGBB) | "secondaryColor no es un color hex válido" |
| **accentColor** | Valid hex color (#RRGGBB) | "accentColor no es un color hex válido" |
| **customWebhookUrl** | Valid URL | "customWebhookUrl no es una URL válida" |
| **maxPartySize** | >= 1 | "maxPartySize debe ser al menos 1" |
| **defaultSlotDuration** | >= 5 minutes | "defaultSlotDuration debe ser al menos 5 minutos" |
| **reminderHoursBefore** | >= 1 hour | "reminderHoursBefore debe ser al menos 1 hora" |
| **minBookingNoticeHours** | >= 0 | "minBookingNoticeHours no puede ser negativo" |
| **maxBookingAdvanceDays** | >= 1 | "maxBookingAdvanceDays debe ser al menos 1" |
| **timeFormat** | Must be '12h' or '24h' | "timeFormat debe ser '12h' o '24h'" |

### Consistency Warnings

| Scenario | Warning |
|----------|---------|
| Notifications disabled but confirmation enabled | "Notifications feature deshabilitado pero sendBookingConfirmation está activo" |
| Payments disabled but Stripe enabled | "Payments feature deshabilitado pero Stripe está habilitado" |
| Mismatched maxAdvanceBookingDays | "maxAdvanceBookingDays en feature flags difiere de policies" |

## 📊 Template Configurations

### Museum Template

```json
{
  "featureFlags": {
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
    "payments": { "enabled": false },
    "availability": {
      "showRealTimeCapacity": true,
      "bufferSlots": 2
    },
    "multiLanguage": {
      "enabled": true,
      "supportedLocales": ["es-ES", "en-GB"]
    }
  }
}
```

### Restaurant Template

```json
{
  "featureFlags": {
    "bookings": {
      "enabled": true,
      "allowPublicCancellation": false,
      "requirePaymentOnBooking": true,
      "maxAdvanceBookingDays": 60,
      "minAdvanceBookingHours": 24
    },
    "checkIn": { "enabled": false },
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
}
```

### Event Template

```json
{
  "featureFlags": {
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
    "multiLanguage": {
      "enabled": true,
      "supportedLocales": ["es-ES", "en-GB", "fr-FR", "de-DE"]
    }
  }
}
```

## 🎯 Best Practices

1. **Always Validate First**: Use `/settings/validate` before applying changes in production
2. **Use Templates as Starting Point**: Apply a template, then customize specific settings
3. **Export Before Major Changes**: Create a backup with `/settings/export`
4. **Compare Before Applying Templates**: Use `/settings/templates/compare` to preview changes
5. **Test in Staging**: Import/export between staging and production environments
6. **Monitor Consistency**: Check warnings in validation responses
7. **Document Custom Configurations**: Keep notes on why you deviate from templates

## 🔧 Integration Tips

### With Frontend Admin Panel

```typescript
// Settings Manager Component
class SettingsManager {
  async loadCurrentConfig() {
    const settings = await api.get('/settings');
    const features = await api.get('/settings/features');
    return { settings, features };
  }

  async validateAndSave(changes) {
    // Validate first
    const validation = await api.post('/settings/validate', changes);
    
    if (!validation.valid) {
      showErrors(validation.errors);
      return false;
    }
    
    if (validation.warnings.length > 0) {
      const proceed = await confirmWarnings(validation.warnings);
      if (!proceed) return false;
    }
    
    // Save changes
    await api.patch('/settings/features', changes.featureFlags);
    await api.patch('/settings', changes.settings);
    
    return true;
  }
}
```

### With CI/CD

```yaml
# .github/workflows/deploy-settings.yml
name: Deploy Settings
on:
  push:
    paths:
      - 'config/settings.json'
      
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Export current settings (backup)
        run: |
          curl -H "x-tenant-domain: $DOMAIN" \
            https://api.example.com/settings/export > backup.json
      
      - name: Validate new settings
        run: |
          curl -X POST https://api.example.com/settings/validate \
            -d @config/settings.json
      
      - name: Import new settings
        run: |
          curl -X POST -H "x-tenant-domain: $DOMAIN" \
            https://api.example.com/settings/import \
            -d @config/settings.json
```

## 🆕 What's New

- ✅ 4 pre-configured business templates
- ✅ Comprehensive validation with 15+ rules
- ✅ Import/Export for backup and migration
- ✅ Template comparison to preview changes
- ✅ Cross-feature consistency checks
- ✅ Validation warnings (non-blocking)
- ✅ Type-safe throughout
- ✅ Swagger documentation

## 📈 Future Enhancements

- [ ] Audit logging for all configuration changes
- [ ] Role-based access control for settings
- [ ] Feature flag scheduling (enable/disable at specific times)
- [ ] Settings versioning and rollback
- [ ] A/B testing with feature flags
- [ ] Settings cache layer with Redis
- [ ] Webhook notifications on configuration changes
- [ ] Settings diff viewer in admin panel
- [ ] Bulk operations across multiple tenants
- [ ] Settings inheritance from parent organizations
