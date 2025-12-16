# 🚀 Deployment Guide - Railway

This guide covers deploying FieldView.live to Railway (both API and Web app).

## Architecture

```
┌─────────────────────────────────────────────┐
│            Railway Project                  │
│                                             │
│  ┌──────────────┐      ┌─────────────────┐ │
│  │  API Server  │      │  Next.js Web    │ │
│  │  (Express)   │◄─────┤  (Frontend)     │ │
│  │  Port: 3001  │      │  Port: 3000     │ │
│  └──────┬───────┘      └─────────────────┘ │
│         │                                   │
│  ┌──────▼───────┐      ┌─────────────────┐ │
│  │  PostgreSQL  │      │     Redis       │ │
│  │  (Database)  │      │    (Cache)      │ │
│  └──────────────┘      └─────────────────┘ │
└─────────────────────────────────────────────┘
         │
         │ External Services
         ▼
┌─────────────────────────────────────────────┐
│  • Mux (Streaming)                          │
│  • Square (Payments)                        │
│  • Twilio (SMS)                             │
└─────────────────────────────────────────────┘
```

---

## Prerequisites

1. **Railway Account** - Sign up at [railway.app](https://railway.app)
2. **Railway CLI** - Install with: `npm i -g @railway/cli`
3. **External Services** configured:
   - Mux account with API tokens
   - Square account (production or sandbox)
   - Twilio account with phone number

---

## Step 1: Create Railway Project

### Option A: Using Railway CLI

```bash
# Login to Railway
railway login

# Create new project
railway init

# Link to your repository
railway link
```

### Option B: Using Railway Dashboard

1. Go to [railway.app/new](https://railway.app/new)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account
5. Select `fieldview.live` repository

---

## Step 2: Add Services to Project

In your Railway project, add these services:

### 1. PostgreSQL Database
```
railway add postgresql
```
- Railway will automatically set `DATABASE_URL` environment variable

### 2. Redis Cache
```
railway add redis
```
- Railway will automatically set `REDIS_URL` environment variable

---

## Step 3: Deploy API Server

### Create API Service

1. In Railway dashboard, click **"New Service"**
2. Select **"GitHub Repo"**
3. Choose your repository
4. Set **Root Directory**: `apps/api`
5. Railway will detect the `Dockerfile` automatically

### Configure Environment Variables

Add these in Railway dashboard (Settings → Variables):

```bash
# Database (auto-set by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Mux Streaming
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret

# Square Payments
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_LOCATION_ID=your_square_location_id
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature_key
SQUARE_ENVIRONMENT=production

# Twilio SMS
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# JWT
JWT_SECRET=your_secure_random_32_char_secret
JWT_EXPIRY=24h

# API Configuration
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-web-app.railway.app

# Logging
LOG_LEVEL=info
```

### Run Database Migrations

After the first deployment:

```bash
# Connect to your Railway project
railway link

# Run migrations
railway run pnpm --filter @fieldview/data-model db:migrate
```

---

## Step 4: Deploy Web App

### Create Web Service

1. In Railway dashboard, click **"New Service"**
2. Select **"GitHub Repo"**
3. Choose your repository
4. Set **Root Directory**: `apps/web`
5. Railway will detect the `Dockerfile` automatically

### Configure Environment Variables

Add these in Railway dashboard (Settings → Variables):

```bash
# API Connection (reference your API service)
NEXT_PUBLIC_API_URL=https://api-service-name.railway.app

# Next.js Configuration
NEXTAUTH_URL=https://your-web-app.railway.app
NEXTAUTH_SECRET=your_secure_random_nextauth_secret
NODE_ENV=production
```

### Get Service URLs

After deployment, Railway will provide URLs:
- API: `https://api-service-name.railway.app`
- Web: `https://web-service-name.railway.app`

Update CORS and API URLs accordingly.

---

## Step 5: Configure Custom Domains (Optional)

### Add Custom Domain to API

1. Go to API service → Settings → Domains
2. Click **"Add Domain"**
3. Enter: `api.fieldview.live`
4. Add DNS record (CNAME) in your domain provider:
   ```
   CNAME: api.fieldview.live → your-api-service.railway.app
   ```

### Add Custom Domain to Web App

1. Go to Web service → Settings → Domains
2. Click **"Add Domain"**
3. Enter: `fieldview.live` and `www.fieldview.live`
4. Add DNS records in your domain provider:
   ```
   A: fieldview.live → Railway IP
   CNAME: www.fieldview.live → your-web-service.railway.app
   ```

### Update Environment Variables

After adding custom domains:

**API Service:**
```bash
API_BASE_URL=https://api.fieldview.live
CORS_ORIGIN=https://fieldview.live,https://www.fieldview.live
```

**Web Service:**
```bash
NEXT_PUBLIC_API_URL=https://api.fieldview.live
NEXTAUTH_URL=https://fieldview.live
```

---

## Step 6: Configure Webhooks

### Square Webhooks

1. Go to [Square Developer Dashboard](https://developer.squareup.com)
2. Navigate to **Webhooks**
3. Add webhook URL: `https://api.fieldview.live/api/webhooks/square`
4. Subscribe to events:
   - `payment.created`
   - `payment.updated`
   - `refund.created`

### Twilio Webhooks

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Phone Numbers** → Your Number
3. Under **Messaging**, set webhook URL:
   - `https://api.fieldview.live/api/webhooks/twilio`

---

## Deployment Checklist

### Before First Deployment

- [ ] Railway project created
- [ ] PostgreSQL and Redis added to project
- [ ] External service accounts configured (Mux, Square, Twilio)
- [ ] All environment variables ready

### API Service

- [ ] Root directory set to `apps/api`
- [ ] Environment variables configured
- [ ] Service deployed successfully
- [ ] Database migrations run
- [ ] Health check passes: `https://api-url/health`

### Web Service

- [ ] Root directory set to `apps/web`
- [ ] Environment variables configured
- [ ] API URL correctly set
- [ ] Service deployed successfully
- [ ] Home page loads

### Post-Deployment

- [ ] Custom domains configured (if applicable)
- [ ] CORS settings updated
- [ ] Webhooks configured
- [ ] Test RTMP streaming works
- [ ] Test payment flow works
- [ ] Test SMS notifications work

---

## Monitoring & Logs

### View Logs

```bash
# API logs
railway logs -s api

# Web logs
railway logs -s web

# Follow logs in real-time
railway logs -f
```

### Railway Dashboard

- View logs in real-time
- Monitor CPU and memory usage
- Check deployment history
- View environment variables

---

## Scaling

### Vertical Scaling (Increase Resources)

1. Go to service → Settings → Resources
2. Adjust CPU and memory
3. Railway will restart with new resources

### Horizontal Scaling (Multiple Instances)

Currently manual through Railway dashboard:
1. Deploy multiple instances of the same service
2. Railway provides built-in load balancing

---

## Troubleshooting

### Build Fails

**Issue:** Dependency installation fails
```bash
# Solution: Clear build cache
railway run --service api railway build --clear-cache
```

**Issue:** Prisma client not generated
```bash
# Solution: Ensure data-model builds first
# Check build order in Dockerfile
```

### Runtime Errors

**Issue:** Database connection fails
```bash
# Check DATABASE_URL is set
railway variables -s api

# Verify PostgreSQL service is running
railway status
```

**Issue:** CORS errors in browser
```bash
# Update CORS_ORIGIN in API service
# Ensure Web app URL is included
```

### Streaming Not Working

**Issue:** RTMP connection fails
- Verify MUX_TOKEN_ID and MUX_TOKEN_SECRET are correct
- Check Mux dashboard for stream status
- Ensure API is publicly accessible

**Issue:** HLS playback fails
- Check browser console for errors
- Verify playback URLs are correct
- Test with POC viewer first

---

## Cost Optimization

Railway pricing is usage-based:

- **Hobby Plan**: $5/month includes $5 in usage credits
- **Pro Plan**: $20/month includes $20 in usage credits

### Tips to Reduce Costs

1. **Use PostgreSQL Sleep Mode** - Database sleeps after inactivity
2. **Optimize Docker Images** - Smaller images = faster builds
3. **Reduce Log Verbosity** - Set `LOG_LEVEL=warn` in production
4. **Monitor Usage** - Check Railway dashboard regularly

---

## CI/CD Pipeline

Railway automatically deploys on git push:

```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push origin main

# Railway automatically:
# 1. Detects changes
# 2. Builds Docker images
# 3. Runs tests (if configured)
# 4. Deploys to production
# 5. Health checks
```

### Rollback

If deployment fails:

```bash
# Rollback to previous deployment
railway rollback -s api
railway rollback -s web
```

---

## Quick Commands Reference

```bash
# Login
railway login

# Link project
railway link

# View services
railway status

# View logs
railway logs -s api -f

# Run command in Railway environment
railway run pnpm db:migrate

# Open service in browser
railway open

# Deploy manually
railway up

# Environment variables
railway variables
railway variables set KEY=value
```

---

## Security Checklist

- [ ] All secrets stored in Railway environment variables
- [ ] No `.env` files committed to git
- [ ] JWT_SECRET is strong and unique
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] HTTPS enforced (automatic with Railway)
- [ ] Database connections use SSL
- [ ] Webhook signature verification enabled

---

## Support & Resources

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **FieldView.live Docs**: See `/docs` folder
- **Mux Docs**: https://docs.mux.com
- **Square Docs**: https://developer.squareup.com

---

## Next Steps After Deployment

1. ✅ Test all core functionality
2. ✅ Set up monitoring and alerts
3. ✅ Configure backup strategy
4. ✅ Document your deployment URLs
5. ✅ Set up staging environment
6. ✅ Create deployment runbook for team

---

**🎉 Your FieldView.live platform is now live on Railway!**

Access your services:
- Web App: https://your-web-service.railway.app
- API: https://your-api-service.railway.app/health
- Stream POC: https://your-web-service.railway.app/poc/stream-viewer
