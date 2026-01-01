#!/bin/bash

# Script para instalar dependencias faltantes en el API

cd /workspaces/sistema-reserves/apps/api

echo "📦 Instalando @nestjs/schedule..."
pnpm add @nestjs/schedule

echo "✅ Dependencias instaladas correctamente"
