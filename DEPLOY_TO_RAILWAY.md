# 🚂 Deploy to Railway - Quick Start

Follow these steps to deploy FieldView.live to Railway in ~15 minutes.

---

## Prerequisites

✅ Railway account ([Sign up free](https://railway.app))  
✅ Railway CLI installed: `npm install -g @railway/cli`  
✅ Git repository pushed to GitHub  
✅ Mux, Square, and Twilio accounts configured

---

## Step-by-Step Deployment

### 1. Install Railway CLI & Login

```bash
npm install -g @railway/cli
railway login
```

### 2. Create New Railway Project

```bash
cd /Users/admin/Dev/YOLOProjects/fieldview.live
railway init
```

When prompted:
- Project name: `fieldview-live`
- Start from scratch

### 3. Add Database & Redis

```bash
# Add PostgreSQL
railway add --service postgres

# Add Redis
railway add --service redis
```

Railway automatically creates these services and environment variables.

### 4. Create API Service

**In Railway Dashboard:**

1. Click **"New"** → **"GitHub Repo"**
2. Select `fieldview.live` repository
3. Service name: `api`
4. **Settings:**
   - Root Directory: `apps/api`
   - Build Command: `pnpm install && pnpm --filter @fieldview/data-model build && pnpm --filter api build`
   - Start Command: `node dist/server.js`
   - Port: `3001`

**Environment Variables** (Settings → Variables → Raw Editor):

```bash
# Database (reference Railway services)
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Mux Streaming
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=

# Square Payments
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
SQUARE_WEBHOOK_SIGNATURE_KEY=
SQUARE_ENVIRONMENT=production

# Twilio SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=
JWT_EXPIRY=24h

# API Configuration
PORT=3001
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGIN=${{web.url}}
```

**Note:** Fill in the empty values with your actual credentials.

5. Click **"Deploy"**

### 5. Run Database Migrations

Once API is deployed:

```bash
railway link
railway run --service api pnpm --filter @fieldview/data-model db:migrate
```

### 6. Create Web Service

**In Railway Dashboard:**

1. Click **"New"** → **"GitHub Repo"**
2. Select `fieldview.live` repository
3. Service name: `web`
4. **Settings:**
   - Root Directory: `apps/web`
   - Build Command: `pnpm install && pnpm --filter @fieldview/data-model build && pnpm --filter web build`
   - Start Command: `pnpm start`
   - Port: `3000`

**Environment Variables** (Settings → Variables → Raw Editor):

```bash
# API Connection (reference API service)
NEXT_PUBLIC_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}

# Next.js Configuration (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
NODE_ENV=production
```

5. Click **"Deploy"**

### 7. Update CORS After Web Deploy

Once web is deployed, update API CORS:

1. Go to API service → Variables
2. Update `CORS_ORIGIN`:
   ```bash
   CORS_ORIGIN=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
   ```
3. API will automatically redeploy

---

## Verify Deployment

### Check API Health

```bash
curl https://your-api-service.up.railway.app/health
```

Expected response:
```json
{"status":"ok","timestamp":"..."}
```

### Check Web App

Open in browser:
```
https://your-web-service.up.railway.app
```

### Test Streaming POC

```
https://your-web-service.up.railway.app/poc/stream-viewer
```

---

## Configure Custom Domains (Optional)

### API Domain

1. Go to API service → Settings → Networking
2. Click **"Generate Domain"** or add custom domain
3. For custom domain: `api.fieldview.live`
   - Add CNAME record: `api.fieldview.live` → `your-api.railway.app`

### Web Domain

1. Go to Web service → Settings → Networking
2. Click **"Generate Domain"** or add custom domain
3. For custom domain: `fieldview.live`
   - Add A record pointing to Railway's IP
   - Add CNAME: `www.fieldview.live` → `your-web.railway.app`

### Update Environment Variables After Custom Domains

**API Service:**
```bash
CORS_ORIGIN=https://fieldview.live,https://www.fieldview.live
```

**Web Service:**
```bash
NEXT_PUBLIC_API_URL=https://api.fieldview.live
NEXTAUTH_URL=https://fieldview.live
```

---

## Configure Webhooks

### Square Webhooks

1. Go to [Square Dashboard](https://developer.squareup.com)
2. Webhooks → Add Endpoint
3. URL: `https://api.fieldview.live/api/webhooks/square`
4. Events: `payment.*`, `refund.*`

### Twilio Webhooks

1. Go to [Twilio Console](https://console.twilio.com)
2. Phone Numbers → Your Number
3. Messaging → Webhook URL:
   `https://api.fieldview.live/api/webhooks/twilio`

---

## Test RTMP Streaming

### 1. Create a test game via API

```bash
curl -X POST https://api.fieldview.live/api/owners/me/games \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Game",
    "scheduledAt": "2024-12-20T19:00:00Z"
  }'
```

### 2. Get RTMP credentials

```bash
curl -X POST https://api.fieldview.live/api/owners/me/games/GAME_ID/streams/mux \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Configure streaming platform

Use the RTMP URL and stream key from step 2.

### 4. Start streaming and view

Open: `https://your-web-domain/poc/stream-viewer`

---

## Troubleshooting

### Build Fails

**Error:** "Cannot find module '@fieldview/data-model'"

```bash
# Solution: Ensure build order is correct
# Check that data-model builds before apps
```

**Error:** "Prisma Client not generated"

```bash
# Run migrations again
railway run --service api pnpm db:generate
railway run --service api pnpm db:migrate
```

### CORS Errors

**Error:** "CORS policy: No 'Access-Control-Allow-Origin' header"

```bash
# Update API CORS_ORIGIN to include web domain
CORS_ORIGIN=https://your-web-domain.railway.app
```

### Database Connection Issues

```bash
# Verify DATABASE_URL is set
railway variables --service api | grep DATABASE_URL

# Check PostgreSQL is running
railway status
```

### Streaming Not Working

1. Check Mux credentials are correct
2. Verify API is publicly accessible
3. Test with curl:
   ```bash
   curl https://api.fieldview.live/health
   ```

---

## Cost Estimate

Railway pricing (as of 2024):

- **Hobby Plan:** $5/month (includes $5 usage)
- **Usage:**
  - PostgreSQL: ~$5-10/month
  - Redis: ~$2-5/month
  - API Service: ~$5-15/month
  - Web Service: ~$5-15/month

**Estimated Total:** $20-50/month depending on traffic

---

## Monitoring

### View Logs

```bash
# Real-time logs
railway logs --service api -f
railway logs --service web -f

# Recent logs
railway logs --service api
```

### Metrics

Railway Dashboard shows:
- CPU usage
- Memory usage
- Network traffic
- Deployment history
- Build logs

---

## Useful Commands

```bash
# View all services
railway status

# Restart a service
railway restart --service api

# Open service in browser
railway open --service web

# Run command in Railway environment
railway run --service api pnpm db:studio

# Environment variables
railway variables --service api
railway variables set KEY=value --service api

# Deployments
railway logs --service api
railway list
```

---

## Rollback

If something goes wrong:

```bash
# View deployment history
railway deployments --service api

# Rollback to previous version
railway rollback --service api
```

---

## Next Steps

✅ Test all functionality  
✅ Set up monitoring/alerts  
✅ Configure backups  
✅ Set up staging environment  
✅ Document your deployment URLs  
✅ Share access with team members

---

## Support

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Deployment Guide:** See `DEPLOYMENT_GUIDE.md` for detailed info

---

**🎉 Congratulations! Your FieldView.live platform is now deployed on Railway!**

Your Services:
- 🌐 Web: `https://your-web-service.up.railway.app`
- 🔌 API: `https://your-api-service.up.railway.app`
- 📹 Stream POC: `https://your-web-service.up.railway.app/poc/stream-viewer`
