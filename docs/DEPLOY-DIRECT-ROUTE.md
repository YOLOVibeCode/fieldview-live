# 🚀 Deploy /direct/StormFC Route

## Changes to Deploy

1. **New API Route**: `apps/api/src/routes/direct.ts`
   - `GET /api/direct/:slug` - Get stream URL
   - `POST /api/direct/:slug` - Update stream URL (password: admin2026)

2. **New Frontend Page**: `apps/web/app/direct/[slug]/page.tsx`
   - Displays "StormFC Live Stream" header
   - Password-protected stream URL updates

3. **Server Route Registration**: Updated `apps/api/src/server.ts`
   - Added `/api/direct` route

## Quick Deploy

### Option 1: Railway Auto-Deploy (Recommended)

If Railway is connected to your Git repository, just push:

```bash
git add .
git commit -m "Add /direct/StormFC route with password protection"
git push origin main
```

Railway will automatically deploy.

### Option 2: Railway CLI Deploy

```bash
# Deploy API service
railway up --service api

# Deploy Web service  
railway up --service web
```

### Option 3: Manual Railway Deploy

1. Go to Railway Dashboard
2. Select your project
3. Click "Deploy" on API service
4. Click "Deploy" on Web service

## Verify Deployment

After deployment, test:

```bash
# Test API endpoint
curl https://api.fieldview.live/api/direct/StormFC

# Test web page
curl -I https://fieldview.live/direct/StormFC
```

## Expected Result

- ✅ `https://fieldview.live/direct/StormFC` loads
- ✅ Header shows "StormFC Live Stream"
- ✅ "Edit Stream URL" button works
- ✅ Password `admin2026` required to update stream

---

**Ready to deploy!**

