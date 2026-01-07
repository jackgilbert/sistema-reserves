#!/bin/bash

# Script para ejecutar todos los servicios en modo desarrollo

set -e

echo "🚀 Iniciando Sistema de Reservas"
echo "================================"
echo ""

DB_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
export DATABASE_URL="$DB_URL"

# Verificar que Docker esté disponible
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está disponible (daemon no accesible)."
    echo "   Inicia Docker y vuelve a ejecutar este script."
    exit 1
fi

# Iniciar servicios Docker (DB/Redis) siempre
echo "🐳 Iniciando servicios Docker (PostgreSQL/Redis)..."
docker-compose up -d

# Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a PostgreSQL..."
for i in {1..30}; do
    if docker exec sistema-reservas-db pg_isready -U reservas -d sistema_reservas > /dev/null 2>&1; then
        echo "✓ PostgreSQL listo"
        break
    fi
    sleep 1
    if [ "$i" -eq 30 ]; then
        echo "❌ PostgreSQL no respondió a tiempo. Revisa docker logs sistema-reservas-db"
        exit 1
    fi
done

# Asegurar schema y datos mínimos para desarrollo
echo "🗄️  Verificando base de datos (schema/datos demo)..."

# Sincronizar schema (idempotente). Evita fallos por columnas nuevas faltantes
# (por ejemplo: instances.extendedSettings).
echo "⚙️  Sincronizando schema (pnpm -C packages/db db:push)..."
pnpm -C packages/db db:push

# Si no hay instancias, cargar seed demo (borra y recrea, pero sólo si está vacío)
INSTANCE_COUNT=$(docker exec sistema-reservas-db psql -U reservas -d sistema_reservas -tAc "select count(*) from instances;" | tr -d '[:space:]')
if [ "${INSTANCE_COUNT:-0}" = "0" ]; then
    echo "🌱 No hay instancias. Cargando datos demo (pnpm -C packages/db db:seed)..."
    pnpm -C packages/db db:seed
else
    # Si ya hay instancias, asegurar que exista el dominio localhost (sin borrar nada)
    LOCALHOST_COUNT=$(docker exec sistema-reservas-db psql -U reservas -d sistema_reservas -tAc "select count(*) from domains where domain='localhost';" | tr -d '[:space:]')
    if [ "${LOCALHOST_COUNT:-0}" = "0" ]; then
        echo "🌐 Dominio 'localhost' no existe. Creándolo..."
        node check-db.js
    fi
fi

# Función para matar procesos al salir
cleanup() {
    echo ""
    echo "🛑 Deteniendo servicios..."
    kill $API_PID $WEB_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Iniciar API
echo "🔧 Iniciando API (puerto 3001)..."
cd apps/api
export JWT_SECRET="tu-secreto-jwt-super-seguro"
export PORT=3001
export ENABLE_CRON=false  # Deshabilitar cron jobs en desarrollo
pnpm dev &
API_PID=$!
cd ../..

# Esperar un poco
sleep 3

# Iniciar Frontend
echo "🌐 Iniciando Frontend (puerto 3000)..."
cd apps/web
export PORT=3000

# En local, es útil fijar la URL de la API.
# En Codespaces/port-forwarding (HTTPS), forzar http://localhost rompe (mixed content / localhost no resolvible).
if [ -z "$CODESPACES" ] && [ -z "$CODESPACE_NAME" ] && [ -z "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
    export NEXT_PUBLIC_API_URL=http://localhost:3001
fi

pnpm dev &
WEB_PID=$!
cd ../..

echo ""
echo "✅ Servicios iniciados!"
echo ""
echo "📍 URLs:"
echo "   - Frontend: http://localhost:3000"
echo "   - Admin: http://localhost:3000/admin/login"
echo "   - API: http://localhost:3001"
echo "   - Swagger: http://localhost:3001/api/docs"
echo ""
echo "🔐 Credenciales:"
echo "   Email: admin@museo.com"
echo "   Password: admin123"
echo ""
echo "Presiona Ctrl+C para detener todos los servicios"
echo ""


echo "ℹ️  Si ves 'Instancia no encontrada para el dominio: localhost', revisa que el header/host sea 'localhost'."

# Esperar indefinidamente
wait
