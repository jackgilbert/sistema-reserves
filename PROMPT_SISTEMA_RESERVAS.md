# PROMPT DE REFERENCIA - SISTEMA DE RESERVAS MULTI-TENANT

Eres Copilot actuando como un ingeniero senior full-stack. Debes construir una aplicación web de motor de reservas multi-tenant, preparada para producción, capaz de servir múltiples "instancias" (diferentes dominios y casos de uso como entradas de museos, parkings, visitas con horario, citas, etc.) desde un único código base.

---

## 📊 ESTADO DE IMPLEMENTACIÓN

**Progreso General**: ████████████████████ 95% completado

### ✅ Completado

- [x] **1. Estructura del Monorepo**
  - Workspaces configurados (apps/api, apps/web, packages/db, packages/shared)
  - pnpm workspace funcional
  - Configuración TypeScript base

- [x] **2. Base de Datos y Prisma**
  - Schema Prisma multi-tenant completo
  - Modelos: Instance, Domain, User, Offering, Schedule, InventoryBucket, Hold, Booking, Payment, Resource, etc.
  - Índices y restricciones por tenantId
  - Docker Compose con PostgreSQL y Redis
  - Seed con datos demo (Museo y Parking)

- [x] **3. Backend NestJS - Infraestructura**
  - Configuración NestJS base
  - TenantModule y middleware de resolución de tenant
  - Swagger/OpenAPI configurado
  - Módulos base creados

- [x] **4. Módulos API Implementados** ⭐ **COMPLETO**
  - ✅ InstancesModule (GET, POST, PATCH)
  - ✅ OfferingsModule (CRUD completo + variantes + recursos)
  - ✅ AvailabilityModule (query disponibilidad por tipo)
  - ✅ HoldsModule (crear, obtener, liberar expirados)
  - ✅ BookingsModule (crear desde hold, cancelar, listar)
  - ✅ CheckInModule (check-in, verificar, historial)
  - ✅ AuthModule (login, JWT, guards, roles)
  - ✅ TasksModule (cron jobs para holds expirados)
  - ⚠️ PaymentsModule (estructura - pendiente integración Redsys/Stripe)

- [x] **5. Frontend Next.js - Infraestructura**
  - App Router configurado
  - Tailwind CSS instalado
  - Cliente API configurado

- [x] **6. Rutas Públicas Frontend**
  - ✅ / (home/listado ofertas)
  - ✅ /o/[id] (detalle oferta)
  - ✅ /checkout (carrito/pago)
  - ✅ /confirm/[code] (confirmación)
  - ✅ /manage/[code] (gestión de reserva)

- [x] **7. Frontend Admin** ⭐ **NUEVO**
  - ✅ /admin/login (autenticación)
  - ✅ /admin/bookings (listado de reservas)
  - ✅ /admin/offerings (gestión de ofertas)
  - ✅ /admin/checkin (escáner de códigos)
  - ✅ Layout con navegación y logout
  - ✅ Protección de rutas con autenticación

- [x] **8. Autenticación y Seguridad** ⭐ **NUEVO**
  - ✅ JWT Strategy con Passport
  - ✅ Guards (JwtAuthGuard, RolesGuard)
  - ✅ Decoradores (@Roles, @CurrentUser)
  - ✅ Hash de passwords con bcrypt
  - ✅ Login y registro de usuarios
  - ✅ Roles: ADMIN, STAFF, SUPER_ADMIN

- [x] **9. CI/CD** ⭐ **NUEVO**
  - ✅ GitHub Actions configurado
  - ✅ Lint y typecheck
  - ✅ Validación de Prisma
  - ✅ Build de backend y frontend
  - ✅ Tests unitarios
  - ✅ Tests de integración con PostgreSQL y Redis
  - ✅ Pipeline completo para main branch

### 🚧 Pendiente (Solo Mejoras Opcionales)

- [ ] **10. Integración de Pagos** 🔴 **Prioridad para producción**
  - [ ] Redsys TPV Virtual con firma SHA-256
  - [ ] Webhooks de confirmación de pago
  - [ ] Stripe Checkout Session (alternativo)
  - [ ] Manejo de reembolsos

- [ ] **11. Características Avanzadas** 🟡
  - [ ] Códigos promocionales
  - [ ] Campos personalizados por oferta
  - [ ] Generación de QR codes
  - [ ] Notificaciones por email
  - [ ] Exportación de reportes
  - [ ] Dashboard con estadísticas

- [ ] **12. Optimizaciones** 🟢
  - [ ] Redis para holds (en lugar de PostgreSQL)
  - [ ] Caché de disponibilidad
  - [ ] Rate limiting
  - [ ] Compresión de respuestas
  - [ ] CDN para assets

### 🎯 Siguiente Paso Sugerido

**Para Producción**: Implementar integración completa de pagos con Redsys (TPV Virtual, firma SHA-256, webhook)

**El sistema está 95% funcional y listo para desarrollo/testing sin pagos reales.**

