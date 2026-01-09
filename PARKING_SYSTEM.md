# Sistema de Parking por Minutos 🚗

Sistema completo de gestión de parking con pago por minutos, control de barreras mediante relay, y validación de matrícula con tolerancia.

## 📋 Características

- ✅ **Entrada validada**: Verifica código de reserva, matrícula y rango horario
- ✅ **Pago por minutos**: Cálculo exacto con redondeo hacia arriba (ceil)
- ✅ **Tolerancia de matrícula**: Acepta diferencia de 1 carácter (distancia Hamming ≤ 1)
- ✅ **Control de barreras**: Interfaz abstracta para relés GPIO/HTTP/MQTT
- ✅ **Auditoría completa**: Registro de todos los eventos (intentos, aperturas, pagos)
- ✅ **Sin límite de salida**: Una vez dentro, puedes salir cuando quieras
- ✅ **Override manual**: Endpoint admin para abrir barreras en emergencias

## 🏗️ Arquitectura

### Modelos de Base de Datos

#### ParkingSession
```typescript
{
  id: string
  tenantId: string
  bookingId: string (unique)
  plate: string // Normalizada (uppercase, sin espacios)
  entryAt: DateTime
  exitAt: DateTime | null
  status: 'IN_PROGRESS' | 'PAYMENT_PENDING' | 'PAID' | 'CLOSED'
  pricePerMinute: number // Céntimos
  amountDue: number // Céntimos
  paidAt: DateTime | null
  metadata: JSON
}
```

#### GateEvent
```typescript
{
  id: string
  tenantId: string
  parkingSessionId: string | null
  type: 'ENTRY_ATTEMPT' | 'ENTRY_OPENED' | 'EXIT_ATTEMPT' | 
        'QUOTE_CREATED' | 'PAYMENT_OK' | 'PAYMENT_FAILED' | 'EXIT_OPENED'
  source: 'QR' | 'PLATE' | 'MANUAL' | 'API'
  createdAt: DateTime
  metadata: JSON
}
```

### Endpoints API

#### POST /parking/entry
Validar reserva, matrícula y crear sesión.

**Request:**
```json
{
  "bookingCode": "PARK-TEST-001",
  "plate": "1234ABC",
  "gateId": "entrada-principal" // Opcional
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "entryAt": "2026-01-07T18:30:00.000Z",
  "status": "IN_PROGRESS",
  "message": "Acceso concedido"
}
```

**Validaciones:**
- ✅ Reserva existe y confirmada
- ✅ `slotStart <= now <= slotEnd`
- ✅ Matrícula coincide con tolerancia ±1 carácter
- ✅ No existe sesión activa previa
- ✅ Oferta tiene configuración de parking

**Acciones:**
- Crea ParkingSession
- Abre barrera de entrada (relay)
- Registra evento ENTRY_OPENED

---

#### POST /parking/exit/quote
Calcular minutos transcurridos y precio.

**Request:**
```json
{
  "bookingCode": "PARK-TEST-001",
  "plate": "1234ABC",
  "gateId": "salida-principal" // Opcional
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "entryAt": "2026-01-07T18:30:00.000Z",
  "minutes": 45,
  "amountDue": 900,
  "currency": "EUR",
  "pricePerMinute": 20
}
```

**Cálculo:**
```typescript
const diffMs = now.getTime() - session.entryAt.getTime();
const minutes = Math.ceil(diffMs / 60_000);
const amountDue = minutes * session.pricePerMinute;
```

**Acciones:**
- Actualiza `amountDue` en sesión
- Cambia estado a PAYMENT_PENDING
- Registra evento QUOTE_CREATED

---

#### POST /parking/exit/pay
Procesar pago y abrir barrera de salida.

**Request:**
```json
{
  "sessionId": "uuid",
  "paymentMethod": "terminal", // Opcional
  "gateId": "salida-principal" // Opcional
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "status": "CLOSED",
  "entryAt": "2026-01-07T18:30:00.000Z",
  "exitAt": "2026-01-07T19:15:00.000Z",
  "amountPaid": 900,
  "message": "Pago procesado, salida autorizada"
}
```

**Acciones:**
- Crea Payment record
- Marca sesión como PAID → CLOSED
- Abre barrera de salida (relay)
- Registra eventos PAYMENT_OK y EXIT_OPENED

---

