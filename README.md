# Sistema de Reservas Multi-Tenant

Sistema completo de motor de reservas multi-tenant construido con NestJS, Next.js, Prisma y PostgreSQL.

## 🚀 Stack Tecnológico

- **Backend**: NestJS (TypeScript)
- **Frontend**: Next.js 14 App Router (TypeScript)
- **Base de datos**: PostgreSQL 16
- **ORM**: Prisma
- **Cache**: Redis
- **Pagos**: Stripe
- **Monorepo**: pnpm workspaces

## 📁 Estructura del Proyecto

```
sistema-reservas/
├── apps/
│   ├── api/          # Backend NestJS
│   └── web/          # Frontend Next.js
├── packages/
│   ├── db/           # Prisma schema y cliente
│   └── shared/       # Tipos y validadores compartidos
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## 🛠️ Configuración Inicial

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno

El archivo `.env` ya está creado en la raíz del proyecto. Verifica y modifica según necesites:

```bash
cat .env
```

### 3. Iniciar servicios de desarrollo

```bash
docker-compose up -d
```

Esto iniciará PostgreSQL y Redis en segundo plano.

### 4. Inicializar base de datos

```bash
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
cd packages/db
pnpm db:push
pnpm db:seed
```

### 5. Iniciar aplicaciones

**Backend (Terminal 1)**:
```bash
cd apps/api
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
export JWT_SECRET="tu-secreto-jwt-super-seguro"
export PORT=3001
pnpm dev
```

**Frontend (Terminal 2)**:
```bash
cd apps/web
export NEXT_PUBLIC_API_URL=http://localhost:3001
pnpm dev
```

> 💡 **Tip**: Ver [INICIO_RAPIDO.md](INICIO_RAPIDO.md) para instrucciones detalladas y comandos completos.

## 🌐 URLs de Desarrollo

- **Frontend Público**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin/login
- **API**: http://localhost:3001
- **Documentación API (Swagger)**: http://localhost:3001/api/docs
- **Prisma Studio**: `pnpm --filter @sistema-reservas/db db:studio`

## 🔐 Credenciales Demo

### Admin Museo
- Email: `admin@museo.com`
- Password: `admin123`
- Role: ADMIN

### Staff Museo
- Email: `staff@museo.com`
- Password: `staff123`
- Role: STAFF

## 🔑 Características Principales

### Multi-Tenant
- Un único código base sirve múltiples instancias
- Resolución de tenant por dominio
- Aislamiento estricto de datos por tenant
- Panel de gestión de instancias

### Motor de Reservas
- **CAPACITY**: Entradas por franja horaria (ej: museos)
- **RESOURCE**: Recursos discretos (ej: plazas de parking)
- **APPOINTMENT**: Citas individuales
- **SEATS**: Asientos numerados

### Flujo Completo Implementado
1. ✅ Consulta de disponibilidad
2. ✅ Creación de hold temporal (10 min)
3. ✅ Conversión a booking
4. ✅ Gestión de pagos (estructura lista)
5. ✅ Check-in con código QR
6. ✅ Panel de administración completo

### Autenticación y Seguridad
- JWT con Passport.js
- Roles: ADMIN, STAFF, SUPER_ADMIN
- Guards reutilizables
- Hash de passwords con bcrypt
- Protección de rutas frontend y backend

### Admin Panel
- 🔐 Login seguro
- 📋 Gestión de reservas
- 🎫 CRUD de ofertas
- ✅ Check-in/escáner de códigos
- 📊 Listados y filtros

### CI/CD
- GitHub Actions configurado
- Tests automáticos
- Build y validación
- Integration tests con PostgreSQL/Redis
- **SEATS**: Asientos específicos (futuro)

### Flujo de Reserva
1. Selección de oferta, fecha y franja horaria
2. Creación de hold temporal (10 minutos)
3. Checkout con Stripe
4. Confirmación automática vía webhook
5. Código QR para check-in

### Gestión de Inventario
- Buckets de inventario por franja horaria
- Control de concurrencia con locks transaccionales
- Liberación automática de holds expirados
- Capacidad configurable por día

## 📝 Comandos Útiles

### Desarrollo

```bash
# Instalar dependencias
pnpm install

# Desarrollo (todas las apps)
pnpm dev

# Build
pnpm build

# Linting
pnpm lint

# Type checking
pnpm typecheck

# Tests
pnpm test
```

### Base de Datos

```bash
# Generar cliente Prisma
pnpm --filter @sistema-reservas/db db:generate

# Push schema (desarrollo)
pnpm --filter @sistema-reservas/db db:push

# Crear migración
pnpm --filter @sistema-reservas/db db:migrate

# Deploy migraciones
pnpm --filter @sistema-reservas/db db:migrate:deploy

# Seed datos
pnpm --filter @sistema-reservas/db db:seed

# Prisma Studio
pnpm --filter @sistema-reservas/db db:studio
```

### Docker

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Detener y limpiar volúmenes
docker-compose down -v
```

## 🏗️ Arquitectura

### Backend (NestJS)

Módulos principales:
- **TenantModule**: Resolución y contexto de tenant
- **InstancesModule**: Gestión de instancias
- **AuthModule**: Autenticación de personal
- **OfferingsModule**: CRUD de ofertas
- **AvailabilityModule**: Cálculo de disponibilidad
- **HoldsModule**: Reservas temporales
- **BookingsModule**: Reservas confirmadas
- **PaymentsModule**: Integración con Stripe
- **CheckInModule**: Escaneo de QR y check-in

### Frontend (Next.js)

#### Rutas Públicas
- `/` - Listado de ofertas
- `/o/[slug]` - Detalle de oferta y selección
- `/checkout` - Proceso de pago
- `/confirm/[code]` - Confirmación con QR
- `/manage/[code]` - Gestión de reserva

#### Rutas Admin
- `/admin/login` - Login de personal
- `/admin/instances` - Gestión de instancias
- `/admin/offerings` - CRUD de ofertas
- `/admin/bookings` - Listado de reservas
- `/admin/checkin` - Escaneo de QR

## 🔐 Seguridad

- Validación de datos con class-validator/Zod
- JWT para autenticación
- Aislamiento estricto por tenant
- Sanitización de inputs
- Rate limiting (a implementar)
- CORS configurado

## 🧪 Testing

```bash
# Tests unitarios
pnpm test

# Tests con coverage
pnpm test:cov

# Tests en modo watch
pnpm test:watch
```

## 📦 CI/CD

GitHub Actions configurado con:
- Instalación con pnpm
- Lint y typecheck
- Tests unitarios
- Validación de schema Prisma
- Build de apps
- Tests de integración con Docker

## 🗃️ Modelo de Datos

### Entidades Principales

- **Instance**: Instancia/tenant
- **Domain**: Dominios asociados
- **User**: Usuarios del sistema (staff/admin)
- **Offering**: Ofertas/servicios reservables
- **Schedule**: Horarios y configuración
- **InventoryBucket**: Control de disponibilidad por franja
- **Hold**: Reservas temporales
- **Booking**: Reservas confirmadas
- **Payment**: Pagos
- **Resource**: Recursos físicos (RESOURCE type)
- **CheckInEvent**: Eventos de check-in

## 🤝 Contribución

1. Fork el repositorio
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## 📄 Licencia

MIT

## 🆘 Soporte

Para preguntas o problemas, abre un issue en GitHub.
Simple booking engine web app