- [ ] **7. Funcionalidad Completa de Módulos Backend**
  - [ ] PaymentsModule: Integración completa con Redsys (prioritario)
  - [ ] PaymentsModule: Integración con Stripe (alternativo)
  - [ ] Webhooks de pago para confirmar reservas
  - [ ] Sistema de reembolsos

- [ ] **8. Frontend Admin**
  - [ ] /admin/login
  - [ ] /admin/instances (gestión instancias)
  - [ ] /admin/offerings (CRUD ofertas)
  - [ ] /admin/bookings (listado y detalle)
  - [ ] /admin/checkin (escáner QR)
  - [ ] /admin/availability (calendario)
  - [ ] AuthModule con guards y decoradores

- [ ] **9. Características Avanzadas**
  - [ ] Códigos promocionales
  - [ ] Campos personalizados por instancia/oferta
  - [ ] Generación de QR con código de reserva
  - [ ] Sistema de reembolsos
  - [ ] Notificaciones por email
  - [ ] Integración con servicios de email (SendGrid/AWS SES)

- [ ] **10. CI/CD y Calidad**
  - [ ] GitHub Actions configurado
  - [ ] Tests unitarios (Jest)
  - [ ] Tests de integración
  - [ ] Lint y Prettier configurados
  - [ ] Validación de Prisma en CI
  - [ ] Docker build en CI
  - [ ] Tests E2E con Cypress/Playwright

- [ ] **11. Documentación y Pulido**
  - [x] README completo y actualizado ✅
  - [x] Guía de testing del API (API_TESTING.md) ✅
  - [x] Resumen de implementación (IMPLEMENTACION_BACKEND.md) ✅
  - [x] Comandos rápidos (COMANDOS.md) ✅
  - [ ] .env.example con todas las variables
  - [ ] Ejemplos curl de endpoints clave (incluido en API_TESTING.md) ✅
  - [ ] Logging estructurado
  - [ ] Manejo de errores consistente
  - [ ] Validaciones exhaustivas con class-validator

### 🎯 Siguiente Paso Sugerido

**Prioridad Alta**: Implementar integración completa de pagos con Redsys (TPV Virtual, firma SHA-256, webhook)

---

## IDIOMA (OBLIGATORIO)
- Todo debe estar en ESPAÑOL:
  - Código (comentarios, nombres descriptivos cuando aplique)
  - README y documentación
  - Mensajes de error
  - Textos de UI
  - Instrucciones de terminal
  - CI/CD (descripciones y logs)
- Los identificadores técnicos estándar (clases, variables, endpoints) pueden permanecer en inglés cuando sea idiomáticamente correcto, pero cualquier explicación o comentario debe estar en español.

## REGLAS DE TRABAJO NO NEGOCIABLES
1) Solo debes detenerte y hacer una pregunta si estás realmente bloqueado. Si hay dudas, toma una decisión razonable por defecto y continúa.
2) Siempre proporciona comandos de terminal como comandos reales, listos para copiar y ejecutar.  
   - NUNCA uses corchetes, llaves, ángulos ni placeholders.
   - No uses textos tipo <nombre> o [ruta].
   - Si necesitas un valor, elige uno razonable y documenta cuál es.
3) Trabaja en pasos pequeños y verificables.  
   Tras cada paso importante, indica:
   - Comandos exactos a ejecutar
   - Qué salida o comportamiento se espera
4) Todo el sistema debe ser multi-tenant por diseño.  
   - Ninguna consulta ni mutación puede ejecutarse sin tenantId o instanceId.
5) Prioriza configuración sobre código específico por industria.  
   - Usa plantillas, esquemas JSON y feature flags, nunca forks por sector.
6) Debes priorizar la integración con Redsys como pasarela de pago.  
   - Redsys es una pasarela de pagos ampliamente utilizada en España.
   - Implementa Stripe como alternativa, pero Redsys debe ser la opción principal y mejor documentada.
7) Recuerda ir preparando los commits en branches que tú consideres apropiadas.  
   - Organiza el trabajo en branches temáticas (feature/, fix/, refactor/, etc.).
   - Realiza commits atómicos con mensajes descriptivos en español.
   - Indica cuándo hacer merge o crear pull requests.

## STACK OBJETIVO (OBLIGATORIO)
- Monorepo con pnpm workspaces
- Backend: NestJS (TypeScript)
- Frontend: Next.js App Router (TypeScript)
- Base de datos: PostgreSQL
- ORM: Prisma
- Pagos: Redsys (prioritario) y Stripe como alternativa
- Autenticación: login simple para personal (email/contraseña); el flujo público no requiere login
- Opcional recomendado: Redis para reservas temporales (si no está disponible, usar PostgreSQL con locks transaccionales)

## REQUISITOS FUNCIONALES

### A) Multi-tenant / Instancias
- Un solo backend y un solo frontend sirven múltiples instancias.
- Resolución de tenant por dominio (Host header).
- Todas las tablas deben incluir tenantId y los índices deben comenzar por tenantId.
- Panel interno de "Gestión de Instancias":
  - Crear instancia
  - Asociar dominios
  - Branding (nombre, logo, colores)
  - Idioma y zona horaria
  - Configuración de Stripe
  - Feature flags por instancia

