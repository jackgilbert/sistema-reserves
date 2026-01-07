# Optimizaciones para Problemas con Extensiones Remotas

## Problemas Identificados y Solucionados

### 1. 🔴 CRÍTICO: Bucle Ineficiente en `releaseExpiredHolds()`

**Problema:**
- El método iteraba sobre holds expirados uno por uno dentro de una transacción
- Cada hold requería 2 queries individuales (update bucket + update hold)
- Con muchos holds expirados, la transacción podía tardar varios minutos
- Bloqueaba la base de datos y consumía CPU excesivamente

**Solución:**
- Implementado procesamiento por lotes (máximo 50 holds por ejecución)
- Agrupación de actualizaciones por bucket
- Uso de `updateMany` en lugar de múltiples `update`
- Timeout configurado (10 segundos) para evitar transacciones largas
- Manejo de errores que no interrumpe el servicio

**Ubicación:** `apps/api/src/holds/holds.service.ts`

### 2. 🔴 Logs Excesivos de Prisma

**Problema:**
- Configuración de logs incluía `'query'` en desarrollo
- TODAS las consultas SQL se registraban en la terminal
- Miles de líneas de logs por minuto
- Sobrecarga de la terminal y del sistema

**Solución:**
- Eliminado `'query'` de los logs de desarrollo
- Solo se registran `'error'` y `'warn'`
- Comentario agregado sobre cómo habilitar logs de queries cuando se necesite

**Ubicación:** `packages/db/src/index.ts`

### 3. 🟡 Cron Jobs Demasiado Frecuentes

**Problema:**
- Cron ejecutándose cada 5 minutos
- Operaciones de base de datos cada 5 minutos en desarrollo
- Innecesario para entornos de desarrollo

**Solución:**
- Cambio a cada 15 minutos (reduce carga en 66%)
- Variable de entorno `ENABLE_CRON=false` para deshabilitar completamente
- Por defecto deshabilitado en `scripts/dev.sh`

**Ubicación:** 
- `apps/api/src/tasks/tasks.service.ts`
- `scripts/dev.sh`

### 4. 🟡 Console.log en Cada Request

**Problema:**
- Múltiples `console.log()` en `tenant.service.ts`
- Se ejecutaban en CADA request HTTP
- Saturaban la terminal con información repetitiva
- Console.log adicionales en el frontend

**Solución:**
- Eliminados todos los console.log innecesarios
- Mantenidos solo los errores críticos
- Frontend limpiado de logs de debug

**Ubicaciones:**
- `apps/api/src/tenant/tenant.service.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/app/page.tsx`

### 5. 🟢 Configuración de VS Code

**Problema:**
- File watchers por defecto observan todos los archivos
- Incluye node_modules, .next, dist, etc.
- Genera miles de eventos de filesystem

**Solución:**
- Creado `.vscode/settings.json` con exclusiones
- Excluidos directorios de build y dependencias
- Reducido scrollback de terminal
- Deshabilitadas actualizaciones automáticas de extensiones

**Ubicación:** `.vscode/settings.json`

## Variables de Entorno

### Desarrollo
```bash
export ENABLE_CRON=false  # Deshabilitar cron jobs
export NODE_ENV=development
```

### Producción
```bash
export ENABLE_CRON=true  # Habilitar cron jobs
export NODE_ENV=production
```

## Mejoras de Rendimiento Esperadas

| Área | Antes | Después | Mejora |
|------|-------|---------|--------|
| Logs por minuto | ~5000+ | ~50 | 99% |
| Queries DB (cron) | Cada 5 min | Cada 15 min (o deshabilitado) | 66-100% |
| Tiempo transacción holds | Variable (puede ser minutos) | Max 10 seg | >95% |
| Console.log en requests | 5-8 por request | 0 | 100% |
| File watcher events | Miles | Cientos | ~90% |

## Monitoreo

### Verificar que las optimizaciones funcionan:

```bash
# 1. Verificar que cron está deshabilitado
grep "ENABLE_CRON" scripts/dev.sh

# 2. Verificar logs reducidos en Prisma
grep "log:" packages/db/src/index.ts

# 3. Verificar cambios en holds service
grep "BATCH_SIZE\|timeout" apps/api/src/holds/holds.service.ts

# 4. Verificar eliminación de console.log
grep -n "console.log" apps/api/src/tenant/tenant.service.ts
```

## Si Aún Hay Problemas

### Diagnóstico Adicional:

1. **Verificar procesos:**
   ```bash
   ps aux | grep node
   ```

2. **Monitorear uso de CPU:**
   ```bash
   top -p $(pgrep -d',' node)
   ```

3. **Ver conexiones a la base de datos:**
   ```bash
   docker exec -it sistema-reservas-db psql -U reservas -d sistema_reservas -c "SELECT * FROM pg_stat_activity;"
   ```

4. **Logs de la API:**
   ```bash
   # En otro terminal mientras dev.sh está corriendo
   tail -f apps/api/logs/*.log 2>/dev/null || echo "No log files"
   ```

### Optimizaciones Adicionales (si es necesario):

1. **Deshabilitar hot reload en Next.js:**
   ```javascript
   // next.config.js
   module.exports = {
     webpack: (config) => {
       config.watchOptions = {
         poll: false,
         ignored: /node_modules/,
       };
       return config;
     },
   };
   ```

2. **Aumentar recursos del contenedor:**
   ```yaml
   # docker-compose.yml
   services:
     api:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```

3. **Deshabilitar ScheduleModule completamente:**
   ```typescript
   // apps/api/src/app.module.ts
   // Comentar TasksModule en imports
   ```

## Comandos Útiles

```bash
# Reiniciar con optimizaciones
pnpm clean && pnpm install && ./scripts/dev.sh

# Verificar estado de servicios
docker-compose ps

# Ver logs de base de datos
docker-compose logs -f postgres

# Limpiar cache de VS Code
# Comando + Shift + P > "Developer: Reload Window"
```

## Notas

- Estas optimizaciones están diseñadas específicamente para **entornos de desarrollo**
- En **producción**, considera habilitar cron jobs con `ENABLE_CRON=true`
- El cache de tenant en memoria funciona bien para desarrollo, pero en producción considera usar Redis
- Monitorea el rendimiento después de aplicar estas optimizaciones

## Autor

Optimizaciones aplicadas el 5 de enero de 2026 para resolver problemas con extensiones remotas de VS Code.
