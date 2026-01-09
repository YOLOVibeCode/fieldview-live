# 🚀 Square Webhook Quick Start

Step-by-step guide to get your webhook signature key and configure the endpoint.

---

## 📍 Where to Get the Webhook Signature Key

### Step-by-Step Navigation:

1. **Go to Square Developer Dashboard**
   - Visit: https://developer.squareup.com/apps
   - Log in with your Square account

2. **Select Your Application**
   - Click on your application name (or create one if you haven't)
   - Make sure you're in the correct environment:
     - **Sandbox** for testing
     - **Production** for live payments

3. **Navigate to Webhooks**
   - Look for **"Webhooks"** in the left sidebar menu
   - Click on it

4. **Find the Signature Key**
   - In the Webhooks page, look for **"Webhook Signature Key"** section
   - You'll see a key that looks like: `sq0csp-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Click **"Show"** or **"Reveal"** to see the full key
   - **Copy this key** - you'll need it for `SQUARE_WEBHOOK_SIGNATURE_KEY`

   **Important**: 
   - Sandbox and Production have **different** signature keys
   - Use the Sandbox key for testing, Production key for live

---

## 🔗 How to Add the Webhook Endpoint

### In the Same Webhooks Page:

1. **Click "Add Subscription" or "Create Webhook"**
   - You'll see a button like "Add Subscription" or "Create Webhook"
   - Click it to create a new webhook endpoint

2. **Enter Your Webhook URL**
   ```
   https://api.fieldview.live/api/webhooks/square
   ```
   
   **Replace with your actual API URL** if different!
   
   **Requirements**:
   - Must use HTTPS (not HTTP)
   - Must be publicly accessible
   - Must match your `API_BASE_URL` environment variable

3. **Select Events to Subscribe To**
   
   Check these boxes:
   - ✅ `payment.created` - When a payment is initiated
   - ✅ `payment.updated` - When payment status changes (succeeded/failed)
   - ✅ `refund.created` - When a refund is processed
   
   Or select wildcards if available:
   - ✅ `payment.*` (covers all payment events)
   - ✅ `refund.*` (covers all refund events)

4. **Save the Webhook**
   - Click **"Save"** or **"Create"**
   - Square will now send webhooks to your endpoint

---

## ⚙️ Configure Environment Variables

After you have the signature key, add it to Railway:

### In Railway Dashboard:

1. Go to your **API service**
2. Click **Settings** → **Variables**
3. Add these variables:

```bash
SQUARE_WEBHOOK_SIGNATURE_KEY=your_signature_key_from_step_4
API_BASE_URL=https://api.fieldview.live
```

**Important**: 
- `API_BASE_URL` must match your webhook URL (without the `/api/webhooks/square` path)
- No trailing slash
- Use HTTPS

---

## ✅ Quick Checklist

- [ ] Logged into Square Developer Dashboard
- [ ] Selected correct application (Sandbox/Production)
- [ ] Navigated to Webhooks section
- [ ] Copied Webhook Signature Key
- [ ] Created webhook subscription with your API URL
- [ ] Selected events: `payment.created`, `payment.updated`, `refund.created`
- [ ] Added `SQUARE_WEBHOOK_SIGNATURE_KEY` to Railway
- [ ] Added `API_BASE_URL` to Railway
- [ ] Verified endpoint is accessible (test with curl)

---

## 🧪 Test Your Setup

### 1. Test Endpoint is Accessible:
```bash
curl https://api.fieldview.live/health
```

Should return: `{"status":"healthy",...}`

### 2. Test Webhook (should return 401 - that's expected):
```bash
curl -X POST https://api.fieldview.live/api/webhooks/square \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

Should return: `401 Unauthorized` (because signature is missing)

### 3. Send Test Webhook from Square:
- In Square Dashboard → Webhooks
- Find your webhook endpoint
- Click **"Test"** or **"Send Test Event"**
- Check Railway logs to see if it was received

---

## 🆘 Common Issues

### "Where is the signature key?"
- Make sure you're in the **Webhooks** section (not Credentials)
- Look for **"Webhook Signature Key"** section
- It might be collapsed - click to expand
- If you don't see it, you may need to create a webhook subscription first

### "I can't find Webhooks in the sidebar"
- Make sure you've selected an application (not just logged in)
- Some accounts need to enable webhooks first
- Try: Application → Settings → Enable Webhooks

### "Signature verification fails"
- Double-check `SQUARE_WEBHOOK_SIGNATURE_KEY` matches exactly
- Verify `API_BASE_URL` matches your webhook URL (without path)
- Make sure you're using the right environment key (Sandbox vs Production)

---

## 📚 Visual Guide

```
Square Developer Dashboard
├── Applications
│   └── Your App
│       ├── Credentials (Application ID, Access Token)
│       ├── Webhooks ← GO HERE
│       │   ├── Webhook Signature Key ← COPY THIS
│       │   └── Subscriptions
│       │       └── Add Subscription ← CREATE WEBHOOK HERE
│       └── OAuth
```

---

## 🔗 Direct Links

- **Square Developer Dashboard**: https://developer.squareup.com/apps
- **Square Webhooks Docs**: https://developer.squareup.com/docs/webhooks/overview
- **Square Test Cards**: https://developer.squareup.com/docs/testing/test-values

---

**Need more details?** See [SQUARE_WEBHOOK_SETUP.md](./SQUARE_WEBHOOK_SETUP.md) for troubleshooting and advanced configuration.



