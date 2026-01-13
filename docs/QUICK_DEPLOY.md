# 🚀 Quick Deploy Guide

## One-Line Deploy

```bash
export DATABASE_PUBLIC_URL='<from-railway>' && ./scripts/deploy-railway.sh --force
```

---

## Setup (First Time Only)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Get database URL from Railway dashboard
export DATABASE_PUBLIC_URL='postgresql://postgres:XXX@XXX.railway.app:5432/railway'

# 4. (Optional) Add to shell profile for persistence
echo "export DATABASE_PUBLIC_URL='postgresql://...'" >> ~/.zshrc
```

---

## Common Commands

```bash
# Full deploy with safety checks
./scripts/deploy-railway.sh

# Test what would happen (no changes)
./scripts/deploy-railway.sh --dry-run

# Deploy without prompts (for CI/CD)
./scripts/deploy-railway.sh --force

# Deploy only API
./scripts/deploy-railway.sh --service api

# Deploy only Web
./scripts/deploy-railway.sh --service web

# Skip database backup (faster, less safe)
./scripts/deploy-railway.sh --skip-backup --force

# Code-only deploy (skip migrations)
./scripts/deploy-railway.sh --skip-migration --force
```

---

## What the Script Does

1. ✅ **Pre-flight checks** - Git status, Railway auth
2. ✅ **Database backup** - Creates backup-YYYYMMDD-HHMMSS.sql
3. ✅ **Run migrations** - Applies new database changes
4. ✅ **Deploy services** - Triggers Railway deployment
5. ✅ **Verify** - Checks API & Web are responding

---

## Rollback (If Needed)

```bash
# Rollback database
psql $DATABASE_PUBLIC_URL < backup-20260109-103045.sql

# Rollback code
git revert HEAD && git push origin main
```

---

## Troubleshooting

### Error: "DATABASE_PUBLIC_URL not set"
```bash
# Get from Railway dashboard → Postgres → Variables
export DATABASE_PUBLIC_URL='postgresql://...'
```

### Error: "Railway CLI not installed"
```bash
npm install -g @railway/cli
```

### Error: "Not logged into Railway"
```bash
railway login
```

### Deployment stuck?
```bash
# Check Railway dashboard
open https://railway.app
```

---

## Files Created

- `deploy-YYYYMMDD-HHMMSS.log` - Deployment logs
- `backup-YYYYMMDD-HHMMSS.sql` - Database backup

Keep these for 1 week, then delete.

---

## Production URLs

- **API**: https://api.fieldview.live
- **Web**: https://www.fieldview.live
- **Dashboard**: https://railway.app

---

## Full Documentation

See `scripts/DEPLOY_README.md` for complete usage guide.

