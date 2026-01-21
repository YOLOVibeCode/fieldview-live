# Local Render Verification & Production Cache Clear

**Date**: January 21, 2026  
**Status**: ✅ Local cache cleared | ⏳ Preflight build in progress

---

## ✅ What's Been Done

### 1. **Local Cache Cleared**
- ✅ Killed Next.js dev processes
- ✅ Removed `.next`, `.swc`, and `node_modules/.cache`
- ✅ Preflight build started (simulating Railway build)

### 2. **Production Cache Clear Script Created**
- ✅ Created `scripts/force-clear-production-cache.sh`
- ✅ Script triggers fresh Railway deployments with `--no-cache`
- ✅ Supports clearing `api`, `web`, or `both` services

---

## 🔍 Verify Local Rendering

### Step 1: Start Dev Servers (if not running)

```bash
# Terminal 1: Start API
cd apps/api && pnpm dev

# Terminal 2: Start Web
cd apps/web && pnpm dev
```

### Step 2: Test Local Pages

**Test Direct Stream Page:**
```bash
# Open in browser:
http://localhost:4300/direct/tchs/soccer-20260120-varsity

# Or test API bootstrap:
curl http://localhost:4301/api/direct/tchs/bootstrap | jq .
```

**Expected Results:**
- ✅ Page loads without errors
- ✅ Admin panel accessible
- ✅ Stream placeholder shows if no stream URL
- ✅ All `data-testid` attributes present (automation-friendly)
- ✅ Console logs visible for debugging

### Step 3: Check Console Logs

Open browser DevTools (F12) and verify:
- ✅ `[DirectStream] 🚀 Fetching bootstrap from: ...`
- ✅ `[DirectStream] ✅ Bootstrap loaded: ...`
- ✅ `[AdminPanel] 🎬 Component mounted/rendered`
- ✅ No red error messages

---

## 🧹 Force Clear Production Cache

### Option A: Use the Script (Recommended)

```bash
# Clear both API and Web
./scripts/force-clear-production-cache.sh both

# Or clear individually
./scripts/force-clear-production-cache.sh api
./scripts/force-clear-production-cache.sh web
```

**What it does:**
1. Triggers fresh Railway deployment with `--no-cache`
2. Forces rebuild from scratch
3. Clears Railway build cache
4. Shows deployment status

### Option B: Manual Railway Commands

```bash
# Clear API cache
cd apps/api
railway up --detach --no-cache

# Clear Web cache
cd apps/web
railway up --detach --no-cache
```

### Option C: Via Railway Dashboard

1. Go to https://railway.app
2. Select project → `api` service
3. Click "Settings" → "Redeploy" → "Clear Build Cache"
4. Repeat for `web` service

---

## ⏱️ Timeline

| Step | Duration | Status |
|------|---------|-------|
| Preflight build | ~5-7 min | ⏳ In progress |
| Local dev restart | ~30 sec | ✅ Ready |
| Production redeploy | ~5-10 min | ⏳ Pending |
| CDN cache clear | ~5-30 min | ⏳ Auto |

---

## ✅ Verification Checklist

### Local Verification
- [ ] Dev servers running (`lsof -i :4300 -i :4301`)
- [ ] Homepage loads (`http://localhost:4300`)
- [ ] Direct stream page loads (`/direct/tchs/soccer-20260120-varsity`)
- [ ] Admin panel unlocks with password
- [ ] Console logs visible (no errors)
- [ ] All `data-testid` attributes present

### Production Verification
- [ ] Preflight build passes (`./scripts/preflight-build.sh`)
- [ ] Code committed and pushed (`git status`)
- [ ] Railway deployments triggered
- [ ] Production site loads (`https://fieldview.live`)
- [ ] Test in incognito window (bypasses browser cache)
- [ ] Console logs match local behavior

---

## 🐛 Troubleshooting

### Local: "Cannot find module './6155.js'"
**Fix**: Already cleared cache. Restart dev server:
```bash
pkill -f "next dev"
cd apps/web && pnpm dev
```

### Local: Port already in use
**Fix**: Kill existing processes:
```bash
lsof -ti :4300 | xargs kill -9
lsof -ti :4301 | xargs kill -9
```

### Production: Old code still showing
**Fix**: 
1. Hard refresh browser (`Cmd+Shift+R` / `Ctrl+Shift+R`)
2. Test in incognito window
3. Wait 5-30 minutes for CDN cache to expire
4. Or force redeploy: `./scripts/force-clear-production-cache.sh web`

### Production: Build fails
**Fix**: Check preflight build locally first:
```bash
./scripts/preflight-build.sh
# Fix any errors, then push
git add -A && git commit -m "fix: ..." && git push origin main
```

---

## 📊 Next Steps

1. **Wait for preflight build to complete**
   ```bash
   # Monitor progress
   ./scripts/preflight-build.sh
   ```

2. **Verify local rendering**
   - Start dev servers
   - Test pages in browser
   - Check console logs

3. **Clear production cache**
   ```bash
   ./scripts/force-clear-production-cache.sh both
   ```

4. **Monitor deployments**
   ```bash
   ./scripts/railway-logs.sh status
   ./scripts/railway-logs.sh tail web
   ```

5. **Test production**
   - Open incognito window
   - Navigate to production site
   - Verify latest code is deployed

---

## 📝 Notes

- **Preflight build** simulates Railway exactly - if it passes, Railway will pass
- **Production cache** may take 5-30 minutes to clear (CDN propagation)
- **Browser cache** can be bypassed with incognito/private window
- **Railway CLI** must be installed: `npm install -g @railway/cli`

---

**Last Updated**: January 21, 2026, 02:45 UTC
