# Railway Deployment

## Overview

Railway deployment strategy with staging and production environments, tag-based releases, and environment variable management.

**Platform**: Railway

**Services**:
- `web` (Next.js frontend)
- `api` (Express backend)
- `postgres` (Railway managed PostgreSQL)
- `redis` (Railway addon)

## Railway Project Setup

### Project Structure

```
Railway Project: fieldview-live
├── Service: web
│   ├── Dockerfile: apps/web/Dockerfile
│   ├── Port: 3000
│   └── Environment: production
├── Service: api
│   ├── Dockerfile: apps/api/Dockerfile
│   ├── Port: 3001
│   └── Environment: production
├── Database: postgres
│   └── Version: PostgreSQL 15+
└── Cache: redis
    └── Version: Redis 7+
```

### Initial Setup

1. **Create Railway Project**:
   - Go to Railway dashboard
   - Create new project: `fieldview-live`
   - Connect GitHub repository: `YOLOVibeCode/fieldview-live`

2. **Add Services**:
   - Add `web` service (from `apps/web/Dockerfile`)
   - Add `api` service (from `apps/api/Dockerfile`)
   - Add PostgreSQL database (Railway managed)
   - Add Redis addon

3. **Configure Environment Variables**:
   - Set all required env vars (see Environment Variables section)

## Dockerfiles

### Web Service Dockerfile

```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json ./
COPY packages/data-model/package.json ./packages/data-model/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Copy workspace files
COPY . .

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/data-model/node_modules ./packages/data-model/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Build packages
RUN pnpm --filter @fieldview/data-model build

# Build web app
RUN pnpm --filter web build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built app
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/data-model/dist ./packages/data-model/dist

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["node_modules/.bin/next", "start"]
```

### API Service Dockerfile

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json ./
COPY packages/data-model/package.json ./packages/data-model/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Copy workspace files
COPY . .

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/data-model/node_modules ./packages/data-model/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Build packages
RUN pnpm --filter @fieldview/data-model build

# Build API
RUN pnpm --filter api build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built app
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/data-model/dist ./packages/data-model/dist

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

## Environment Variables

### Web Service Variables

```bash
# Next.js
NEXT_PUBLIC_API_URL=https://api.fieldview.live
NODE_ENV=production

# Database (from Railway PostgreSQL service)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (from Railway Redis addon)
REDIS_URL=${{Redis.REDIS_URL}}
```

### API Service Variables

```bash
# Server
PORT=3001
NODE_ENV=production
APP_URL=https://fieldview.live

# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis
REDIS_URL=${{Redis.REDIS_URL}}

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+15551234567

# SendGrid
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@fieldview.live

# Square
SQUARE_APPLICATION_ID=sq0idp-xxxxx
SQUARE_APPLICATION_SECRET=xxxxx
SQUARE_ACCESS_TOKEN=xxxxx
SQUARE_WEBHOOK_SECRET=xxxxx
SQUARE_ENVIRONMENT=production

# Mux
MUX_TOKEN_ID=xxxxx
MUX_TOKEN_SECRET=xxxxx

# JWT
JWT_SECRET=xxxxx

# Encryption
ENCRYPTION_KEY=xxxxx
```

### Railway Variable Management

**Railway Dashboard**:
- Go to service → Variables
- Add variables manually or import from `.env` file
- Use Railway's variable references: `${{Postgres.DATABASE_URL}}`

**Railway CLI** (Alternative):
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Set variables
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}
```

## Deployment Workflow

### Tag-Based Deployment

**Trigger**: Tag push matching `v*.*.*` on `main` branch

**GitHub Actions Workflow**:
```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install Railway CLI
        run: npm install -g @railway/cli
      
      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          railway login --token $RAILWAY_TOKEN
          railway up --service web
          railway up --service api
```

### Manual Deployment (Alternative)

**Railway Dashboard**:
1. Go to service
2. Click "Deploy"
3. Select branch/tag
4. Deploy

**Railway CLI**:
```bash
railway up --service web
railway up --service api
```

## Database Migrations

### Migration Strategy

**On Deploy**:
1. Run migrations automatically on service startup
2. Or run migrations manually via Railway CLI

**Migration Script**:
```typescript
// apps/api/src/scripts/migrate.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  // Prisma migrations run automatically via `prisma migrate deploy`
  // This script can be used for custom migration logic
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Railway Startup Command**:
```bash
# In Railway service settings, set startup command:
pnpm db:migrate && node dist/server.js
```

## Health Checks

### API Health Endpoint

```typescript
// apps/api/src/routes/health.ts
app.get('/health', async (req, res) => {
  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    return res.status(503).json({ status: 'unhealthy', error: 'Database unavailable' });
  }
  
  // Check Redis
  try {
    await redisClient.ping();
  } catch (error) {
    return res.status(503).json({ status: 'unhealthy', error: 'Redis unavailable' });
  }
  
  res.json({ status: 'healthy' });
});
```

**Railway Health Check**:
- Set health check path: `/health`
- Railway will monitor this endpoint

## Monitoring & Logging

### Railway Logs

**View Logs**:
- Railway dashboard → Service → Logs
- Or via Railway CLI: `railway logs`

### External Monitoring (Optional)

**Services**:
- **Sentry**: Error tracking
- **Datadog**: APM and logging
- **New Relic**: Performance monitoring

**Integration**:
```typescript
// apps/api/src/lib/logger.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Use Sentry for error tracking
```

## Staging Environment (Optional)

### Setup

1. Create separate Railway project: `fieldview-live-staging`
2. Deploy `develop` branch to staging
3. Use separate database and Redis instances

### GitHub Actions (Staging)

```yaml
# Deploy to staging on push to develop
on:
  push:
    branches:
      - develop

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      # ... deploy to staging Railway project
```

## Rollback Strategy

### Railway Rollback

**Via Dashboard**:
1. Go to service → Deployments
2. Select previous deployment
3. Click "Redeploy"

**Via CLI**:
```bash
railway rollback --service web
railway rollback --service api
```

## Acceptance Criteria

- [ ] Railway project created and configured
- [ ] Web and API services deployed
- [ ] PostgreSQL database provisioned
- [ ] Redis addon provisioned
- [ ] Environment variables configured
- [ ] Dockerfiles build successfully
- [ ] Health checks configured
- [ ] Tag-based deployment works
- [ ] Migrations run on deploy
- [ ] Logs accessible

## Next Steps

- Review all implementation plan documents
- Begin Phase 1: Repository setup
