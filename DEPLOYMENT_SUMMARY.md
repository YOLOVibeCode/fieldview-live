# ✅ Deployment Setup Complete

## What Was Created

Your FieldView.live project is now ready to deploy entirely on **Railway**! 🚂

---

## 📦 New Files Created

### Docker Configuration
- `apps/api/Dockerfile` - Production-ready API container
- `apps/api/.dockerignore` - Files to exclude from API builds
- `apps/web/Dockerfile` - Production-ready Next.js container
- `apps/web/.dockerignore` - Files to exclude from Web builds

### Railway Configuration
- `railway.json` - Project-level Railway config
- `apps/api/railway.toml` - API service Railway config
- `apps/web/railway.toml` - Web service Railway config

### Documentation
- `DEPLOYMENT_GUIDE.md` - Comprehensive deployment guide (full details)
- `DEPLOY_TO_RAILWAY.md` - Quick start guide (step-by-step)
- `ENV_PRODUCTION_TEMPLATE.txt` - Production environment variables template

### CI/CD
- `.github/workflows/railway-deploy.yml` - Optional GitHub Actions workflow

### Configuration Updates
- `apps/web/next.config.js` - Added standalone output for Docker deployment

---

## 🏗️ Architecture on Railway

```
Railway Project: fieldview-live
├── PostgreSQL (Database)
├── Redis (Cache)
├── API Service (Express)
│   ├── Root: apps/api
│   ├── Port: 3001
│   └── Dockerfile: apps/api/Dockerfile
└── Web Service (Next.js)
    ├── Root: apps/web
    ├── Port: 3000
    └── Dockerfile: apps/web/Dockerfile
```

---

## 🚀 Quick Deploy Steps

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### 2. Create Project & Add Services
```bash
cd /Users/admin/Dev/YOLOProjects/fieldview.live
railway init
railway add --service postgres
railway add --service redis
```

### 3. Deploy API
- Create new service from GitHub repo
- Root directory: `apps/api`
- Add environment variables (see `ENV_PRODUCTION_TEMPLATE.txt`)
- Deploy!

### 4. Run Migrations
```bash
railway run --service api pnpm db:migrate
```

### 5. Deploy Web
- Create new service from GitHub repo
- Root directory: `apps/web`
- Add environment variables
- Deploy!

**That's it!** Railway handles the rest automatically.

---

## 📝 Required Environment Variables

### API Service
```bash
# Auto-set by Railway
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# You must provide
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
SQUARE_WEBHOOK_SIGNATURE_KEY=
SQUARE_ENVIRONMENT=production
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
JWT_SECRET=  # Generate: openssl rand -base64 32

# Auto-configure
PORT=3001
NODE_ENV=production
CORS_ORIGIN=${{web.RAILWAY_PUBLIC_DOMAIN}}
```

### Web Service
```bash
# Auto-configure
NEXT_PUBLIC_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
NEXTAUTH_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}

# You must provide
NEXTAUTH_SECRET=  # Generate: openssl rand -base64 32

# Auto-set
NODE_ENV=production
```

---

## ✅ Deployment Checklist

### Before You Start
- [ ] Railway account created
- [ ] Railway CLI installed
- [ ] GitHub repository ready
- [ ] Mux account with API tokens
- [ ] Square account (production or sandbox)
- [ ] Twilio account with phone number
- [ ] All secrets generated (JWT_SECRET, NEXTAUTH_SECRET)

### During Deployment
- [ ] Railway project created
- [ ] PostgreSQL added
- [ ] Redis added
- [ ] API service created and configured
- [ ] Database migrations run
- [ ] Web service created and configured
- [ ] Environment variables set for both services

### After Deployment
- [ ] API health check passes (`/health`)
- [ ] Web app loads successfully
- [ ] Test RTMP streaming POC
- [ ] Configure webhooks (Square, Twilio)
- [ ] Set up custom domains (optional)
- [ ] Test end-to-end payment flow
- [ ] Monitor logs for errors

---

## 🔍 Verification Steps

### 1. Test API
```bash
curl https://your-api-service.up.railway.app/health
# Should return: {"status":"ok","timestamp":"..."}
```

### 2. Test Web App
Open in browser:
```
https://your-web-service.up.railway.app
```

### 3. Test Streaming POC
```
https://your-web-service.up.railway.app/poc/stream-viewer
```

### 4. Get RTMP Credentials
```bash
curl -X POST https://your-api.up.railway.app/api/owners/me/games/GAME_ID/streams/mux \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Test Streaming
- Configure Veo/OBS with RTMP credentials
- Start streaming
- View in POC viewer

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `DEPLOY_TO_RAILWAY.md` | **Start here** - Quick setup guide |
| `DEPLOYMENT_GUIDE.md` | Detailed deployment reference |
| `ENV_PRODUCTION_TEMPLATE.txt` | All environment variables |
| `README_STREAMING.md` | RTMP streaming setup |
| `STREAMING_SETUP_GUIDE.md` | Complete streaming guide |

---

## 🛠️ Useful Commands

```bash
# View logs
railway logs --service api -f
railway logs --service web -f

# Check status
railway status

# Run migrations
railway run --service api pnpm db:migrate

# Restart service
railway restart --service api

# Environment variables
railway variables --service api
railway variables set KEY=value --service api

# Rollback deployment
railway rollback --service api
```

---

## 💰 Estimated Costs

Railway pricing (usage-based):

| Service | Estimated Cost/Month |
|---------|---------------------|
| PostgreSQL | $5-10 |
| Redis | $2-5 |
| API Service | $5-15 |
| Web Service | $5-15 |
| **Total** | **$20-50** |

**Free Tier:** Hobby plan includes $5/month usage credit

---

## 🎯 Next Steps

1. **Deploy immediately:**
   ```bash
   railway login
   railway init
   ```
   Then follow `DEPLOY_TO_RAILWAY.md`

2. **Configure custom domains:**
   - `api.fieldview.live` → API service
   - `fieldview.live` → Web service

3. **Set up webhooks:**
   - Square webhooks
   - Twilio webhooks

4. **Test thoroughly:**
   - Payment flow
   - RTMP streaming
   - SMS notifications

5. **Monitor & optimize:**
   - Check Railway dashboard
   - Review logs
   - Optimize costs

---

## 🆘 Troubleshooting

### Build Fails
- Check build logs in Railway dashboard
- Verify all dependencies in package.json
- Ensure Prisma client generates correctly

### Connection Errors
- Verify DATABASE_URL is set
- Check CORS_ORIGIN includes web domain
- Ensure Redis is running

### Streaming Issues
- Verify Mux credentials
- Check RTMP URL format
- Test with POC viewer first

**For detailed troubleshooting, see `DEPLOYMENT_GUIDE.md`**

---

## 🎉 You're Ready to Deploy!

**Everything is configured.** Just follow the quick start guide:

1. Open: [`DEPLOY_TO_RAILWAY.md`](./DEPLOY_TO_RAILWAY.md)
2. Follow steps 1-7
3. Deploy in ~15 minutes

**Your platform stack on Railway:**
- ✅ API server (Express + Prisma)
- ✅ Web app (Next.js)
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ RTMP streaming via Mux
- ✅ Payments via Square
- ✅ SMS via Twilio

**All on one platform. No mixed infrastructure. Simple, scalable, and production-ready.**

---

**Questions?** See the detailed guides or Railway's excellent documentation.

**Ready to go live?** Run `railway login` and let's deploy! 🚀
