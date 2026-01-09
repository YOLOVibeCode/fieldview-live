# FieldView.Live

Monetization platform for youth sports live streaming.

## 🚀 Deployment

### ⚠️ BEFORE EVERY PUSH - Run Preflight Build

```bash
# MANDATORY: Simulates exactly what Railway does
./scripts/preflight-build.sh

# If it passes → safe to push
# If it fails → FIX ERRORS before pushing
```

### Deployment Methods

| Method | Time | Documentation |
|--------|------|---------------|
| **Preflight Build** | 3-5 min | **RUN THIS FIRST** - catches errors locally |
| **Full Validation** | 30 min | Safe for features, migrations, releases |
| **Quick Deploy** | 2 min | Fast for bug fixes, small API changes |

**📋 [Deployment Options - Complete Guide](./DEPLOYMENT_OPTIONS.md)** ← Start here

### Quick Commands

```bash
# 🔴 ALWAYS RUN FIRST (before any push)
./scripts/preflight-build.sh

# If build fails, debug with:
./scripts/debug-railway-build.sh

# Full validation (optional, takes 30 min)
./scripts/railway-ready-check.sh

# Quick deploy after preflight passes
./scripts/yolo-deploy.sh api      # Quick deploy API (2 min)
./scripts/yolo-deploy.sh web      # Quick deploy Web (2 min)
```

### Why Preflight Build?

Railway builds fail when:
- ❌ Prisma Client types not generated
- ❌ TypeScript `any` type errors
- ❌ Missing exports/imports

The preflight build catches ALL of these locally **before** you push.

### Debugging Failed Builds

```bash
# Complete debug workflow
./scripts/debug-railway-build.sh

# See all TypeScript errors
pnpm --filter api type-check

# Get Railway logs
railway logs --service api | grep 'error'
```

## Architecture

Monorepo structure using pnpm workspaces:

- `packages/data-model`: Shared TypeScript interfaces, Zod schemas, and Prisma schema
- `apps/api`: Express API server
- `apps/web`: Next.js frontend

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker and Docker Compose (for local development)

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start local services (PostgreSQL, Redis)

```bash
docker-compose up -d
```

### 3. Set up database

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate
```

### 4. Configure environment variables

Copy `.env.example` files in `apps/api` and `apps/web` and fill in required values.

### 5. Start development servers

```bash
# Start API and Web in parallel
pnpm dev

# Or start individually
pnpm --filter api dev
pnpm --filter web dev
```

## Development

### Running tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Linting and formatting

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check
```

### Type checking

```bash
pnpm type-check
```

## Project Structure

```
fieldview-live/
├── packages/
│   └── data-model/          # Shared types, schemas, Prisma
├── apps/
│   ├── api/                 # Express API server
│   └── web/                 # Next.js frontend
├── docs/                    # Specifications and design docs
├── docker-compose.yml       # Local development services
└── pnpm-workspace.yaml      # pnpm workspace config
```

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Express.js, TypeScript, Prisma, PostgreSQL
- **Infrastructure**: Railway, Docker, Redis
- **External Services**: Twilio (SMS), SendGrid (Email), Square (Payments), Mux (Streaming)

## Documentation

### 🚀 Deployment
- **[Deployment Options](./DEPLOYMENT_OPTIONS.md)** - **SOURCE OF TRUTH** for all deployment methods
- **[Deploy to Railway (First Time)](./DEPLOY_TO_RAILWAY.md)** - Initial Railway setup
- **[Environment Setup](./ENV_SETUP_GUIDE.md)** - Required environment variables

### 📹 Streaming Setup
- **[Streaming Quick Start](./README_STREAMING.md)** - Get started with RTMP streaming in 3 steps
- **[Quick Reference](./docs/QUICK_START_RTMP.md)** - Fast setup for external platforms (Veo, etc.)
- **[Detailed Setup Guide](./docs/STREAMING_SETUP_GUIDE.md)** - Complete RTMP configuration
- **[Veo Setup Example](./docs/EXAMPLE_VEO_SETUP.md)** - Step-by-step Veo camera configuration

### 📖 General Documentation
See `docs/` directory for:
- Product specifications
- API documentation
- Design document
- User flows

## License

Private - All rights reserved
