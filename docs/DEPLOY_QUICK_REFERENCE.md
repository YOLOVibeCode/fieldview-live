# 🚀 Railway Deployment - Quick Reference Card

**Last Updated**: January 2026

---

## ⚡ Three Commands You Need

```bash
# 1️⃣ Full Validation (30 min) - Features, migrations
./scripts/railway-ready-check.sh

# 2️⃣ Quick Deploy (2 min) - Bug fixes, small changes  
./scripts/yolo-deploy.sh api   # or 'web'

# 3️⃣ Hotfix (30 sec) - Emergency only
pnpm --filter api type-check && git push
```

---

## 🎯 Which One?

```
Database migration? → Full Validation
Production down?    → Hotfix
Small change?       → Quick Deploy
Not sure?           → Full Validation
```

---

## 📊 Post-Deploy

```bash
# Monitor logs
railway logs --service api --follow

# Check health
curl https://api.fieldview.live/health

# Run migrations (if schema changed)
railway run --service api pnpm db:migrate

# Rollback (if broken)
railway rollback --service api
```

---

## 📚 Read More

**Full Documentation**: `DEPLOYMENT_OPTIONS.md`

---

**That's it. Three commands. Choose wisely.** 🎯