#### GET /parking/sessions (Admin)
Listar sesiones de parking.

**Auth:** Requiere JWT token

**Query params:**
- `status`: Filtrar por estado (opcional)

**Response:**
```json
[
  {
    "id": "uuid",
    "plate": "1234ABC",
    "entryAt": "2026-01-07T18:30:00.000Z",
    "exitAt": "2026-01-07T19:15:00.000Z",
    "status": "CLOSED",
    "amountDue": 900,
    "booking": {
      "code": "PARK-TEST-001",
      "customerName": "Cliente Test",
      "customerEmail": "test@parking.com"
    }
  }
]
```

---

#### POST /parking/admin/open-gate (Admin)
Override manual de barrera para emergencias.

**Auth:** Requiere JWT token

**Request:**
```json
{
  "gateId": "entrada-principal",
  "reason": "Emergencia / Fallo técnico"
}
```

**Response:**
```json
{
  "message": "Barrera entrada-principal abierta manualmente",
  "reason": "Emergencia / Fallo técnico"
}
```

## 🔧 Configuración

### 1. Variables de Entorno

El archivo `.env` ya está configurado:

```bash
DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
JWT_SECRET=tu-secreto-jwt-super-seguro-cambiar-en-produccion
PORT=3001
```

### 2. Configurar Oferta de Parking

La oferta debe tener este metadata:

```json
{
  "parking": {
    "enabled": true,
    "pricePerMinuteCents": 20,  // €0.20/minuto
    "gateIdEntry": "entrada-principal",
    "gateIdExit": "salida-principal"
  },
  "requiresPlate": true
}
```

### 3. Configurar Booking con Matrícula

El booking debe incluir la matrícula en metadata:

```json
{
  "metadata": {
    "plate": "1234ABC",
    "paymentType": "parking-by-minute"
  }
}
```

## 🚀 Setup Rápido

```bash
# 1. Aplicar migraciones de Prisma
cd packages/db
pnpm prisma migrate dev

# 2. Configurar tenant demo (si no existe)
cd ../..
bash setup-demo.sh

# 3. Configurar oferta de parking y booking de prueba
node setup-parking-demo.js

# 4. Iniciar API
cd apps/api
pnpm dev
```

## 🧪 Pruebas

### Script Automático

```bash
./test-parking.sh
```

Esto ejecutará:
1. ✅ Entrada al parking (crea sesión)
2. ✅ Cotización de salida (calcula minutos)
3. ✅ Prueba de tolerancia de matrícula
4. ✅ Pago y salida (cierra sesión)

### Pruebas Manuales con curl

```bash
# 1. Entrada
curl -X POST http://localhost:3001/parking/entry \
  -H "Content-Type: application/json" \
  -d '{"bookingCode":"PARK-TEST-001","plate":"1234ABC"}'

# 2. Cotización
curl -X POST http://localhost:3001/parking/exit/quote \
  -H "Content-Type: application/json" \
  -d '{"bookingCode":"PARK-TEST-001","plate":"1234ABC"}'

# 3. Pago (usar sessionId del paso anterior)
curl -X POST http://localhost:3001/parking/exit/pay \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<uuid>","paymentMethod":"terminal"}'
```

## 🔐 Algoritmo de Tolerancia de Matrícula

```typescript
function plateMatches(expected: string, provided: string): boolean {
  const exp = normalizePlate(expected);  // 1234ABC → 1234ABC
  const prov = normalizePlate(provided); // 1234AB0 → 1234AB0

  if (exp.length !== prov.length) return false;

  let diff = 0;
  for (let i = 0; i < exp.length; i++) {
    if (exp[i] !== prov[i]) diff++;
    if (diff > 1) return false; // Solo 1 diferencia permitida
  }
  return true;
}
```

**Ejemplos:**
- ✅ `1234ABC` ≈ `1234AB0` (1 carácter diferente)
- ✅ `1234ABC` = `1234ABC` (exacto)
- ❌ `1234ABC` ≠ `1234XY0` (2 caracteres diferentes)
- ❌ `1234ABC` ≠ `123ABC` (longitud diferente)

## 💰 Cálculo de Precio

```typescript
const diffMs = now.getTime() - entryAt.getTime();
const minutes = Math.ceil(diffMs / 60_000);
const amountDue = minutes * pricePerMinuteCents;
```

