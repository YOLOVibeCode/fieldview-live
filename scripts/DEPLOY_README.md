# 🚀 Railway Deployment Script

**Safe, resilient, production-grade deployment for FieldView.Live**

---

## ✨ Features

- ✅ **Pre-flight checks** - Verifies git status, Railway auth, branch
- ✅ **Database backup** - Creates PostgreSQL backup before migrations
- ✅ **Idempotent migrations** - Safe to run multiple times
- ✅ **Dry-run mode** - See what would happen without changes
- ✅ **Rollback support** - Instructions for reverting failed deployments
- ✅ **Comprehensive logging** - All output saved to timestamped log file
- ✅ **Deployment verification** - Checks API/Web health after deploy
- ✅ **Error handling** - Exits safely on any failure

---

## 📋 Prerequisites

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login to Railway
```bash
railway login
```

### 3. Install PostgreSQL Client (for backups)
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Or skip backups with --skip-backup flag
```

### 4. Get Production Database URL
```bash
# In Railway dashboard, go to Postgres service → Variables
# Copy DATABASE_PUBLIC_URL value
export DATABASE_PUBLIC_URL='postgresql://postgres:XXX@XXX.railway.app:5432/railway'
```

---

## 🎯 Quick Start

### Standard Deployment (Recommended)
```bash
# Export database URL
export DATABASE_PUBLIC_URL='postgresql://...'

# Run deployment
./scripts/deploy-railway.sh
```

### Dry Run (See What Would Happen)
```bash
./scripts/deploy-railway.sh --dry-run
```

### Force Deploy (Skip All Prompts)
```bash
./scripts/deploy-railway.sh --force
```

---

## 📖 Usage Examples

### Deploy Everything with Safeguards
```bash
export DATABASE_PUBLIC_URL='postgresql://...'
./scripts/deploy-railway.sh
```

**This will**:
1. ✅ Check git status and Railway auth
2. ✅ Create database backup
3. ✅ Run migrations
4. ✅ Deploy API and Web services
5. ✅ Wait for deployment to complete
6. ✅ Verify endpoints are responding

---

### Dry Run (Test Mode)
```bash
./scripts/deploy-railway.sh --dry-run
```

**Output**:
```
🚀 Starting Railway deployment...
⚠️  DRY RUN MODE - No changes will be made
✅ Pre-flight checks passed
ℹ️  [DRY RUN] Would backup database to: backup-20260109-103045.sql
ℹ️  [DRY RUN] Would generate Prisma client
ℹ️  [DRY RUN] Would run: prisma migrate deploy
ℹ️  [DRY RUN] Would deploy api service
ℹ️  [DRY RUN] Would deploy web service
🎉 Deployment complete!
```

---

### Deploy Only API Service
```bash
./scripts/deploy-railway.sh --service api
```

---

### Quick Deploy (Skip Backup, No Prompts)
```bash
./scripts/deploy-railway.sh --skip-backup --force
```

⚠️ **Warning**: Not recommended for production!

---

### Skip Migrations (Code-Only Deploy)
```bash
./scripts/deploy-railway.sh --skip-migration
```

Use this when you're deploying frontend-only changes.

---

## 🔧 Command-Line Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Run without making changes (test mode) |
| `--skip-backup` | Skip database backup (not recommended) |
| `--skip-migration` | Skip running database migrations |
| `--force` | Skip all prompts (auto-approve) |
| `--service <name>` | Deploy specific service: `api`, `web`, or `both` |
| `--help` | Show usage information |

---

## 🛡️ Safety Features

### 1. Pre-flight Checks
```
✅ Verifies you're in project root
✅ Checks Railway CLI is installed
✅ Confirms Railway authentication
✅ Warns if not on main branch
✅ Detects uncommitted changes
✅ Checks if commits are pushed
```

### 2. Database Backup
```bash
# Automatic backup before migrations
backup-20260109-103045.sql

# Restore if needed:
psql $DATABASE_PUBLIC_URL < backup-20260109-103045.sql
```

### 3. Error Handling
```bash
# Script exits immediately on any error
set -euo pipefail

# Rollback instructions printed on failure
```

### 4. Comprehensive Logging
```bash
# All output saved to timestamped log
deploy-20260109-103045.log

# Check logs for detailed information
cat deploy-20260109-103045.log
```

---

## 🔄 Rollback Procedure

If deployment fails, the script provides rollback instructions:

### Rollback Database
```bash
# Restore from backup
psql $DATABASE_PUBLIC_URL < backup-20260109-103045.sql
```

### Rollback Code
```bash
# Option 1: Revert last commit
git revert HEAD
git push origin main

# Option 2: Reset to specific commit
git reset --hard <previous-commit-hash>
git push origin main --force  # ⚠️ Use with caution!

# Option 3: Manual deploy via Railway dashboard
# Go to Railway → Select service → Deployments → Redeploy previous version
```

---

## 📊 Output Example

```bash
$ ./scripts/deploy-railway.sh

