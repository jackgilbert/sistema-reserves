# 🧪 Guía de Testing del API

## Servicios Necesarios

Asegúrate de que los siguientes servicios estén corriendo:

```bash
# PostgreSQL y Redis
docker-compose up -d

# Backend API
cd apps/api
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
export JWT_SECRET="tu-secreto-jwt-super-seguro"
export PORT=3001
pnpm dev
```

## Documentación Swagger

Una vez que el API esté corriendo, visita:
**http://localhost:3001/api/docs**

## Ejemplos de Tests con curl

### Redsys (merchantURL notify)

Redsys envía la notificación (merchantURL) como `application/x-www-form-urlencoded` al endpoint:

- Backend directo: `POST http://localhost:3001/payments/redsys/notify`
- Vía Next proxy (recomendado si estás probando el flujo web): `POST http://localhost:3000/api/payments/redsys/notify`

Para re-jugar (replay) una notificación capturada (por ejemplo de logs o del panel de Redsys), usa el helper:

```bash
TENANT_DOMAIN=localhost \
TARGET_URL=http://localhost:3000/api/payments/redsys/notify \
bash scripts/redsys-replay-notify.sh \
  '<Ds_MerchantParameters_base64>' \
  '<Ds_Signature_base64>' \
  'HMAC_SHA256_V1'
```

Nota: en algunos entornos, por el encoding `x-www-form-urlencoded`, la firma base64 puede llegar con espacios en vez de `+`. El backend ya normaliza esto.

### 1. Instancias

#### Listar instancias
```bash
curl -X GET http://localhost:3001/instances \
  -H "x-tenant-domain: localhost"
```

#### Obtener una instancia
```bash
curl -X GET http://localhost:3001/instances/{id} \
  -H "x-tenant-domain: localhost"
```

### 2. Ofertas (Offerings)

#### Listar ofertas activas
```bash
curl -X GET "http://localhost:3001/offerings?activeOnly=true" \
  -H "x-tenant-domain: localhost"
```

#### Obtener detalle de una oferta
```bash
curl -X GET http://localhost:3001/offerings/{offeringId} \
  -H "x-tenant-domain: localhost"
```

#### Crear una nueva oferta
```bash
curl -X POST http://localhost:3001/offerings \
  -H "Content-Type: application/json" \
  -H "x-tenant-domain: localhost" \
  -d '{
    "name": "Tour Guiado",
    "description": "Tour guiado por el museo",
    "type": "CAPACITY",
    "basePrice": 1500,
    "capacity": 20,
    "schedule": {
      "daysOfWeek": [1,2,3,4,5],
      "startTime": "09:00",
      "endTime": "17:00",
      "slotDuration": 60
    },
    "variants": [
      {
        "name": "Adulto",
        "price": 1500
      },
      {
        "name": "Niño",
        "price": 800
      }
    ]
  }'
```

### 3. Disponibilidad (Availability)

#### Consultar disponibilidad
```bash
curl -X GET "http://localhost:3001/availability?offeringId={offeringId}&startDate=2025-01-15&endDate=2025-01-20&quantity=2" \
  -H "x-tenant-domain: localhost"
```

### 4. Holds (Reservas Temporales)

#### Crear un hold
```bash
curl -X POST http://localhost:3001/holds \
  -H "Content-Type: application/json" \
  -H "x-tenant-domain: localhost" \
  -d '{
    "offeringId": "{offeringId}",
    "slot": "2025-01-15T10:00:00.000Z",
    "quantity": 2
  }'
```

Respuesta esperada:
```json
{
  "id": "hold_xxx",
  "offeringId": "...",
  "slot": "2025-01-15T10:00:00.000Z",
  "quantity": 2,
  "expiresAt": "2025-01-15T10:10:00.000Z",
  "price": 2400
}
```

#### Obtener un hold
```bash
curl -X GET http://localhost:3001/holds/{holdId} \
  -H "x-tenant-domain: localhost"
```

### 5. Bookings (Reservas Confirmadas)

#### Crear booking desde un hold
```bash
curl -X POST http://localhost:3001/bookings \
  -H "Content-Type: application/json" \
  -H "x-tenant-domain: localhost" \
  -d '{
    "holdId": "{holdId}",
    "email": "cliente@example.com",
    "name": "Juan Pérez",
    "phone": "+34612345678"
  }'
```

