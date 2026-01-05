# 🔗 Square Webhook Setup Guide

Complete guide to setting up Square payment webhooks for FieldView.live.

---

## 📋 Prerequisites

- Square Developer account ([sign up](https://developer.squareup.com))
- Square application created
- API deployed and accessible via HTTPS (e.g., Railway)
- `API_BASE_URL` environment variable set correctly

---

## Step 1: Get Your Webhook Signature Key

The webhook signature key is used to verify that webhooks are actually from Square.

### In Square Developer Dashboard:

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your application
3. Navigate to **Webhooks** section (left sidebar)
4. Find **Webhook Signature Key** section
5. **Copy the signature key** (you'll need this for `SQUARE_WEBHOOK_SIGNATURE_KEY`)

**Important**: 
- Each environment (Sandbox/Production) has its own signature key
- Keep this key secret - it's used to verify webhook authenticity

---

## Step 2: Configure Environment Variables

Add these to your Railway API service environment variables:

```bash
# Square Webhook Configuration
SQUARE_WEBHOOK_SIGNATURE_KEY="your_webhook_signature_key_from_step_1"
API_BASE_URL="https://api.fieldview.live"  # Must match your actual API URL
```

**Note**: `API_BASE_URL` is critical - it's used in signature verification. It must:
- Use HTTPS (not HTTP)
- Match exactly what Square will call
- Not have a trailing slash

---

## Step 3: Set Up Webhook Endpoint in Square Dashboard

### For Production:

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your **Production** application
3. Navigate to **Webhooks** (left sidebar)
4. Click **Add Endpoint** or **Create Webhook Subscription**

### Configure the Webhook:

**Webhook URL**:
```
https://api.fieldview.live/api/webhooks/square
```

**Replace with your actual API URL** if different.

**Subscribe to Events**:
- ✅ `payment.created` - Payment initiated (may be pending)
- ✅ `payment.updated` - Payment status changed (succeeded/failed)
- ✅ `refund.created` - Refund processed

**Note**: You can subscribe to `payment.*` and `refund.*` wildcards if available.

5. Click **Save** or **Create**

---

## Step 4: Verify Your Endpoint is Accessible

Before Square can send webhooks, your endpoint must be publicly accessible.

### Test Health Endpoint:
```bash
curl https://api.fieldview.live/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-20T...",
  "checks": {
    "database": { "status": "ok" },
    "redis": { "status": "ok" }
  }
}
```

### Test Webhook Endpoint (should return 401 without signature):
```bash
curl -X POST https://api.fieldview.live/api/webhooks/square \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

Expected: `401 Unauthorized` (because signature is missing/invalid)

---

## Step 5: Test Webhook Delivery

### Option A: Use Square's Test Webhook Feature

1. In Square Dashboard → Webhooks
2. Find your webhook endpoint
3. Click **Test** or **Send Test Event**
4. Select event type (e.g., `payment.created`)
5. Check your API logs to see if webhook was received

### Option B: Create a Test Payment

1. Use Square Sandbox test card: `4111 1111 1111 1111`
2. Complete a test checkout
3. Check API logs for webhook events

### Check Logs:

```bash
# Railway CLI
railway logs --service api -f

# Or in Railway Dashboard
# Go to your API service → Logs
```

Look for:
- `POST /api/webhooks/square` requests
- Payment processing logs
- Any error messages

---

## Step 6: Verify Webhook Processing

Your webhook handler processes these events:

### `payment.created` / `payment.updated`
- Updates purchase status in database
- Creates entitlement if payment succeeded
- Sends SMS with watch link (if phone provided)

### `refund.created`
- Updates purchase status to refunded
- Revokes entitlements
- Updates ledger entries

### Check Database:

```bash
# Connect to your database
railway run --service api pnpm db:studio

# Or via Railway CLI
railway run --service api pnpm exec prisma studio
```

Check:
- `Purchase` table - payment status should update
- `Entitlement` table - should be created for successful payments
- `LedgerEntry` table - should have payment/refund entries

---

## 🔍 Troubleshooting

### Webhook Not Received

**Check**:
1. ✅ Is `API_BASE_URL` set correctly?
2. ✅ Is endpoint publicly accessible? (test with curl)
3. ✅ Is HTTPS enabled? (Square requires HTTPS)
4. ✅ Check Railway logs for incoming requests
5. ✅ Check Square Dashboard → Webhooks → Delivery Logs

**Common Issues**:
- **404 Not Found**: Check webhook URL path (`/api/webhooks/square`)
- **502 Bad Gateway**: API might be down or not responding
- **Timeout**: API taking too long to respond (>30s)

### Invalid Signature Error (401)

**Check**:
1. ✅ Is `SQUARE_WEBHOOK_SIGNATURE_KEY` set correctly?
2. ✅ Does it match the key from Square Dashboard?
3. ✅ Is `API_BASE_URL` correct? (used in signature calculation)
4. ✅ Are you using the right environment? (Sandbox vs Production keys differ)

**Debug**:
```typescript
// Add temporary logging in apps/api/src/lib/square.ts
console.log('Signature:', signature);
console.log('Webhook URL:', webhookUrl);
console.log('Body length:', body.length);
```

### Webhook Received But Not Processed

**Check**:
1. ✅ Check API logs for errors
2. ✅ Verify event type matches what you subscribed to
3. ✅ Check database connection
4. ✅ Verify PaymentService is working

**Common Issues**:
- Event type mismatch
- Database connection error
- Missing required fields in webhook payload

---

## 🔐 Security Best Practices

1. **Always verify signatures** - Your code already does this ✅
2. **Use HTTPS only** - Square requires HTTPS
3. **Keep signature key secret** - Never commit to git
4. **Monitor webhook delivery** - Check Square Dashboard regularly
5. **Implement idempotency** - Your code handles duplicate webhooks ✅

---

## 📊 Webhook Event Reference

### Payment Events

**`payment.created`**:
```json
{
  "type": "payment.created",
  "data": {
    "object": {
      "payment": {
        "id": "payment_id",
        "status": "PENDING",
        "amount_money": { "amount": 700, "currency": "USD" },
        ...
      }
    }
  }
}
```

**`payment.updated`**:
```json
{
  "type": "payment.updated",
  "data": {
    "object": {
      "payment": {
        "id": "payment_id",
        "status": "COMPLETED",  // or FAILED
        ...
      }
    }
  }
}
```

**`refund.created`**:
```json
{
  "type": "refund.created",
  "data": {
    "object": {
      "refund": {
        "id": "refund_id",
        "payment_id": "payment_id",
        "amount_money": { "amount": 700, "currency": "USD" },
        ...
      }
    }
  }
}
```

---

## ✅ Verification Checklist

Before going live:

- [ ] Webhook signature key obtained from Square Dashboard
- [ ] `SQUARE_WEBHOOK_SIGNATURE_KEY` set in Railway
- [ ] `API_BASE_URL` set correctly (HTTPS, no trailing slash)
- [ ] Webhook endpoint added in Square Dashboard
- [ ] Events subscribed: `payment.created`, `payment.updated`, `refund.created`
- [ ] Endpoint accessible (tested with curl)
- [ ] Test webhook sent successfully
- [ ] Test payment created and webhook received
- [ ] Database updated correctly
- [ ] Logs show no errors

---

## 📚 Additional Resources

- [Square Webhooks Documentation](https://developer.squareup.com/docs/webhooks/overview)
- [Square Webhook Signature Verification](https://developer.squareup.com/docs/webhooks/step3validate)
- [Square Test Cards](https://developer.squareup.com/docs/testing/test-values)
- [FieldView.live Deployment Guide](./DEPLOYMENT_GUIDE.md)

---

## 🆘 Need Help?

If webhooks aren't working:

1. Check Railway logs: `railway logs --service api -f`
2. Check Square Dashboard → Webhooks → Delivery Logs
3. Verify all environment variables are set
4. Test endpoint accessibility
5. Review error messages in logs

---

**Last Updated**: 2024-12-20


