# Deployment Options - Source of Truth

**Last Updated**: January 2026  
**Platform**: Railway  
**Services**: `api` (Express) + `web` (Next.js) + `postgres` + `redis`

---

## 📋 Available Deployment Methods

| Method | Time | Safety | Use Case |
|--------|------|--------|----------|
| [Full Validation](#-full-validation-30-min) | 30 min | ✅✅✅ | Major features, migrations, releases |
| [Quick Deploy](#-quick-deploy-2-min) | 2 min | ✅✅ | Bug fixes, small changes, API tweaks |
| [Hotfix](#-hotfix-30-sec) | 30 sec | ⚠️ | Production emergencies only |

---

## 🛡️ Full Validation (30 min)

**When to use:**
- New features (chat, payments, authentication)
- Database schema changes
- External API integration updates
- Before major releases
- When you need 95% confidence

**Command:**
```bash
./scripts/railway-ready-check.sh
```

**What it validates:**
1. TypeScript compilation
2. Package builds (data-model, api, web)
3. API integration tests (auth, payments, chat)
4. E2E chat tests (viewer unlock → real-time messaging)
5. Environment variable checks
6. Railway configuration validation

**If successful:**
```bash
git add -A
git commit -m "feat: description of changes"
git push origin main
```

**Post-deployment:**
```bash
# Run migrations if needed
railway run --service api pnpm db:migrate

# Monitor
railway logs --service api --follow
```

---

## ⚡ Quick Deploy (2 min)

**When to use:**
- Small API changes (1-2 files)
- Bug fixes
- Logging updates
- Error message corrections
- Config tweaks (no schema changes)

**Command:**
```bash
./scripts/yolo-deploy.sh api   # For API changes
./scripts/yolo-deploy.sh web   # For Web changes
```

**What it validates:**
1. TypeScript type-check
2. Build compilation
3. That's it - Railway handles the rest

**Safe for:**
- ✅ Error message fixes
- ✅ Logging additions
- ✅ Response format changes
- ✅ Business logic fixes (small)
- ✅ New API endpoints (non-critical)

**NOT safe for:**
- ❌ Database schema changes
- ❌ Payment flow changes
- ❌ Authentication changes
- ❌ New environment variables

---

## 🔥 Hotfix (30 sec)

**When to use:**
- Production is DOWN
- Critical security issue
- Need to revert bad deploy
- Emergency only

**Command:**
```bash
# Option 1: Type-check only
pnpm --filter api type-check && git add -A && git commit -m "hotfix" && git push

# Option 2: Just push (use Railway's validation)
git add -A && git commit -m "hotfix: critical fix" && git push origin main
```

**Rollback if needed:**
```bash
railway rollback --service api   # Or 'web'
```

Railway will automatically rollback if the service crashes on startup.

---

## 🎯 Decision Tree

```
Is this a schema migration? 
├─ YES → Use Full Validation
└─ NO → Is production down?
    ├─ YES → Use Hotfix
    └─ NO → Is it a small change (<3 files)?
        ├─ YES → Use Quick Deploy
        └─ NO → Use Full Validation
```

---

## 🚀 Railway Deployment Flow

### Automatic Deployment:
```
git push origin main
    ↓
Railway detects push
    ↓
Builds API service
    ↓
Builds Web service
    ↓
Health checks pass
    ↓
Traffic switches to new version
    ↓
Old version shuts down
```

### Manual Migration (After Deploy):
```bash
# Only needed if schema changed
railway run --service api pnpm db:migrate
```

---

## 🛡️ Railway Safety Features

Railway protects you automatically:

1. **Health Checks**: Service must respond to `/health` endpoint
2. **Zero-Downtime**: Old version runs until new one is healthy
3. **Auto-Rollback**: Crashes automatically trigger rollback
4. **Build Validation**: Won't deploy if build fails

---

## 📊 Monitoring

### Check Deployment Status:
```bash
# View live logs
railway logs --service api --follow
railway logs --service web --follow

# Check service health
curl https://api.fieldview.live/health
curl https://fieldview.live
```

### Quick Health Check:
```bash
# API
curl -f https://api.fieldview.live/health || echo "API DOWN"

# Web
curl -f https://fieldview.live || echo "WEB DOWN"

# CORS
curl -H "Origin: https://fieldview.live" https://api.fieldview.live/health -I | grep -i "access-control"
```

---

## 🔧 Environment Variables

### Required for Railway:

**Automatic (Railway provides):**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

**Manual (You must set):**

**API Service:**
```bash
# Security
JWT_SECRET=<openssl rand -base64 32>
ENCRYPTION_KEY=<openssl rand -base64 32>

# Streaming (Mux)
MUX_TOKEN_ID=<mux-token-id>
MUX_TOKEN_SECRET=<mux-token-secret>

# Payments (Square)
SQUARE_ENVIRONMENT=production
SQUARE_ACCESS_TOKEN=<production-token>
SQUARE_LOCATION_ID=<location-id>
SQUARE_WEBHOOK_SIGNATURE_KEY=<webhook-key>
SQUARE_APPLICATION_ID=<app-id>
SQUARE_APPLICATION_SECRET=<app-secret>
SQUARE_REDIRECT_URI=https://api.fieldview.live/api/owners/square/callback

# SMS (Twilio)
TWILIO_ACCOUNT_SID=<account-sid>
TWILIO_AUTH_TOKEN=<auth-token>
TWILIO_PHONE_NUMBER=<phone-number>

# Configuration
PORT=3001
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGIN=https://fieldview.live
```

**Web Service:**
```bash
NEXT_PUBLIC_API_URL=https://api.fieldview.live
PORT=3000
NODE_ENV=production
```

---

## ⚠️ Common Issues

### Build Fails
**Symptom**: Railway shows "Build failed"  
**Fix**: Run locally first: `pnpm build`

### Service Won't Start
**Symptom**: Railway keeps restarting service  
**Fix**: Check logs: `railway logs --service api --follow`

### Database Connection Fails
**Symptom**: "Connection refused" or "ECONNREFUSED"  
**Fix**: Verify `DATABASE_URL` is set in Railway variables

### CORS Errors
**Symptom**: Frontend can't call API  
**Fix**: Set `CORS_ORIGIN=https://fieldview.live` in API service

### Migration Fails
**Symptom**: Schema mismatch errors  
**Fix**: Run: `railway run --service api pnpm db:migrate`

---

## 🎬 First-Time Railway Setup

### 1. Create Railway Project:
```bash
npm install -g @railway/cli
railway login
cd /Users/admin/Dev/YOLOProjects/fieldview.live
railway init
```

### 2. Add Services:
```bash
railway add --service postgres
railway add --service redis
```

### 3. Deploy API:
- Railway Dashboard → New → GitHub Repo
- Select `fieldview.live` repository
- Service name: `api`
- Root Directory: `apps/api`
- Add environment variables (see above)
- Deploy

### 4. Deploy Web:
- Railway Dashboard → New → GitHub Repo
- Select `fieldview.live` repository
- Service name: `web`
- Root Directory: `apps/web`
- Add environment variables (see above)
- Deploy

### 5. Run Initial Migration:
```bash
railway run --service api pnpm db:migrate
```

---

## 📚 Related Documentation

- **Full Deployment Guide**: `DEPLOY_TO_RAILWAY.md`
- **Environment Setup**: `ENV_SETUP_GUIDE.md`
- **Production Checklist**: `PRODUCTION_READINESS_CHECKLIST.md`

---

## 🎯 Quick Reference

```bash
# Full validation before deploy
./scripts/railway-ready-check.sh

# Quick API change
./scripts/yolo-deploy.sh api

# Quick Web change
./scripts/yolo-deploy.sh web

# Hotfix (type-check only)
pnpm --filter api type-check && git push

# Emergency rollback
railway rollback --service api

# Monitor logs
railway logs --service api --follow

# Run migration
railway run --service api pnpm db:migrate

# Check health
curl https://api.fieldview.live/health
```

---

**Remember**: Railway has your back with automatic rollbacks. When in doubt, push and monitor. 🚀

