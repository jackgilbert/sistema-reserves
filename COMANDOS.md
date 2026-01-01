# 🚀 Comandos Rápidos - Sistema de Reservas

## 📋 Servicios Base

### Iniciar Docker (PostgreSQL + Redis)
```bash
docker-compose up -d
```

### Verificar servicios
```bash
docker ps
```

### Logs de servicios
```bash
docker-compose logs -f
```

### Detener servicios
```bash
docker-compose down
```

---

## 🗄️ Base de Datos

### Sincronizar schema (desarrollo)
```bash
cd packages/db
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
pnpm db:push
```

### Ejecutar seed (datos demo)
```bash
cd packages/db
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
pnpm db:seed
```

### Abrir Prisma Studio
```bash
cd packages/db
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
pnpm db:studio
```

### Crear migración
```bash
cd packages/db
pnpm db:migrate
```

---

## 🔧 Backend (NestJS)

### Instalar dependencias
```bash
cd apps/api
pnpm install
```

### Modo desarrollo
```bash
cd apps/api
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
export JWT_SECRET="tu-secreto-jwt-super-seguro"
export PORT=3001
pnpm dev
```

### Build para producción
```bash
cd apps/api
pnpm build
```

### Ejecutar producción
```bash
cd apps/api
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
export JWT_SECRET="tu-secreto-jwt-super-seguro"
export PORT=3001
pnpm start:prod
```

### Lint
```bash
cd apps/api
pnpm lint
```

### Tests
```bash
cd apps/api
pnpm test
```

---

## 🌐 Frontend (Next.js)

### Instalar dependencias
```bash
cd apps/web
pnpm install
```

### Modo desarrollo
```bash
cd apps/web
export NEXT_PUBLIC_API_URL=http://localhost:3001
pnpm dev
```

### Build
```bash
cd apps/web
pnpm build
```

### Producción
```bash
cd apps/web
pnpm start
```

---

## 📦 Monorepo (pnpm)

### Instalar todas las dependencias
```bash
pnpm install
```

### Ejecutar comando en workspace específico
```bash
pnpm --filter @sistema-reservas/api dev
pnpm --filter @sistema-reservas/web dev
pnpm --filter @sistema-reservas/db db:push
```

### Limpiar todo
```bash
pnpm clean:all
```

---

## 🧪 Testing API con curl

### Listar ofertas
```bash
curl -X GET http://localhost:3001/offerings \
  -H "x-tenant-domain: localhost"
```

### Ver disponibilidad
```bash
curl -X GET "http://localhost:3001/availability?offeringId=OFFERING_ID&startDate=2025-01-15&endDate=2025-01-20&quantity=2" \
  -H "x-tenant-domain: localhost"
```

### Crear hold
```bash
curl -X POST http://localhost:3001/holds \
  -H "Content-Type: application/json" \
  -H "x-tenant-domain: localhost" \
  -d '{
    "offeringId": "OFFERING_ID",
    "slot": "2025-01-15T10:00:00.000Z",
    "quantity": 2
  }'
```

### Crear booking
```bash
curl -X POST http://localhost:3001/bookings \
  -H "Content-Type: application/json" \
  -H "x-tenant-domain: localhost" \
  -d '{
    "holdId": "HOLD_ID",
    "email": "cliente@example.com",
    "name": "Juan Pérez",
    "phone": "+34612345678"
  }'
```

### Check-in
```bash
curl -X POST http://localhost:3001/checkin \
  -H "Content-Type: application/json" \
  -H "x-tenant-domain: localhost" \
  -d '{
    "code": "ABC12345"
  }'
```

---

## 🔍 URLs Importantes

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Frontend | http://localhost:3000 | Aplicación web pública |
| Backend API | http://localhost:3001 | API REST |
| Swagger Docs | http://localhost:3001/api/docs | Documentación interactiva |
| Prisma Studio | http://localhost:5555 | Explorador de BD |
| PostgreSQL | localhost:5432 | Base de datos |
| Redis | localhost:6379 | Caché |

---

## 🛠️ Troubleshooting

### Error: Puerto en uso
```bash
# Encontrar proceso usando el puerto
lsof -ti:3001

# Matar proceso
kill -9 $(lsof -ti:3001)
```

### Error: Base de datos no conecta
```bash
# Verificar que Docker esté corriendo
docker ps

# Reiniciar contenedores
docker-compose restart
```

### Error: Módulo no encontrado
```bash
# Limpiar y reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Resetear base de datos
```bash
cd packages/db
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
pnpm db:reset  # ⚠️ Borra todos los datos
pnpm db:seed   # Crea datos demo
```

---

## 🔐 Variables de Entorno

### Backend (.env en apps/api)
```bash
DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
JWT_SECRET="tu-secreto-jwt-super-seguro"
PORT=3001
REDIS_URL="redis://localhost:6379"
```

### Frontend (.env.local en apps/web)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 📊 Git Workflow

### Crear nueva rama
```bash
git checkout -b feature/nueva-funcionalidad
```

### Añadir cambios
```bash
git add .
git commit -m "feat: descripción del cambio"
```

### Push a remoto
```bash
git push origin feature/nueva-funcionalidad
```

### Ver estado
```bash
git status
git log --oneline
```

---

## 🚀 Inicio Rápido (Todo en uno)

### Terminal 1: Servicios
```bash
docker-compose up -d
```

### Terminal 2: Backend
```bash
cd apps/api
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
export JWT_SECRET="tu-secreto-jwt-super-seguro"
export PORT=3001
pnpm dev
```

### Terminal 3: Frontend
```bash
cd apps/web
export NEXT_PUBLIC_API_URL=http://localhost:3001
pnpm dev
```

### Terminal 4: Prisma Studio (opcional)
```bash
cd packages/db
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
pnpm db:studio
```

---

## 📚 Documentación Adicional

- **[INICIO_RAPIDO.md](INICIO_RAPIDO.md)** - Guía de inicio paso a paso
- **[API_TESTING.md](API_TESTING.md)** - Ejemplos de testing completos
- **[IMPLEMENTACION_BACKEND.md](IMPLEMENTACION_BACKEND.md)** - Estado de implementación
- **[PROMPT_SISTEMA_RESERVAS.md](PROMPT_SISTEMA_RESERVAS.md)** - Especificaciones completas

---

**Última actualización**: 31 de diciembre de 2025
