# Docker Setup Guide

## Overview

Naberza OS uses Docker Compose for local development, providing a containerized PostgreSQL database and Next.js application environment.

## Prerequisites

- Docker Desktop (Mac, Windows) or Docker Engine (Linux)
- Docker Compose v2+
- Git

## Quick Start

### 1. Environment Setup

Copy the environment template to a local file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

```env
# Database
DATABASE_URL=postgresql://naberza:postgres@localhost:5432/naberza_dev
POSTGRES_USER=naberza
POSTGRES_PASSWORD=postgres
POSTGRES_DB=naberza_dev

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-a-random-secret>

# External APIs (Phase 1+)
PAPERLESS_API_URL=
PAPERLESS_API_TOKEN=
HOME_ASSISTANT_URL=
HOME_ASSISTANT_TOKEN=
MAILBOX_IMAP_HOST=
MAILBOX_IMAP_USER=
MAILBOX_IMAP_PASSWORD=
TELEGRAM_BOT_TOKEN=
```

Generate `NEXTAUTH_SECRET` with:

```bash
openssl rand -base64 32
```

### 2. Start Services

```bash
docker-compose up -d
```

This will:
- Build the Next.js application image
- Start PostgreSQL (port 5432)
- Start the app server (port 3000)
- Set up database health checks

### 3. Access Application

- **App**: http://localhost:3000
- **Database**: `postgresql://naberza:postgres@localhost:5432/naberza_dev`

## Docker Compose Services

### PostgreSQL (postgres)

- **Image**: postgres:16-alpine
- **Port**: 5432
- **Volume**: `postgres_data` (persistent)
- **Health Check**: pg_isready
- **Init**: Auto-creates database from DATABASE_URL

### Next.js App (app)

- **Build**: Multi-stage Dockerfile
- **Port**: 3000
- **Volume Mounts**:
  - `.` → `/app` (source code, hot-reload in dev)
  - `node_modules` → namespaced (prevents node_modules conflicts)
  - `.next` → namespaced (build cache)
- **Health Check**: HTTP GET /
- **Depends On**: postgres (waits for healthy status)

## Common Tasks

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

### Enter App Container

```bash
docker-compose exec app sh
```

### Run Database Migrations

```bash
docker-compose exec app npx prisma migrate deploy
```

### Reset Database

```bash
docker-compose down -v  # Remove volumes
docker-compose up -d    # Recreate
```

### Stop Services

```bash
docker-compose down
```

### Rebuild Image

```bash
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### Port Already in Use

If port 3000 or 5432 is already in use:

```bash
# Change in docker-compose.yml or override with:
docker-compose -f docker-compose.yml -e "APP_PORT=3001" up -d
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Verify connection string in .env.local
```

### App Won't Start

```bash
# Check app logs
docker-compose logs app

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Module Import Errors

node_modules conflicts are isolated via Docker volumes. If you see import errors:

```bash
docker-compose down -v
docker-compose up -d
```

## Environment Variables Reference

All variables are documented in `.env.local.example`. Key groups:

### Database
- `DATABASE_URL`: Full PostgreSQL connection string
- `POSTGRES_*`: Credentials for docker-compose

### Authentication
- `NEXTAUTH_URL`: NextAuth.js callback URL
- `NEXTAUTH_SECRET`: Session signing secret

### External APIs (Phase 1+)
- `PAPERLESS_*`: Paperless-ngx integration
- `HOME_ASSISTANT_*`: Home Assistant integration
- `MAILBOX_*`: Email integration
- `TELEGRAM_*`: Notification adapter

### Runtime
- `NODE_ENV`: `development` or `production`
- `LOG_LEVEL`: `debug` | `info` | `warn` | `error`

## Production Deployment

For production (Vercel, Railway, Render):

1. Use managed PostgreSQL (Supabase, Neon, AWS RDS)
2. Set DATABASE_URL to production connection string
3. Generate strong NEXTAUTH_SECRET
4. Update NEXTAUTH_URL to production domain
5. Deploy via `git push` (auto-deploys via Vercel)

See `RELEASE.md` for deployment checklist.

## Files Reference

- `Dockerfile`: Multi-stage build for optimized production image
- `docker-compose.yml`: Local dev environment orchestration
- `.dockerignore`: Exclude unnecessary files from image build
- `.env.local.example`: Environment template for local development
- `code/.env.example`: Environment template (app-specific)
