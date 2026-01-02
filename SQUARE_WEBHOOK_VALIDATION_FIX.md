# 🔧 Square Webhook URL Validation Fix

**Issue**: Square Dashboard shows "Notification URL must be a valid URL" error even though endpoint is working.

## ✅ Endpoint Status

Your endpoint is **working correctly**:
- ✅ GET request: Returns `200 OK` with `{"received": true}`
- ✅ POST request: Returns `401` without signature (expected)
- ✅ HTTPS enabled
- ✅ SSL certificate valid
- ✅ Publicly accessible

## 🔍 Troubleshooting Steps

### 1. **Try Different URL Formats**

Square's form validation can be picky. Try these variations:

**Option A** (no trailing slash - recommended):
```
https://api.fieldview.live/api/webhooks/square
```

**Option B** (with trailing slash):
```
https://api.fieldview.live/api/webhooks/square/
```

**Option C** (try Railway domain first):
```
https://your-railway-domain.up.railway.app/api/webhooks/square
```

### 2. **Clear Browser Cache**

Square's form might be caching validation:
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Try in incognito/private window
- Try different browser

### 3. **Check Square Dashboard Settings**

- Make sure you're in the **correct environment** (Sandbox vs Production)
- Verify your **API version** matches (2025-10-16)
- Check if there are any **account restrictions**

### 4. **Verify URL Accessibility**

Test from Square's perspective:
```bash
# Should return 200 OK
curl -I https://api.fieldview.live/api/webhooks/square

# Should return JSON
curl https://api.fieldview.live/api/webhooks/square
```

### 5. **Try Railway Domain First**

Sometimes Square accepts Railway domains more easily:

1. Get your Railway domain:
   - Railway Dashboard → API Service → Settings → Networking
   - Copy the Railway-generated domain

2. Use it in Square:
   ```
   https://your-api-service.up.railway.app/api/webhooks/square
   ```

3. Once it works, update to custom domain:
   - Update `API_BASE_URL` in Railway
   - Update webhook URL in Square

### 6. **Contact Square Support**

If none of the above works:
- Square Developer Support: https://developer.squareup.com/support
- Mention: "Notification URL must be a valid URL" error
- Provide: Your webhook URL and that it returns 200 OK

## 🎯 Quick Test

Verify your endpoint works:
```bash
# GET request (for validation)
curl https://api.fieldview.live/api/webhooks/square
# Expected: {"received": true}

# POST request (should return 401 without signature)
curl -X POST https://api.fieldview.live/api/webhooks/square \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Expected: {"error":{"code":"UNAUTHORIZED","message":"Invalid signature"}}
```

## ✅ Once Square Accepts the URL

After Square accepts your webhook URL:

1. **Get Webhook Signature Key**:
   - Square Dashboard → Webhooks → Your Subscription
   - Click "Show" next to Signature Key
   - Copy the key

2. **Add to Railway**:
   ```bash
   SQUARE_WEBHOOK_SIGNATURE_KEY="your_signature_key"
   API_BASE_URL="https://api.fieldview.live"
   ```

3. **Test Webhook**:
   - Square Dashboard → Webhooks → Your Subscription
   - Click "Test" or "Send Test Event"
   - Check Railway logs to verify receipt

---

**Your endpoint is ready!** The issue is Square's form validation, not your endpoint.