🚀 Starting Railway deployment...
[2026-01-09 10:30:45] Log file: deploy-20260109-103045.log
[2026-01-09 10:30:45] Running pre-flight checks...
✅ Pre-flight checks passed
[2026-01-09 10:30:46] Creating database backup...
✅ Database backed up to backup-20260109-103045.sql (2.3M)
[2026-01-09 10:30:52] Running database migrations...
[2026-01-09 10:30:52] Generating Prisma client...
[2026-01-09 10:30:54] Checking migration status...
[2026-01-09 10:30:55] Applying migrations...
✅ Migrations applied successfully
[2026-01-09 10:30:56] Deploying api service...
✅ api deployment triggered
[2026-01-09 10:30:58] Deploying web service...
✅ web deployment triggered
[2026-01-09 10:31:00] Waiting for api deployment to complete...
✅ api deployment completed
[2026-01-09 10:31:30] Waiting for web deployment to complete...
✅ web deployment completed
[2026-01-09 10:31:45] Verifying deployment...
[2026-01-09 10:31:45] Checking API endpoint...
✅ API is responding
✅ New scoreboard fields detected ✅
[2026-01-09 10:31:46] Checking Web endpoint...
✅ Web is responding

🎉 Deployment complete!

ℹ️  📊 Check Railway dashboard: https://railway.app
ℹ️  📝 Deployment log: deploy-20260109-103045.log
ℹ️  💾 Database backup: backup-20260109-103045.sql

✅ All systems operational
```

---

## 🧪 Verification

After deployment, the script automatically verifies:

### API Verification
```bash
# Checks bootstrap endpoint
curl https://api.fieldview.live/api/direct/tchs/bootstrap

# Verifies new scoreboard fields are present:
✅ scoreboardEnabled
✅ scoreboardHomeTeam
✅ scoreboardAwayTeam
✅ scoreboardHomeColor
✅ scoreboardAwayColor
```

### Web Verification
```bash
# Checks homepage
curl https://www.fieldview.live

# Verifies Next.js is rendering
✅ HTML content returned
```

---

## 🐛 Troubleshooting

### Error: "Railway CLI not installed"
```bash
npm install -g @railway/cli
```

### Error: "Not logged into Railway"
```bash
railway login
```

### Error: "DATABASE_PUBLIC_URL not set"
```bash
# Get from Railway dashboard
export DATABASE_PUBLIC_URL='postgresql://...'

# Or add to your shell profile (~/.zshrc or ~/.bashrc)
echo "export DATABASE_PUBLIC_URL='postgresql://...'" >> ~/.zshrc
source ~/.zshrc
```

### Error: "pg_dump not found"
```bash
# Install PostgreSQL client
brew install postgresql  # macOS
sudo apt-get install postgresql-client  # Linux

# Or skip backup (not recommended)
./scripts/deploy-railway.sh --skip-backup
```

### Error: "Failed to link Railway project"
```bash
# Manually link
cd /path/to/fieldview.live
railway link

# Select your project from the list
```

### Migration Failed
```bash
# Check migration logs
cat deploy-20260109-103045.log | grep -A 20 "migration"

# Restore database from backup
psql $DATABASE_PUBLIC_URL < backup-20260109-103045.sql

# Fix migration issue and retry
./scripts/deploy-railway.sh
```

### Deployment Times Out
```bash
# Check Railway dashboard for build status
open https://railway.app

# View service logs in Railway dashboard
# Services → api → Logs
# Services → web → Logs
```

---

## 🎯 Best Practices

### Before Running
1. ✅ Review recent commits: `git log --oneline -5`
2. ✅ Test migrations locally first
3. ✅ Run dry-run: `./scripts/deploy-railway.sh --dry-run`
4. ✅ Notify team of deployment

### During Deployment
1. ✅ Monitor Railway dashboard
2. ✅ Watch deployment logs
3. ✅ Keep backup files safe

### After Deployment
1. ✅ Verify endpoints manually
2. ✅ Check API responses for new fields
3. ✅ Test critical user flows
4. ✅ Monitor error logs for 10 minutes

---

## 📁 Generated Files

| File | Purpose | Keep? |
|------|---------|-------|
| `deploy-YYYYMMDD-HHMMSS.log` | Deployment logs | ✅ Yes (1 week) |
| `backup-YYYYMMDD-HHMMSS.sql` | Database backup | ✅ Yes (1 week) |
| `.railway/config.json` | Railway project link | ✅ Yes (gitignored) |

---

## 🔒 Security Notes

- ✅ Script uses `set -euo pipefail` for safe execution
- ✅ Database credentials never logged
- ✅ Backup files are local-only (not committed)
- ✅ All prompts require explicit confirmation
- ✅ Dry-run mode available for testing

---

## 📞 Support

### Script Issues
```bash
# Run with bash debug mode
bash -x ./scripts/deploy-railway.sh --dry-run

# Check logs
cat deploy-*.log | tail -100
```

### Railway Issues
- Dashboard: https://railway.app
- Docs: https://docs.railway.app
- Status: https://status.railway.app

---

## 🎉 Success!

After successful deployment:
- ✅ API: https://api.fieldview.live
- ✅ Web: https://www.fieldview.live
- ✅ Database: Migrations applied
- ✅ Services: Online and verified

**Happy deploying!** 🚀

