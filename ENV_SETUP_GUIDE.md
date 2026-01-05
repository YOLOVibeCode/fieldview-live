# 🔐 Environment Variables Setup Guide

Quick guide to set up environment variables for **local development** and **Railway production**.

---

## 📍 Local Development (Sandbox)

### Step 1: Create Local `.env` Files

Copy the sandbox template to create your local environment files:

```bash
# For API service
cp ENV_SANDBOX_TEMPLATE.txt apps/api/.env

# For Web service  
cp ENV_SANDBOX_TEMPLATE.txt apps/web/.env.local
```

### Step 2: Fill in Your Square Sandbox Credentials

Edit `apps/api/.env` and `apps/web/.env.local` with your Square sandbox values:

```bash
# In apps/api/.env AND apps/web/.env.local:

# Square Sandbox (you already have these!)
SQUARE_ACCESS_TOKEN="EAAAl9Mn5O6Tx4lwa6GmnZZ231tv_uIw8DFz7AqvUjMr5LIUclId9TUzL83eIMt8"
SQUARE_LOCATION_ID="LJWT6C2KX3YZV"
SQUARE_ENVIRONMENT="sandbox"

# Square Application ID (for frontend SDK)
NEXT_PUBLIC_SQUARE_APPLICATION_ID="sandbox-sq0idb-0H2RD-9_GtVX2NUU2Do6lw"
NEXT_PUBLIC_SQUARE_LOCATION_ID="LJWT6C2KX3YZV"
NEXT_PUBLIC_SQUARE_ENVIRONMENT="sandbox"

# Square Webhook Signature Key (get from Square Dashboard)
# Square Dashboard -> Apps -> Your App -> Webhooks -> Webhook Signature Key
SQUARE_WEBHOOK_SIGNATURE_KEY="your_webhook_signature_key_here"

# Square OAuth (for owner onboarding - optional for now)
SQUARE_APPLICATION_ID="sandbox-sq0idb-0H2RD-9_GtVX2NUU2Do6lw"
SQUARE_APPLICATION_SECRET="your_square_application_secret"
SQUARE_REDIRECT_URI="http://localhost:4301/api/owners/square/callback"
```

### Step 3: Generate Secrets

Generate secure random secrets:

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate NEXTAUTH_SECRET (for web app)
openssl rand -base64 32
```

Add these to both `.env` files:

```bash
# In apps/api/.env:
JWT_SECRET="paste_generated_secret_here"

# In apps/web/.env.local:
NEXTAUTH_SECRET="paste_generated_secret_here"
```

### Step 4: Add Other Services (Optional)

**Mux (for streaming):**
- Get from [Mux Dashboard](https://dashboard.mux.com) → Settings → Access Tokens
- Add `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET` to `apps/api/.env`

**Twilio (for SMS):**
- Get from [Twilio Console](https://console.twilio.com)
- Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` to `apps/api/.env`

### Step 5: Database & Redis URLs

These are already set correctly in the template for local Docker:
- `DATABASE_URL` → `postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_sandbox?schema=public`
- `REDIS_URL` → `redis://localhost:4303`

**Make sure Docker containers are running:**
```bash
docker compose up -d
```

---

## 🚂 Railway Production

### Step 1: API Service Environment Variables

1. Go to Railway Dashboard → Your Project → `api` service
2. Click **Settings** → **Variables** → **Raw Editor**
3. Paste this template and fill in your **production** values:

