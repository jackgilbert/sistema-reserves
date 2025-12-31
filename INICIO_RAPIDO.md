# 🚀 COMANDOS DE ARRANQUE RÁPIDO

## ✅ Estado Actual

El sistema está completamente configurado y listo para desarrollo.

## 📋 Pasos para Arrancar el Sistema

### 1. Servicios de Base de Datos (Ya arrancados)

Los contenedores de PostgreSQL y Redis ya están ejecutándose:

```bash
docker ps
```

Deberías ver:
- `sistema-reservas-db` (PostgreSQL)
- `sistema-reservas-redis` (Redis)

Si no están corriendo:

```bash
cd /workspaces/sistema-reserves
docker-compose up -d
```

### 2. Base de Datos (Ya inicializada)

La base de datos ya está sincronizada y poblada con datos demo.

Para verificar:

```bash
cd /workspaces/sistema-reserves/packages/db
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
pnpm prisma studio
```

### 3. Arrancar el Backend (API)

En una nueva terminal:

```bash
cd /workspaces/sistema-reserves/apps/api
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
export JWT_SECRET="tu-secreto-jwt-super-seguro"
export PORT=3001
pnpm dev
```

La API estará disponible en:
- **API**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/api/docs

### 4. Arrancar el Frontend (Web)

En otra terminal:

```bash
cd /workspaces/sistema-reserves/apps/web
export NEXT_PUBLIC_API_URL=http://localhost:3001
pnpm dev
```

El frontend estará disponible en:
- **Frontend**: http://localhost:3000

## 🏛️ Instancias Demo

### Museo de Arte Moderno

**Dominio**: localhost (puerto 3000)
**Tipo**: CAPACITY (entradas por franja horaria)
**Horario**: Martes a Domingo, 10:00-18:00
**Franjas**: 30 minutos
**Capacidad**: 50 personas por franja

**Credenciales**:
- Admin: admin@museo.com / admin123 (nota: passwords son hashes temporales)
- Staff: staff@museo.com / staff123

**Oferta**: Entrada General (12€)
- Adulto: 12€
- Niño: 6€
- Senior: 9€

### Parking Centro Ciudad

**Dominio**: parking.localhost (puerto 3000)
**Tipo**: RESOURCE (plazas discretas)
**Horario**: 24/7
**Franjas**: 1 hora
**Recursos**: 10 plazas (A-01 a C-04)

**Credenciales**:
- Admin: admin@parking.com / admin123

**Oferta**: Plaza Estándar
- Hora: 5€
- Medio día (4h): 20€
- Día completo (24h): 35€

## 🧪 Probar el Sistema

### 1. Verificar API

```bash
curl http://localhost:3001/instances
```

### 2. Ver documentación Swagger

Abre en el navegador: http://localhost:3001/api/docs

### 3. Verificar Frontend

Abre en el navegador: http://localhost:3000

### 4. Acceder a Prisma Studio

```bash
cd /workspaces/sistema-reserves/packages/db
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
pnpm db:studio
```

Abre: http://localhost:5555

## 🛠️ Comandos Útiles

### Reiniciar Base de Datos

```bash
cd /workspaces/sistema-reserves/packages/db
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
pnpm db:push
pnpm db:seed
```

### Ver Logs de Docker

```bash
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Detener Servicios

```bash
docker-compose down
```

### Limpiar Todo

```bash
docker-compose down -v  # Elimina también los volúmenes
```

## 📝 Estructura de URLs

### API Endpoints (Ejemplos)

- `GET /instances` - Listar instancias
- `GET /instances/:id` - Obtener instancia
- `POST /instances` - Crear instancia
- `GET /api/docs` - Documentación Swagger

### Frontend Routes (Planeadas)

**Público**:
- `/` - Listado de ofertas
- `/o/:slug` - Detalle de oferta
- `/checkout` - Proceso de pago
- `/confirm/:code` - Confirmación con QR
- `/manage/:code` - Gestión de reserva

**Admin**:
- `/admin/login` - Login
- `/admin/instances` - Gestión de instancias
- `/admin/offerings` - CRUD ofertas
- `/admin/bookings` - Listado reservas
- `/admin/checkin` - Escaneo QR

## ⚠️ Notas Importantes

1. **Passwords**: Actualmente los passwords en el seed son hashes temporales. Necesitarás implementar bcrypt correctamente para autenticación real.

2. **Dominios Locales**: Para probar multi-tenant localmente, añade a `/etc/hosts`:
   ```
   127.0.0.1 localhost
   127.0.0.1 museo.localhost
   127.0.0.1 parking.localhost
   ```

3. **Variables de Entorno**: El archivo `.env` ya está creado en la raíz. Modifícalo según necesites.

4. **Stripe**: Necesitarás configurar claves de Stripe reales en `.env` para probar pagos.

## 🎯 Próximos Pasos

1. ✅ Estructura del monorepo creada
2. ✅ Schema Prisma multi-tenant definido
3. ✅ Base de datos inicializada y poblada
4. ✅ Backend NestJS con módulos base
5. ✅ Frontend Next.js inicializado
6. ✅ Docker Compose configurado
7. ✅ CI/CD con GitHub Actions

**Pendiente**:
- Implementar módulos completos del backend (OfferingsModule, AvailabilityModule, HoldsModule, BookingsModule, PaymentsModule, CheckInModule)
- Implementar rutas del frontend
- Añadir autenticación completa con bcrypt
- Integración completa con Stripe
- Tests unitarios y de integración

## 🆘 Troubleshooting

### Puerto ya en uso

```bash
# Verificar qué proceso usa el puerto
lsof -i :3001
lsof -i :3000

# Matar proceso si es necesario
kill -9 <PID>
```

### Error de conexión a PostgreSQL

```bash
# Verificar que el contenedor está corriendo
docker ps | grep postgres

# Reiniciar contenedor
docker-compose restart postgres
```

### Problemas con pnpm

```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules
pnpm install --force
```
