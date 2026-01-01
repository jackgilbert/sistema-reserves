# 🚀 Quick Start Guide

## Start Services Manually

### 1. Start Docker (PostgreSQL + Redis)
```bash
cd /workspaces/sistema-reserves
docker-compose up -d
```

### 2. Start Backend API
Open a terminal and run:
```bash
cd /workspaces/sistema-reserves/apps/api
pnpm dev
```

The API will start on http://localhost:3001

### 3. Start Frontend
Open another terminal and run:
```bash
cd /workspaces/sistema-reserves/apps/web
pnpm dev
```

The frontend will start on http://localhost:3000

## Access Points

- **Frontend**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin/login
- **API Swagger Docs**: http://localhost:3001/api/docs

## Demo Credentials

- **Email**: admin@museo.com
- **Password**: admin123

## Troubleshooting

### If ports are already in use:
```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### If database connection fails:
```bash
# Restart Docker containers
docker-compose restart

# Check if containers are running
docker-compose ps
```

### If dependencies are missing:
```bash
# In project root
pnpm install
```
