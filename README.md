# FieldView.Live

Monetization platform for youth sports live streaming.

<!-- AUTO-INDEX-SECTION -->
<!--
🤖 AI ASSISTANT - PROJECT NAVIGATION GUIDE
============================================

To fully understand and work with this project, follow this systematic approach:

📚 STEP 1 - READ DOCUMENTATION: docs/INDEX.md
   This is your PRIMARY source for understanding the project:
   • Complete index of ALL project documentation
   • Organized by category (specifications, guides, architecture, etc.)
   • Read specifications FIRST to understand system design
   • Then read guides for implementation details
   • Every document is indexed with descriptions and word counts
   • This is the authoritative source - do not search randomly

🔧 STEP 2 - UNDERSTAND AVAILABLE SCRIPTS: scripts/INDEX.md
   This index shows you ALL tools and automation:
   • Categorized by purpose (setup, build, test, deploy, etc.)
   • Includes usage examples and requirements
   • Marked with executable status and required arguments
   • Shows which language each script uses

   ⚡ SCRIPT EXECUTION ORDER:
   1. Setup scripts - Run FIRST for project initialization
   2. Build scripts - Compile/build the project
   3. Test scripts - Verify functionality
   4. Deploy scripts - Deploy to environments

🎯 COMPLETE WORKFLOW:
   1. Read docs/INDEX.md to understand WHAT the project does
   2. Read scripts/INDEX.md to understand HOW to work with it
   3. Follow specifications → guides → implementation order
   4. Use scripts in order: setup → build → test → deploy

💡 KEY PRINCIPLES:
   • Both indexes are auto-generated and always up-to-date
   • Never search randomly - use the indexes as navigation
   • Read documentation before writing code
   • Check scripts before running manual commands
   • Word counts help prioritize what to read first

✅ AFTER READING BOTH INDEXES:
   You will have complete knowledge of:
   • System architecture and design decisions
   • Implementation details and best practices
   • All available automation and tooling
   • Proper setup, build, test, and deployment procedures

============================================
-->

## 📚 Documentation & Scripts

**Quick Links:**
- 📖 **[Documentation Index](docs/INDEX.md)** - Complete project documentation
- 🔧 **[Scripts Index](scripts/INDEX.md)** - All available scripts and tools
- 🔍 **[Error Investigation Workflow](docs/ERROR-INVESTIGATION-WORKFLOW.md)** - **CRITICAL** - Standard method for quick error access

**🔍 Need to investigate errors?** → [Error Investigation Workflow](docs/ERROR-INVESTIGATION-WORKFLOW.md) ← **START HERE**

<!-- AUTO-INDEX-SECTION -->

## 🔍 Error Investigation & Logs (CRITICAL)

### ⚡ **STANDARD METHODS: Railway MCP + Browser MCP - MCP-FIRST ENFORCEMENT**

⚠️ **CRITICAL: CLI access is BLOCKED if Railway MCP is available. Always use MCP first.**

**For quick error investigation and visual verification:**

```bash
# First, verify Railway MCP is ready:
./scripts/test-railway-mcp.sh
```

**Then in Cursor Composer (Cmd+I), use both:**

**Railway MCP (Infrastructure):**
- `"Get the latest API logs"`
- `"Show me errors from the web service"`
- `"Get errors from the last hour"`
- `"Show deployment status"`
- `"Get the DATABASE_URL from production"`

**Browser MCP (Visual Verification):**
- `"Navigate to https://railway.app and show deployment status"`
- `"Go to https://fieldview.live and verify it's working"`
- `"Check https://api.fieldview.live/health and show response"`

**Why Railway MCP?**
- ✅ **Fast** - No waiting for slow CLI commands
- ✅ **Natural Language** - Just describe what you need
- ✅ **Smart Filtering** - AI filters logs intelligently
- ✅ **Better Formatting** - Clean, readable output
- ✅ **No Command Memorization** - Just ask

**📖 [Railway MCP Setup Guide](docs/MCP-RAILWAY-SETUP.md)** - Complete setup instructions  
**📖 [Railway MCP vs CLI](docs/RAILWAY-MCP-VS-CLI.md)** - Why MCP is better  
**📖 [Railway MCP Status](docs/RAILWAY-MCP-STATUS.md)** - Current status and troubleshooting  
**📖 [Browser MCP Setup](docs/BROWSER-MCP-SETUP.md)** - Visual verification guide

### 🔍 **STANDARD: Real-Time Railway Logs Debugging (Searchable & Indexed)**

**For immediate, real-time debugging with powerful analysis:**

```bash
# Install lnav (one-time)
./scripts/install-lnav.sh

# Real-time streaming (STANDARD METHOD)
./scripts/debug-railway-logs.sh api --follow           # Stream in real-time (opens in lnav)

# Monitor deployments in real-time (API + Web)
./scripts/monitor-deployments-realtime.sh both         # Monitor both services simultaneously

# Download recent logs for analysis
./scripts/debug-railway-logs.sh api 1000               # Get 1000 lines
./scripts/debug-railway-logs.sh api 500 --errors-only  # Errors only
./scripts/debug-railway-logs.sh api 5000 --deployments # Track deployments

# Cleanup stale logs (keep last 7 days)
./scripts/cleanup-stale-logs.sh
```