Respuesta esperada:
```json
{
  "id": "booking_xxx",
  "code": "ABC12345",
  "status": "PENDING_PAYMENT",
  "email": "cliente@example.com",
  "name": "Juan Pérez",
  "phone": "+34612345678",
  "totalAmount": 2400,
  "offering": {
    "id": "...",
    "name": "Entrada General"
  },
  "slot": "2025-01-15T10:00:00.000Z",
  "quantity": 2,
  "createdAt": "2025-01-10T15:30:00.000Z"
}
```

#### Obtener booking por código
```bash
curl -X GET http://localhost:3001/bookings/code/ABC12345 \
  -H "x-tenant-domain: localhost"
```

#### Listar todos los bookings
```bash
curl -X GET http://localhost:3001/bookings \
  -H "x-tenant-domain: localhost"
```

#### Cancelar un booking
```bash
curl -X PATCH http://localhost:3001/bookings/code/ABC12345/cancel \
  -H "x-tenant-domain: localhost"
```

### 6. Check-In

#### Realizar check-in
```bash
curl -X POST http://localhost:3001/checkin \
  -H "Content-Type: application/json" \
  -H "x-tenant-domain: localhost" \
  -d '{
    "code": "ABC12345"
  }'
```

Respuesta esperada:
```json
{
  "bookingId": "...",
  "code": "ABC12345",
  "name": "Juan Pérez",
  "email": "cliente@example.com",
  "offering": "Entrada General",
  "slot": "2025-01-15T10:00:00.000Z",
  "quantity": 2,
  "status": "USED",
  "checkedInAt": "2025-01-15T09:55:00.000Z",
  "previousCheckIns": 0
}
```

#### Verificar booking sin hacer check-in
```bash
curl -X GET http://localhost:3001/checkin/verify/ABC12345 \
  -H "x-tenant-domain: localhost"
```

#### Ver historial de check-ins del día
```bash
curl -X GET "http://localhost:3001/checkin/history?date=2025-01-15" \
  -H "x-tenant-domain: localhost"
```

## Flujo Completo de Reserva

### Paso 1: Buscar ofertas disponibles
```bash
curl -X GET http://localhost:3001/offerings \
  -H "x-tenant-domain: localhost"
```

### Paso 2: Ver disponibilidad de una oferta
```bash
curl -X GET "http://localhost:3001/availability?offeringId={offeringId}&startDate=2025-01-15&endDate=2025-01-15&quantity=2" \
  -H "x-tenant-domain: localhost"
```

### Paso 3: Crear hold temporal
```bash
curl -X POST http://localhost:3001/holds \
  -H "Content-Type: application/json" \
  -H "x-tenant-domain: localhost" \
  -d '{
    "offeringId": "{offeringId}",
    "slot": "2025-01-15T10:00:00.000Z",
    "quantity": 2
  }'
```

### Paso 4: Crear booking (en producción, tras pago exitoso)
```bash
curl -X POST http://localhost:3001/bookings \
  -H "Content-Type: application/json" \
  -H "x-tenant-domain: localhost" \
  -d '{
    "holdId": "{holdId}",
    "email": "cliente@example.com",
    "name": "Juan Pérez",
    "phone": "+34612345678"
  }'
```

### Paso 5: Check-in el día de la visita
```bash
curl -X POST http://localhost:3001/checkin \
  -H "Content-Type: application/json" \
  -H "x-tenant-domain: localhost" \
  -d '{
    "code": "ABC12345"
  }'
```

## Testing con diferentes tenants

### Museo (localhost)
```bash
-H "x-tenant-domain: localhost"
```

### Parking (parking.localhost - requiere configuración DNS/hosts)
```bash
-H "x-tenant-domain: parking.localhost"
```

## Códigos de Estado HTTP

- `200 OK`: Operación exitosa
- `201 Created`: Recurso creado exitosamente
- `400 Bad Request`: Datos inválidos
- `404 Not Found`: Recurso no encontrado
- `409 Conflict`: Conflicto (ej: no hay disponibilidad)
- `500 Internal Server Error`: Error del servidor

## Notas Importantes

1. **Holds expiran en 10 minutos**: Después de crear un hold, tienes 10 minutos para convertirlo en booking.

2. **Multi-tenant**: Todas las peticiones requieren el header `x-tenant-domain` para identificar la instancia.

3. **Transacciones**: Las operaciones de hold y booking usan transacciones para garantizar consistencia.

4. **Estados de Booking**:
   - `PENDING_PAYMENT`: Recién creado, esperando pago
   - `CONFIRMED`: Pago confirmado
   - `CANCELLED`: Cancelado por el usuario
   - `USED`: Ya utilizado (check-in realizado)
   - `REFUNDED`: Reembolsado

5. **IDs de ejemplo**: Usa el seed data para obtener IDs reales de ofertas en tu base de datos local.
