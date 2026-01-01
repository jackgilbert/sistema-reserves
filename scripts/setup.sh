#!/bin/bash

# Script de instalación y configuración inicial
# Sistema de Reservas Multi-Tenant

set -e

echo "🚀 Instalando Sistema de Reservas Multi-Tenant"
echo "================================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar dependencias
echo "📋 Verificando dependencias..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠️  pnpm no está instalado. Instalando...${NC}"
    npm install -g pnpm
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dependencias verificadas${NC}"
echo ""

# 2. Instalar dependencias
echo "📦 Instalando dependencias del proyecto..."
pnpm install
echo -e "${GREEN}✓ Dependencias instaladas${NC}"
echo ""

# 3. Configurar variables de entorno
echo "⚙️  Configurando variables de entorno..."

if [ ! -f .env ]; then
    cat > .env << EOF
DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
EOF
    echo -e "${GREEN}✓ .env creado en raíz${NC}"
fi

if [ ! -f apps/api/.env ]; then
    cat > apps/api/.env << EOF
DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
JWT_SECRET="$(openssl rand -base64 32)"
PORT=3001
REDIS_URL="redis://localhost:6379"
EOF
    echo -e "${GREEN}✓ apps/api/.env creado${NC}"
fi

if [ ! -f apps/web/.env.local ]; then
    cat > apps/web/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
    echo -e "${GREEN}✓ apps/web/.env.local creado${NC}"
fi

if [ ! -f packages/db/.env ]; then
    cat > packages/db/.env << EOF
DATABASE_URL="postgresql://reservas:reservas123@localhost:5432/sistema_reservas"
EOF
    echo -e "${GREEN}✓ packages/db/.env creado${NC}"
fi

echo ""

# 4. Iniciar servicios Docker
echo "🐳 Iniciando servicios Docker..."
docker-compose up -d
echo -e "${GREEN}✓ PostgreSQL y Redis iniciados${NC}"
echo ""

# 5. Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a PostgreSQL..."
sleep 5

# 6. Configurar base de datos
echo "🗄️  Configurando base de datos..."
cd packages/db
pnpm db:push
echo -e "${GREEN}✓ Schema sincronizado${NC}"

echo ""
echo "🌱 Poblando base de datos con datos demo..."
pnpm db:seed
echo -e "${GREEN}✓ Datos demo cargados${NC}"
cd ../..

echo ""
echo "================================================"
echo -e "${GREEN}✅ Instalación completada exitosamente!${NC}"
echo "================================================"
echo ""
echo "📝 Próximos pasos:"
echo ""
echo "1. Iniciar el backend:"
echo "   cd apps/api && pnpm dev"
echo ""
echo "2. En otra terminal, iniciar el frontend:"
echo "   cd apps/web && pnpm dev"
echo ""
echo "3. Acceder a:"
echo "   - Frontend: http://localhost:3000"
echo "   - Admin: http://localhost:3000/admin/login"
echo "   - API Docs: http://localhost:3001/api/docs"
echo ""
echo "4. Credenciales demo:"
echo "   Email: admin@museo.com"
echo "   Password: admin123"
echo ""
echo "📚 Ver más: README.md y INICIO_RAPIDO.md"
echo ""
