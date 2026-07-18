# 🚂 Railway Configuration - Source of Truth

**Last Updated**: January 2026  
**Project**: `fieldview-live`  
**Environment**: `production`

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     fieldview-live (production)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐       ┌──────────────┐                        │
│  │     api      │       │     web      │                        │
│  │ api.fieldview│       │www.fieldview │                        │
│  │    .live     │       │    .live     │                        │
│  │   (Express)  │       │  (Next.js)   │                        │
│  │    Online    │       │    Online    │                        │
│  └──────┬───────┘       └──────┬───────┘                        │
│         │                      │                                │
│         └──────────┬───────────┘                                │
│                    │                                            │
│         ┌──────────┴───────────┐                                │
│         │                      │                                │
│  ┌──────┴───────┐       ┌──────┴───────┐                        │
│  │    Redis     │       │   Postgres   │                        │
│  │    Online    │       │    Online    │                        │
│  │ redis-volume │       │postgres-volum│                        │
│  └──────────────┘       └──────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Service Configuration

### Service 1: `api` (Express Backend)

| Setting | Value |
|---------|-------|
| **Name** | `api` |
| **Domain** | `api.fieldview.live` |
| **Source** | GitHub: `YOLOVibeCode/fieldview-live` |
| **Branch** | `main` |
| **Root Directory** | `apps/api` |
| **Watch Paths** | `apps/api/**`, `packages/data-model/**` |
| **Auto Deploy** | ✅ **Enabled** |
| **Builder** | `NIXPACKS` |
| **Build Command** | `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @fieldview/data-model exec prisma generate --schema=./prisma/schema.prisma && pnpm --filter @fieldview/data-model build && pnpm --filter api build` |
| **Start Command** | `node dist/server.js` (migrations no longer run at startup) |
| **Port** | `4301` (auto-detected) |
| **Health Check** | `/health` |
| **Health Timeout** | `300s` |
| **Restart Policy** | `ON_FAILURE` |

### Service 2: `web` (Next.js Frontend)

| Setting | Value |
|---------|-------|
| **Name** | `web` |
| **Domain** | `www.fieldview.live` |
| **Source** | GitHub: `YOLOVibeCode/fieldview-live` |
| **Branch** | `main` |
| **Root Directory** | `apps/web` |
| **Watch Paths** | `apps/web/**`, `packages/data-model/**` |
| **Auto Deploy** | ✅ **Enabled** |
| **Builder** | `NIXPACKS` |
| **Build Command** | `cd ../.. && pnpm install && pnpm --filter @fieldview/data-model db:generate && pnpm --filter @fieldview/data-model build && pnpm --filter web build` |
| **Start Command** | `pnpm start` |
| **Port** | `4300` (auto-detected) |
| **Health Check** | `/` |
| **Health Timeout** | `300s` |
| **Restart Policy** | `ON_FAILURE` |

### Service 3: `Redis`

| Setting | Value |
|---------|-------|
| **Name** | `Redis` |
| **Type** | Railway Plugin |
| **Volume** | `redis-volume` |
| **Auto Deploy** | N/A (managed) |

### Service 4: `Postgres`

| Setting | Value |
|---------|-------|
| **Name** | `Postgres` |
| **Type** | Railway Plugin |
| **Volume** | `postgres-volume` |
| **Auto Deploy** | N/A (managed) |

---

## 🔑 Environment Variables

### API Service Variables