**Features:**
- ✅ **Real-time streaming** - `--follow` for immediate logs
- ✅ **Fast downloads** - Railway MCP (3-5s) or CLI fallback
- ✅ **SQL queries** - `SELECT * FROM log WHERE log_body LIKE '%error%'`
- ✅ **Regex search** - `/error|ERROR|fail/`
- ✅ **Automatic indexing** - Timestamps parsed, searchable
- ✅ **Filtering** - `:filter-in error` to show only errors
- ✅ **Automatic cleanup** - Removes logs older than 7 days

**📖 [Debug Railway Logs Guide](docs/DEBUG-RAILWAY-LOGS-GUIDE.md)** - Log download and real-time streaming  
**📖 [Debug Railway Logs Guide](docs/DEBUG-RAILWAY-LOGS-GUIDE.md)** - Complete debugging guide  
**📖 [Deployment Tracking](docs/DEPLOYMENT-TRACKING-LNAV.md)** - Track deployments  
**📖 [Browser MCP Setup](docs/BROWSER-MCP-SETUP.md)** - Visual verification guide

### 🔄 Fallback: Railway CLI (ONLY if MCP Not Available)

⚠️ **CLI scripts are BLOCKED if Railway MCP is configured. Use MCP via Composer instead.**

If Railway MCP is not configured, CLI scripts may be used:

```bash
# Get recent logs (ONLY if MCP unavailable)
./scripts/railway-logs.sh recent api
./scripts/railway-logs.sh recent web

# Get only errors (ONLY if MCP unavailable)
./scripts/railway-logs.sh errors api
./scripts/railway-logs.sh errors web

# Search logs (ONLY if MCP unavailable)
./scripts/railway-logs.sh search api "unlock"
./scripts/railway-logs.sh search web "error"
```

**⚠️ Note:** 
- Railway CLI is slow (10-30 seconds) and may timeout
- **CLI access is automatically blocked if Railway MCP is available**
- If you see "CLI access blocked", use Railway MCP via Composer instead

---

## 🚀 Deployment

### 🎯 **RECOMMENDED: Version-Managed Deployment**

**For all production deployments, use the automated deployment script:**

```bash
./scripts/deploy-to-production.sh
```

**What it does automatically:**
1. ✅ **Version Management** - Bumps version (build number for regular deploys, minor/major for significant changes)
2. ✅ **Git Tagging** - Creates git tags for significant releases
3. ✅ **Preflight Build** - Runs mandatory preflight build (catches errors before push)
4. ✅ **Deployment** - Commits version changes and pushes to Railway
5. ✅ **Version Display** - Version automatically appears in UI (lower right corner) and `/api/version` endpoint

**Version Bump Behavior:**
- **Regular deploy**: Automatically bumps build number (1.2.3.005 → 1.2.3.006)
- **Significant change**: Prompts for minor (1.2.3 → 1.3.0) or major (1.2.3 → 2.0.0) bump and creates git tag

**Current Version:** Check with `./scripts/version-manager.sh current`

### ⚠️ Manual Deployment (If Needed)

If you need to deploy without version management:

```bash
# MANDATORY: Simulates exactly what Railway does
./scripts/preflight-build.sh

# If it passes → safe to push
# If it fails → FIX ERRORS before pushing
```

### Deployment Methods

| Method | Time | Documentation |
|--------|------|---------------|
| **Version-Managed Deploy** | 3-5 min | **RECOMMENDED** - Handles versioning automatically |
| **Preflight Build** | 3-5 min | Manual preflight check (if not using deploy script) |
| **Full Validation** | 30 min | Safe for features, migrations, releases |
| **Quick Deploy** | 2 min | Fast for bug fixes, small API changes |

**📋 [Deployment Options - Complete Guide](./DEPLOYMENT_OPTIONS.md)** ← Start here

### Quick Commands

```bash
# 🎯 RECOMMENDED: Version-managed deployment
./scripts/deploy-to-production.sh

# Check current version
./scripts/version-manager.sh current

# Manual version management (if needed)
./scripts/version-manager.sh build      # Bump build number
./scripts/version-manager.sh patch      # Bump patch version
./scripts/version-manager.sh set 1.2.4  # Set version explicitly

# If build fails, debug with:
./scripts/debug-railway-build.sh

# Full validation (optional, takes 30 min)
./scripts/railway-ready-check.sh

# Quick deploy after preflight passes (legacy method)
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

# Get Railway logs (RECOMMENDED: Use Railway MCP in Composer)
# Or use helper script:
./scripts/railway-logs.sh errors api
./scripts/railway-logs.sh search api "error"
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

### 🔍 Error Investigation & Monitoring
- **[Railway MCP Setup](docs/MCP-RAILWAY-SETUP.md)** - **STANDARD METHOD** for getting logs/errors quickly
- **[Railway MCP vs CLI](docs/RAILWAY-MCP-VS-CLI.md)** - Why Railway MCP is better than CLI
- **[Railway MCP Status](docs/RAILWAY-MCP-STATUS.md)** - Current status and troubleshooting
- **[Railway MCP Troubleshooting](docs/MCP-RAILWAY-TROUBLESHOOTING.md)** - Fix common issues

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