```bash
# Database & Redis (Railway auto-provides these)
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Square Production (get from Square Dashboard)
SQUARE_ACCESS_TOKEN="your_production_square_access_token"
SQUARE_LOCATION_ID="your_production_location_id"
SQUARE_WEBHOOK_SIGNATURE_KEY="your_production_webhook_signature_key"
SQUARE_ENVIRONMENT="production"

# Square OAuth
SQUARE_APPLICATION_ID="your_production_application_id"
SQUARE_APPLICATION_SECRET="your_production_application_secret"
SQUARE_REDIRECT_URI="https://api.fieldview.live/api/owners/square/callback"

# Mux Streaming
MUX_TOKEN_ID="your_mux_token_id"
MUX_TOKEN_SECRET="your_mux_token_secret"
MUX_DOMAIN="mux.com"

# Twilio SMS
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_PHONE_NUMBER="+1234567890"

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET="your_secure_random_jwt_secret"
JWT_EXPIRES_IN="24h"

# API Configuration
PORT=3001
NODE_ENV=production
API_BASE_URL="https://api.fieldview.live"
APP_URL="https://fieldview.live"
CORS_ORIGIN="https://fieldview.live,https://www.fieldview.live"
PLATFORM_FEE_PERCENT="10"
LOG_LEVEL="info"
```

### Step 2: Web Service Environment Variables

1. Go to Railway Dashboard → Your Project → `web` service
2. Click **Settings** → **Variables** → **Raw Editor**
3. Paste this template:

```bash
# API Connection
NEXT_PUBLIC_API_URL="https://api.fieldview.live"

# Next.js Configuration
NEXTAUTH_SECRET="your_secure_random_nextauth_secret"
NEXTAUTH_URL="https://fieldview.live"
NODE_ENV=production

# Square Web Payments SDK (Production)
NEXT_PUBLIC_SQUARE_APPLICATION_ID="your_production_square_application_id"
NEXT_PUBLIC_SQUARE_LOCATION_ID="your_production_location_id"
NEXT_PUBLIC_SQUARE_ENVIRONMENT="production"
```

### Step 3: Update After Custom Domains

Once you've configured custom domains (`api.fieldview.live` and `fieldview.live`), make sure:

- **API service** has `API_BASE_URL="https://api.fieldview.live"` and `APP_URL="https://fieldview.live"`
- **Web service** has `NEXT_PUBLIC_API_URL="https://api.fieldview.live"` and `NEXTAUTH_URL="https://fieldview.live"`

---

## ✅ Verification

### Local Development

Test that environment variables are loaded:

```bash
# Start API
cd apps/api
pnpm dev

# In another terminal, start Web
cd apps/web  
pnpm dev
```

Check logs for any missing environment variable warnings.

### Railway Production

After deploying, verify:

```bash
# Check API health
curl https://api.fieldview.live/health

# Should return: {"status":"healthy","timestamp":"..."}
```

---

## 🔑 Where to Get Credentials

### Square
- **Dashboard:** https://developer.squareup.com/apps
- **Sandbox:** Use sandbox credentials (you already have these!)
- **Production:** Switch to production in Square Dashboard
- **Webhook Signature Key:** Apps → Your App → Webhooks → Webhook Signature Key

### Mux
- **Dashboard:** https://dashboard.mux.com
- **Settings** → **Access Tokens** → Create new token

### Twilio
- **Console:** https://console.twilio.com
- **Account SID & Auth Token:** Dashboard homepage
- **Phone Number:** Phone Numbers → Buy a number

---

## 🚨 Security Notes

- ✅ **Never commit** `.env` files to git (they're in `.gitignore`)
- ✅ Use **different secrets** for sandbox vs production
- ✅ Rotate secrets if they're ever exposed
- ✅ Use Railway's **Raw Editor** for bulk environment variable updates

---

## 📝 Quick Reference

**Local files to create:**
- `apps/api/.env` (from `ENV_SANDBOX_TEMPLATE.txt`)
- `apps/web/.env.local` (from `ENV_SANDBOX_TEMPLATE.txt`)

**Railway services to configure:**
- `api` service → Variables
- `web` service → Variables

**Required for basic functionality:**
- ✅ Square credentials (you have sandbox!)
- ✅ JWT_SECRET (generate)
- ✅ NEXTAUTH_SECRET (generate)
- ✅ Database & Redis (Railway auto-provides)

**Optional (for full features):**
- Mux (streaming)
- Twilio (SMS)
- Square OAuth (owner onboarding)