```bash
# Database (Railway reference)
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_PUBLIC_URL=${{Postgres.DATABASE_PUBLIC_URL}}

# Redis (Railway reference)
REDIS_URL=${{Redis.REDIS_URL}}

# Server Configuration
PORT=4301
NODE_ENV=production
LOG_LEVEL=info

# JWT Authentication
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=https://www.fieldview.live,https://fieldview.live

# Encryption
ENCRYPTION_KEY=<your-encryption-key>

# Square Payments (Production)
SQUARE_ENVIRONMENT=production
SQUARE_ACCESS_TOKEN=<production-access-token>
SQUARE_LOCATION_ID=<production-location-id>
SQUARE_WEBHOOK_SIGNATURE_KEY=<production-webhook-key>
SQUARE_APPLICATION_ID=<production-app-id>
SQUARE_APPLICATION_SECRET=<production-app-secret>
SQUARE_REDIRECT_URI=https://api.fieldview.live/api/owners/square/callback

# Platform Fee
PLATFORM_FEE_PERCENT=10

# Mux Streaming
MUX_TOKEN_ID=<your-mux-token-id>
MUX_TOKEN_SECRET=<your-mux-token-secret>

# Twilio SMS (Optional)
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
TWILIO_PHONE_NUMBER=<your-twilio-number>

# Email (Optional - for notifications)
SMTP_HOST=<your-smtp-host>
SMTP_PORT=587
SMTP_USER=<your-smtp-user>
SMTP_PASS=<your-smtp-password>
EMAIL_FROM=noreply@fieldview.live

# App URLs
APP_URL=https://api.fieldview.live
WEB_URL=https://www.fieldview.live
```

### Web Service Variables

```bash
# API Connection (Railway reference)
NEXT_PUBLIC_API_URL=https://api.fieldview.live

# Next.js Configuration
NODE_ENV=production
NEXTAUTH_SECRET=<your-nextauth-secret>
NEXTAUTH_URL=https://www.fieldview.live

# Square Web SDK (Client-side)
NEXT_PUBLIC_SQUARE_APPLICATION_ID=<production-app-id>
NEXT_PUBLIC_SQUARE_LOCATION_ID=<production-location-id>
NEXT_PUBLIC_SQUARE_ENVIRONMENT=production

# Direct Stream Admin Passwords
NEXT_PUBLIC_TCHS_ADMIN_PASSWORD=tchs2026
```

---

## 🚀 Auto-Deploy Configuration Steps

### Step 1: Navigate to Each Service

1. Go to **Railway Dashboard**: https://railway.app
2. Click on **fieldview-live** project
3. Click on **api** service

### Step 2: Configure GitHub Integration (API Service)

1. Click **Settings** tab
2. Find **Source** section
3. Click **Connect Repo** or verify GitHub connection
4. Set:
   - **Repository**: `YOLOVibeCode/fieldview-live`
   - **Branch**: `main`
   - **Root Directory**: `apps/api`
5. Find **Deploy** section
6. **Enable Auto Deploy**: Toggle ON ✅
7. Set **Watch Paths** (if available):
   - `apps/api/**`
   - `packages/data-model/**`

### Step 3: Configure GitHub Integration (Web Service)

1. Click on **web** service
2. Click **Settings** tab
3. Repeat steps above with:
   - **Root Directory**: `apps/web`
   - **Watch Paths**:
     - `apps/web/**`
     - `packages/data-model/**`

### Step 4: Verify GitHub Webhook

1. Go to GitHub: https://github.com/YOLOVibeCode/fieldview-live/settings/hooks
2. You should see a Railway webhook
3. If missing, Railway will recreate it when you enable auto-deploy

---

## 📁 Configuration Files (Railway as Code)

### `apps/api/railway.toml`

```toml
[build]
builder = "NIXPACKS"
buildCommand = "cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @fieldview/data-model exec prisma generate --schema=./prisma/schema.prisma && pnpm --filter @fieldview/data-model build && pnpm --filter api build"

[deploy]
# Temporarily skip migrations to get server running
startCommand = "node dist/server.js"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
```

### `apps/web/railway.toml`

```toml
[build]
builder = "NIXPACKS"
buildCommand = "cd ../.. && pnpm install && pnpm --filter @fieldview/data-model db:generate && pnpm --filter @fieldview/data-model build && pnpm --filter web build"

[deploy]
startCommand = "pnpm start"
healthcheckPath = "/"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
```

### Project-level `railway.json`

There is **no** project-level `railway.json` in this repo. Configuration is defined
per-service in the `apps/api/railway.toml` and `apps/web/railway.toml` files shown
above (these are the source of truth). Any project-wide defaults (replicas, restart
retries) are managed in the Railway dashboard, not in a committed file.

---

## ⚠️ What You May Have Removed