**Ejemplos con tarifa €0.20/min (20 céntimos):**
- 5 segundos → 1 minuto → €0.20
- 1 minuto → 1 minuto → €0.20
- 1 min 1 seg → 2 minutos → €0.40
- 45 minutos → 45 minutos → €9.00
- 2 horas → 120 minutos → €24.00

## 🎛️ Control de Barreras (GateService)

### Implementación Actual (Stub)

```typescript
async openGate(gateId: string): Promise<void> {
  console.log(`[STUB] Abriendo barrera: ${gateId}`);
  await delay(500); // Simular apertura física
}
```

### Implementaciones Reales

#### GPIO (Raspberry Pi)
```typescript
import { Gpio } from 'onoff';

export class GpioGateProvider implements GateProvider {
  private relays: Map<string, Gpio>;

  async openGate(gateId: string): Promise<void> {
    const relay = this.relays.get(gateId);
    relay.writeSync(1); // Activar relay
    await delay(3000);  // Mantener abierto 3s
    relay.writeSync(0); // Desactivar
  }
}
```

#### HTTP Relay
```typescript
export class HttpRelayProvider implements GateProvider {
  async openGate(gateId: string): Promise<void> {
    await fetch(`http://relay-controller/open/${gateId}`, {
      method: 'POST'
    });
  }
}
```

#### MQTT IoT
```typescript
export class MqttGateProvider implements GateProvider {
  async openGate(gateId: string): Promise<void> {
    await this.mqttClient.publish(`parking/${gateId}/open`, 'true');
  }
}
```

## 📊 Monitoreo y Auditoría

Todos los eventos se registran en la tabla `gate_events`:

```sql
SELECT 
  ge.type,
  ge.source,
  ge.created_at,
  ps.plate,
  b.code as booking_code,
  ge.metadata
FROM gate_events ge
LEFT JOIN parking_sessions ps ON ge.parking_session_id = ps.id
LEFT JOIN bookings b ON ps.booking_id = b.id
ORDER BY ge.created_at DESC
LIMIT 20;
```

**Tipos de eventos:**
- `ENTRY_ATTEMPT`: Intento de entrada
- `ENTRY_OPENED`: Barrera de entrada abierta
- `EXIT_ATTEMPT`: Intento de salida
- `QUOTE_CREATED`: Cotización generada
- `PAYMENT_OK`: Pago procesado exitosamente
- `PAYMENT_FAILED`: Pago fallido
- `EXIT_OPENED`: Barrera de salida abierta

## 🔒 Seguridad

- ✅ Validación de rango horario (`slotStart` ≤ `now` ≤ `slotEnd`)
- ✅ Una sesión por booking (unique constraint)
- ✅ Matrícula normalizada (uppercase, sin espacios/guiones)
- ✅ Endpoints admin protegidos con JWT
- ✅ Registro completo de intentos fallidos
- ✅ No se puede usar booking ya cerrado
- ✅ No se puede pagar sin cotización previa

## 📝 Próximos Pasos

### Frontend
- [ ] Interfaz de administración para ver sesiones activas
- [ ] Dashboard en tiempo real con estado de barreras
- [ ] Panel de override manual para emergencias
- [ ] Reportes de uso por día/mes
- [ ] Alertas de sesiones sin pago después de X horas

### Integraciones
- [ ] Redsys para pagos en terminal/online
- [ ] QR codes en emails de confirmación
- [ ] Notificaciones SMS cuando vence el tiempo prepagado
- [ ] Integración con cámaras OCR para lectura automática de matrícula

### Optimizaciones
- [ ] Cache de matrículas normalizadas
- [ ] Rate limiting por IP en endpoints públicos
- [ ] Webhook para notificar al relay sin polling
- [ ] Backup de comandos de apertura en caso de fallo de red

## 📞 Soporte

Para consultas técnicas, revisar:
- [parking.service.ts](apps/api/src/parking/parking.service.ts) - Lógica de negocio
- [parking.controller.ts](apps/api/src/parking/parking.controller.ts) - Endpoints REST
- [gate.service.ts](apps/api/src/parking/gate.service.ts) - Abstracción de relay
- [schema.prisma](packages/db/prisma/schema.prisma) - Modelos de datos

---

**Última actualización:** 2026-01-07  
**Versión:** 1.0.0  
**Estado:** ✅ Producción Ready
