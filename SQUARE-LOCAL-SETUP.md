# 🔐 Square Sandbox Setup for Local Testing

Complete guide to set up Square developer credentials for local end-to-end testing.

---

## 📋 Required Square Variables

### Backend (API) - `apps/api/.env`

```bash
# Square Server-Side (Payments + Webhooks)
SQUARE_ACCESS_TOKEN="your_sandbox_access_token"
SQUARE_LOCATION_ID="your_sandbox_location_id"
SQUARE_WEBHOOK_SIGNATURE_KEY="your_webhook_signature_key"
SQUARE_ENVIRONMENT="sandbox"

# Square Connect OAuth (Owner Onboarding)
SQUARE_APPLICATION_ID="your_sandbox_application_id"
SQUARE_APPLICATION_SECRET="your_sandbox_application_secret"
SQUARE_REDIRECT_URI="http://localhost:4301/api/owners/square/callback"
```

### Frontend (Web) - `apps/web/.env.local`

```bash
# Square Web Payments SDK (Frontend)
NEXT_PUBLIC_SQUARE_APPLICATION_ID="your_sandbox_application_id"
NEXT_PUBLIC_SQUARE_LOCATION_ID="your_sandbox_location_id"
NEXT_PUBLIC_SQUARE_ENVIRONMENT="sandbox"
```

---

## 🎯 Step-by-Step: Get Your Square Sandbox Credentials

### Step 1: Access Square Developer Dashboard

1. Go to: **https://developer.squareup.com/apps**
2. Sign in with your Square account
3. If you don't have an app yet, click **"Create Application"**

### Step 2: Get Application ID & Secret (OAuth)

1. In your Square app, go to **"OAuth"** tab
2. Copy your **Application ID** (starts with `sandbox-sq0idb-...`)
3. Copy your **Application Secret** (click "Show" to reveal)
4. Set **Redirect URL** to: `http://localhost:4301/api/owners/square/callback`

**Add to both `.env` files:**
```bash
SQUARE_APPLICATION_ID="sandbox-sq0idb-..."
SQUARE_APPLICATION_SECRET="your_secret_here"
```

### Step 3: Get Access Token & Location ID

1. In your Square app, go to **"Credentials"** tab
2. Under **"Sandbox"** section:
   - Copy your **Access Token** (starts with `EAAA...`)
   - Copy your **Location ID** (starts with `L...`)

**Add to `apps/api/.env`:**
```bash
SQUARE_ACCESS_TOKEN="EAAA..."
SQUARE_LOCATION_ID="L..."
```

**Add to `apps/web/.env.local`:**
```bash
NEXT_PUBLIC_SQUARE_LOCATION_ID="L..."
```

### Step 4: Get Webhook Signature Key

1. In your Square app, go to **"Webhooks"** tab
2. Click **"Webhook Signature Key"**
3. Copy the signature key (long string)

**Add to `apps/api/.env`:**
```bash
SQUARE_WEBHOOK_SIGNATURE_KEY="your_signature_key_here"
```

### Step 5: Set Environment

**Add to both `.env` files:**
```bash
SQUARE_ENVIRONMENT="sandbox"
NEXT_PUBLIC_SQUARE_ENVIRONMENT="sandbox"
```

---

## 📝 Complete `.env` File Example

### `apps/api/.env`

```bash
# Database
DATABASE_URL="postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev?schema=public"

# Redis
REDIS_URL="redis://localhost:4303"

# Square Server-Side
SQUARE_ACCESS_TOKEN="EAAA..."
SQUARE_LOCATION_ID="L..."
SQUARE_WEBHOOK_SIGNATURE_KEY="your_webhook_signature_key"
SQUARE_ENVIRONMENT="sandbox"

# Square OAuth
SQUARE_APPLICATION_ID="sandbox-sq0idb-..."
SQUARE_APPLICATION_SECRET="your_application_secret"
SQUARE_REDIRECT_URI="http://localhost:4301/api/owners/square/callback"

# Encryption (already set!)
ENCRYPTION_KEY="your_encryption_key"

# Platform Fee
PLATFORM_FEE_PERCENT="10"

# API
PORT=4301
API_BASE_URL="http://localhost:4301"
APP_URL="http://localhost:4300"

# CORS
CORS_ORIGIN="http://localhost:4300"

# Email (Local Testing)
EMAIL_PROVIDER="mailpit"
MAILPIT_HOST="localhost"
MAILPIT_PORT="1025"
```

