#!/bin/bash

# Script para ejecutar todos los servicios en modo desarrollo

set -e

echo "🚀 Iniciando Sistema de Reservas"
echo "================================"
echo ""

# Verificar que Docker esté corriendo
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker no está corriendo. Iniciando servicios..."
    docker-compose up -d
    sleep 3
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
export DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
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

# Esperar indefinidamente
wait