Based on the documentation, you previously had a **`fieldview-live` GitHub integration service** that handled auto-deploy. This service was removed.

**What happened:**
- The old `fieldview-live` service was connected to GitHub
- It triggered deployments for both `api` and `web` services
- When removed, the GitHub webhook and auto-deploy trigger were lost

**Solution:**
- Each service (`api`, `web`) must now be **individually connected** to GitHub
- Each service needs **Auto Deploy enabled** in its own settings

---

## 🔄 Deployment Flow (After Configuration)

```
┌──────────────────────────────────────────────────────────┐
│                    Developer Workflow                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. Push to GitHub                                       │
│     git push origin main                                 │
│         │                                                │
│         ▼                                                │
│  2. GitHub Webhook triggers Railway                      │
│     POST webhook → Railway                               │
│         │                                                │
│         ▼                                                │
│  3. Railway evaluates watch paths                        │
│     - apps/api/** changed? → Build API                   │
│     - apps/web/** changed? → Build Web                   │
│     - packages/data-model/** → Build BOTH                │
│         │                                                │
│         ▼                                                │
│  4. Railway builds service(s)                            │
│     - Install dependencies                               │
│     - Generate Prisma client                             │
│     - Compile TypeScript                                 │
│         │                                                │
│         ▼                                                │
│  5. Migrations no longer run at startup                  │
│     (removed from start cmd; see note below)             │
│         │                                                │
│         ▼                                                │
│  6. Start service(s)                                     │
│     - API: node dist/server.js                           │
│     - Web: pnpm start                                    │
│         │                                                │
│         ▼                                                │
│  7. Health check passes                                  │
│     GET /health → 200 OK                                 │
│         │                                                │
│         ▼                                                │
│  8. Traffic switches to new version ✅                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🛠️ Troubleshooting

### Auto-Deploy Not Triggering

1. **Check GitHub connection**:
   - Go to service → Settings → Source
   - Verify repo is connected
   - Verify branch is `main`

2. **Check Auto Deploy toggle**:
   - Settings → Deploy → Auto Deploy
   - Must be **ON** ✅

3. **Check GitHub webhook**:
   - GitHub repo → Settings → Webhooks
   - Railway webhook should be listed
   - Recent deliveries should show

4. **Check watch paths**:
   - If configured, only changes in those paths trigger builds
   - `packages/data-model/**` should be included for schema changes

### Build Fails

1. **TypeScript errors**: Pre-existing, check build logs
2. **Prisma errors**: Ensure `db:generate` runs in build command
3. **Module errors**: Check `pnpm install` runs from root

### Migration Fails

> **Note**: Migrations are **not** run automatically on deploy — they were removed
> from the API start command (now just `node dist/server.js`). Run them manually.

1. **Check DATABASE_URL**: Verify Railway variable reference
2. **Check Postgres is running**: Look at Postgres service status
3. **Manual run**: `railway run --service api pnpm db:migrate`

---

## 📋 Checklist: Fix Auto-Deploy

- [ ] Open Railway Dashboard
- [ ] Click `api` service → Settings
- [ ] Verify GitHub repo is connected
- [ ] Enable **Auto Deploy** toggle
- [ ] Set **Root Directory**: `apps/api`
- [ ] Click `web` service → Settings
- [ ] Verify GitHub repo is connected
- [ ] Enable **Auto Deploy** toggle
- [ ] Set **Root Directory**: `apps/web`
- [ ] Push test commit to verify
- [ ] Check deployment starts automatically

---

## 🎯 Quick Commands

```bash
# Check current git status
git log --oneline -1

# Test push (will trigger auto-deploy after config)
git commit --allow-empty -m "chore: test auto-deploy"
git push origin main

# Manual deploy via CLI (fallback)
railway up --service api
railway up --service web

# Check logs
railway logs --service api --follow
railway logs --service web --follow

# Force rebuild
railway redeploy --service api
railway redeploy --service web
```

---

## 📞 Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **GitHub Issues**: https://github.com/YOLOVibeCode/fieldview-live/issues

---

**Last verified working**: This configuration was working before the `fieldview-live` GitHub integration service was removed. Following the checklist above will restore auto-deploy functionality.

