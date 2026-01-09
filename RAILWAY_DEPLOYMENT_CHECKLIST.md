# 🚀 Railway Deployment Checklist - v2.0.0

## ✅ Pre-Deployment Complete

- ✅ All code committed to `main` branch
- ✅ Tagged as `v2.0.0`
- ✅ Pushed to GitHub (Railway auto-deploy triggered)
- ✅ 48 backend tests passing
- ✅ 53 E2E tests ready

---

## 🗄️ Database Migration Required

Railway will need to apply these migrations:

### Migration 1: `20260109014523_add_direct_stream_admin_settings`
- Adds paywall settings to DirectStream

### Migration 2: `20260109022630_add_admin_password_to_direct_stream`
- Adds admin password field

### Migration 3: `20260109050000_add_social_producer_and_email_features`
- **CRITICAL** - Adds GameScoreboard table
- Adds email notification fields
- Adds saved payment fields

**Railway Command** (if not auto-applied):
```bash
railway run -- npx prisma migrate deploy
```

---

## 🔧 Environment Variables to Verify on Railway

### Required (Already Set)
- ✅ `DATABASE_URL`
- ✅ `DATABASE_PUBLIC_URL`
- ✅ `REDIS_URL`
- ✅ `JWT_SECRET`
- ✅ `DIRECT_TCHS_ADMIN_PASSWORD`

### New (Optional - for Email Notifications)
- `SMTP_HOST` (default: localhost)
- `SMTP_PORT` (default: 4305)
- `EMAIL_FROM` (default: notifications@fieldview.live)
- `WEB_URL` (for email links)

**Note**: Email notifications will work without these in production (using SendGrid/AWS SES when configured)

---

## 🚦 Post-Deployment Verification

### 1. Check Railway Deployment Status
- Visit Railway dashboard
- Verify both `api` and `web` services deployed successfully
- Check build logs for any errors

### 2. Verify Database Migrations
```bash
# SSH into Railway API service
railway run --service api

# Check migrations
npx prisma migrate status
```

**Expected Output**:
```
✓ All migrations applied successfully
✓ Database schema is up to date
```

### 3. Test API Endpoints

**Health Check**:
```bash
curl https://api.fieldview.live/health
```

**Bootstrap (TCHS)**:
```bash
curl https://api.fieldview.live/api/direct/tchs/bootstrap
```

**Scoreboard**:
```bash
curl https://api.fieldview.live/api/direct/tchs/scoreboard
```

### 4. Test Web UI

Visit these URLs and verify:

**TCHS Stream Page**:
- ✅ `https://fieldview.live/direct/tchs`
- Verify video player loads
- Verify chat corner badge appears
- Verify scoreboard overlay shows (if configured)

**Admin Panel**:
- Click "Edit Stream"
- Enter password: `tchs2026`
- Verify admin panel unlocks
- Verify Social Producer Panel appears
- Verify Viewer Analytics Panel appears

### 5. Test Core Features

**Social Producer Panel**:
- ✅ Can update team names
- ✅ Can change jersey colors
- ✅ Can increment/decrement scores
- ✅ Can start/pause/reset clock
- ✅ Can toggle scoreboard visibility

**Scoreboard Overlay**:
- ✅ Displays team names and colors
- ✅ Shows current scores
- ✅ Shows running clock
- ✅ Updates in real-time

**Viewer Analytics**:
- ✅ Shows total active count
- ✅ Lists active viewers
- ✅ Shows green/red status indicators
- ✅ Auto-refreshes every 10 seconds

**Paywall (if enabled)**:
- ✅ Modal appears when configured
- ✅ Shows admin custom message
- ✅ Detects saved payment methods
- ✅ Payment flow works

### 6. Check Cron Job

**Email Reminders**:
- Cron job runs every minute
- Check Railway logs for: `"Checking for streams needing reminders"`
- Verify no errors in email sending

---

## 🐛 Troubleshooting

### Issue: Migration fails on Railway

**Solution**:
```bash
# Connect to Railway DB
railway run --service api

# Reset migrations (ONLY if safe)
npx prisma migrate reset --skip-seed

# Apply migrations
npx prisma migrate deploy
```

### Issue: Module not found errors

**Solution**:
```bash
# Rebuild data-model package
railway run --service api -- pnpm --filter @fieldview/data-model build

# Regenerate Prisma client
railway run --service api -- npx prisma generate
```

### Issue: Scoreboard not appearing

**Cause**: No scoreboard initialized for stream

**Solution**:
1. Login as admin
2. Open Producer Panel
3. Scoreboard should auto-initialize
4. OR manually create via API: `POST /api/direct/:slug/scoreboard/setup`

### Issue: Email notifications not sending

**Check**:
1. Is SMTP configured in Railway environment?
2. Is `scheduledStartAt` set on DirectStream?
3. Check cron job logs in Railway

**Temporary Workaround**:
- Emails can be disabled without affecting other features
- Configure SendGrid/AWS SES for production emails

---

## 📊 Monitoring After Deployment

### Railway Logs to Watch

**API Service**:
- Migration status on startup
- Cron job execution every minute
- API request logs
- Database connection status

**Web Service**:
- Next.js build completion
- Page render logs
- API fetch errors (if any)

### Key Metrics

- **Response Times**: API < 200ms, Web < 1s
- **Error Rate**: < 1%
- **Database Connections**: Stable pool
- **Memory Usage**: API < 512MB, Web < 1GB

---

## ✅ Deployment Success Criteria

- [ ] Both services deployed (green status)
- [ ] All 3 migrations applied successfully
- [ ] Health endpoint returns 200
- [ ] TCHS page loads without errors
- [ ] Admin panel unlocks with password
- [ ] Social Producer Panel visible
- [ ] Scoreboard overlay renders
- [ ] Viewer Analytics shows data
- [ ] Chat works (corner peek UI)
- [ ] No critical errors in logs
- [ ] Database performance normal

---

## 🎯 Rollback Plan (if needed)

If deployment fails:

```bash
# Revert to previous version
git revert HEAD
git push origin main

# OR checkout previous tag
git checkout v1.x.x
git push origin main --force
```

**Railway will auto-deploy the rollback**

---

## 📞 Support Contacts

- **Railway Dashboard**: https://railway.app
- **GitHub Repository**: https://github.com/YOLOVibeCode/fieldview-live
- **Logs**: Railway Dashboard → Service → Deployments → View Logs

---

**Deployment initiated: v2.0.0**  
**Auto-deploy triggered by GitHub push**  
**Expected completion: 5-10 minutes**

🚀 **Railway is deploying your code now!**