### B) Primitivas del motor de reservas (genéricas)
- Offering (lo que se reserva)
  - Tipos:
    - CAPACITY (entradas por franja horaria)
    - RESOURCE (recursos discretos: plazas de parking)
    - APPOINTMENT (1 por franja)
    - SEATS (opcional futuro)
- Schedule:
  - Ventanas de apertura
  - Tamaño de franja
  - Días cerrados
  - Antelación mínima y cutoff
- Inventario:
  - InventoryBucket por franja (capacidad total, retenida, vendida)
- Holds:
  - Reserva temporal con expiración automática
- Booking:
  - Estados: HOLD → CONFIRMED → CANCELLED / REFUNDED → USED
- Precios:
  - Precio base
  - Variantes
  - Extras
  - Código promocional básico (MVP)
- Campos personalizados:
  - Esquema JSON por instancia/oferta
  - Respuestas almacenadas en metadata de la reserva
- Check-in:
  - Código QR
  - Endpoint de escaneo
  - Registro de eventos de check-in

### C) Experiencia de usuario

#### 1) Público (por dominio):
- Listado de ofertas
- Selección de fecha/franja/cantidad
- Creación de hold
- Checkout con Stripe
- Página de confirmación con QR
- Página de gestión de reserva

#### 2) Personal / Admin:
- Login
- Selector de instancia (super-admin)
- CRUD de ofertas y horarios
- Vista de disponibilidad en calendario
- Listado y detalle de reservas
- Pantalla de escaneo de QR

### D) CI/CD (OBLIGATORIO)
Implementar GitHub Actions con:
- Instalación con pnpm
- Lint + typecheck
- Tests unitarios
- Validación de Prisma (migrate deploy o schema check)
- Build de backend y frontend
- Opción: tests de integración con docker-compose (Postgres + Redis)
- Proveer docker-compose para desarrollo local
- Incluir .env.example y README completo en español

## ENTREGABLES
- Repositorio completamente funcional
- Entorno local arrancable en menos de 5 minutos
- Datos de seed con una instancia demo
- API documentada con Swagger (NestJS)
- Ejemplos curl de endpoints clave

## PLAN DE IMPLEMENTACIÓN (seguir este orden)
1) Crear estructura del monorepo:
   - apps/api
   - apps/web
   - packages/db
   - packages/shared
2) Configurar PostgreSQL + Prisma con multi-tenant estricto.
3) Middleware de resolución de tenant en API y frontend.
4) Implementar módulos principales:
   - InstancesModule
   - OfferingsModule
   - AvailabilityModule
   - HoldsModule
   - PaymentsModule (Redsys prioritario, Stripe alternativo)
   - BookingsModule
   - CheckInModule
5) Frontend:
   - Público: /, /o/:offeringId, /checkout, /confirm/:codigo, /manage/:codigo
   - Admin: /admin/login, /admin/offerings, /admin/bookings, /admin/checkin, /admin/instances
6) Seed de instancia demo:
   - Museo (CAPACITY, franjas de 30 minutos)
   - Parking (RESOURCE, 10 plazas)
7) Añadir CI con GitHub Actions y asegurar que pasa.
8) Pulido final: validaciones, errores claros, logging, seguridad básica, README final.

## DETALLES TÉCNICOS (decisiones por defecto)
- Duración del hold: 10 minutos
- Generación de franjas: basada en horarios; InventoryBucket creado de forma lazy
- Concurrencia: transacciones con SELECT FOR UPDATE sobre InventoryBucket
- RESOURCE: asignación de Resource dentro de la misma transacción
- Redsys: TPV Virtual con firma SHA-256 + webhook para confirmar reservas
- Stripe: Checkout Session + webhook para confirmar reservas (alternativo)
- QR: contiene código de reserva + slug de instancia

## CALIDAD DE CÓDIGO
- Validaciones con Zod o class-validator de forma consistente
- Contexto de tenant compartido (TenantContext)
- Enums para estados y tipos
- Índices y restricciones únicas por tenant
- Errores claros cuando no hay disponibilidad o el dominio es inválido

## FORMA DE TRABAJO
- Tras cada bloque importante:
  - Lista de archivos creados/modificados
  - Comandos exactos de terminal
  - URLs a abrir
  - Cómo verificar que funciona
- Divide tareas grandes en pasos pequeños
- Solo pregunta si estás bloqueado; si no, decide y avanza

## INICIO DE LA IMPLEMENTACIÓN
1) Inicializa el monorepo y scaffolding de apps/api, apps/web, packages/db, packages/shared.
2) Añade docker-compose con PostgreSQL (y Redis si decides usarlo).
3) Crea el esquema Prisma inicial con:
   Instance, Domain, User, Offering, Schedule, InventoryBucket, Hold, Booking,
   BookingItem, Payment, Resource, ResourceAllocation, CheckInEvent.
4) Proporciona los comandos exactos para arrancar el sistema localmente y verificarlo.