### `apps/web/.env.local`

```bash
# API Connection
NEXT_PUBLIC_API_URL="http://localhost:4301"

# Square Web Payments SDK
NEXT_PUBLIC_SQUARE_APPLICATION_ID="sandbox-sq0idb-..."
NEXT_PUBLIC_SQUARE_LOCATION_ID="L..."
NEXT_PUBLIC_SQUARE_ENVIRONMENT="sandbox"

# Next.js
NEXTAUTH_URL="http://localhost:4300"
NEXTAUTH_SECRET="your_nextauth_secret"
```

---

## ✅ Verification Steps

### 1. Verify Environment Variables Loaded

```bash
# Start API server
cd apps/api
pnpm dev

# Look for any Square-related errors in logs
# Should see: "API server started" without errors
```

### 2. Test Square Connect Flow

1. Start API: `cd apps/api && pnpm dev`
2. Start Web: `cd apps/web && pnpm dev`
3. Login as owner
4. Navigate to Square Connect page
5. Click "Connect Square Account"
6. Should redirect to Square sandbox OAuth page

### 3. Test Payment Flow

1. Create a pay-per-view game/channel
2. Initiate checkout
3. Use Square test card: `4111 1111 1111 1111`
4. CVV: `123`
5. Expiry: Any future date
6. Complete payment

### 4. Test Webhook (Optional)

For local webhook testing, use **ngrok** or **Square Webhooks Simulator**:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com

# Expose local API
ngrok http 4301

# Copy ngrok URL (e.g., https://abc123.ngrok.io)
# Add to Square Dashboard -> Webhooks -> Add URL
# URL: https://abc123.ngrok.io/api/webhooks/square
```

---

## 🧪 Square Sandbox Test Cards

Use these test cards for local testing:

| Card Number | Description |
|------------|-------------|
| `4111 1111 1111 1111` | Visa - Success |
| `4000 0000 0000 0002` | Visa - Declined |
| `5555 5555 5555 4444` | Mastercard - Success |
| `5105 1051 0510 5100` | Mastercard - Declined |

**CVV:** Any 3 digits (e.g., `123`)  
**Expiry:** Any future date (e.g., `12/25`)  
**ZIP:** Any 5 digits (e.g., `12345`)

---

## 🔍 Troubleshooting

### "Square access token invalid"
- **Solution:** Verify `SQUARE_ACCESS_TOKEN` is correct (starts with `EAAA...`)
- Check it's from **Sandbox** credentials, not Production

### "Location ID not found"
- **Solution:** Verify `SQUARE_LOCATION_ID` matches your sandbox location
- Location ID starts with `L...`

### "Webhook signature validation failed"
- **Solution:** Verify `SQUARE_WEBHOOK_SIGNATURE_KEY` is correct
- Get fresh key from Square Dashboard -> Webhooks

### "OAuth redirect URI mismatch"
- **Solution:** Ensure `SQUARE_REDIRECT_URI` in `.env` matches Square Dashboard
- Must be exactly: `http://localhost:4301/api/owners/square/callback`

### "Application ID not found" (Frontend)
- **Solution:** Verify `NEXT_PUBLIC_SQUARE_APPLICATION_ID` is set in `apps/web/.env.local`
- Must match `SQUARE_APPLICATION_ID` from API `.env`

---

## 📚 Additional Resources

- **Square Developer Dashboard:** https://developer.squareup.com/apps
- **Square Sandbox Testing Guide:** https://developer.squareup.com/docs/testing/sandbox
- **Square Web Payments SDK:** https://developer.squareup.com/docs/web-payments/overview
- **Square Connect OAuth:** https://developer.squareup.com/docs/oauth-api/overview

---

## ✅ Quick Checklist

- [ ] Square Developer account created
- [ ] Square application created
- [ ] OAuth Application ID & Secret copied
- [ ] Access Token & Location ID copied
- [ ] Webhook Signature Key copied
- [ ] All variables added to `apps/api/.env`
- [ ] Frontend variables added to `apps/web/.env.local`
- [ ] `SQUARE_ENVIRONMENT="sandbox"` set
- [ ] API server starts without errors
- [ ] Test payment flow works

---

**🎉 Once all variables are set, you're ready for full end-to-end testing!**

