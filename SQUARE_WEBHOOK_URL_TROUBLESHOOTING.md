# 🔧 Square Webhook URL Validation Error Fix

**Error**: "Notification URL must be a valid URL"

## ✅ Your Endpoint is Working!

Good news: Your endpoint `https://api.fieldview.live/api/webhooks/square` is accessible and responding correctly (returns 401 without signature, which is expected).

The issue is Square's URL validation before it even tries to send webhooks.

---

## 🔍 Common Causes & Solutions

### 1. **Square Needs to Verify the Endpoint First**

Square may require the endpoint to return `200 OK` initially to verify it's accessible.

**Solution**: Temporarily allow requests without signature for verification:

**Option A**: Use Square's "Test" feature first
- In Square Dashboard → Webhooks
- Click "Test" or "Send Test Event" 
- This might help Square verify the endpoint

**Option B**: Check if Square has a "Verify" button
- Some Square dashboards have a "Verify Endpoint" button
- Click it to let Square test your URL

### 2. **URL Format Issues**

Square might be picky about URL format. Try these variations:

**Try without trailing slash** (recommended):
```
https://api.fieldview.live/api/webhooks/square
```

**If that doesn't work, try with trailing slash**:
```
https://api.fieldview.live/api/webhooks/square/
```

**Check for hidden characters**:
- Copy the URL from your browser address bar
- Paste it into Square (don't type it manually)
- Make sure there are no spaces or special characters

### 3. **Domain Verification**

Square might need to verify your domain is accessible.

**Check**:
1. Can you access `https://api.fieldview.live/health`? ✅ (You can)
2. Is SSL certificate valid? Check with: `curl -I https://api.fieldview.live`
3. Is the domain publicly accessible? ✅ (It is)

### 4. **Square API Version**

Some Square dashboards require selecting an API version.

**Check**:
- When creating the webhook, look for "API Version" dropdown
- Select the latest version (usually v2 or latest)
- Make sure it matches your Square SDK version

### 5. **Sandbox vs Production**

Make sure you're using the right environment:

- **Sandbox**: Use Sandbox application and Sandbox signature key
- **Production**: Use Production application and Production signature key

**Check**: Are you in the correct environment in Square Dashboard?

---

## 🧪 Step-by-Step Fix

### Step 1: Verify Endpoint Manually

```bash
# Should return 401 (expected)
curl -X POST https://api.fieldview.live/api/webhooks/square \
  -H "Content-Type: application/json" \
  -d '{"test":true}'
```

Expected: `{"error":{"code":"UNAUTHORIZED","message":"Invalid signature"}}`

### Step 2: Try Different URL Formats in Square

Try these URLs one at a time in Square Dashboard:

1. `https://api.fieldview.live/api/webhooks/square` (no trailing slash)
2. `https://api.fieldview.live/api/webhooks/square/` (with trailing slash)
3. Check if Square accepts the URL

### Step 3: Use Square's Test Feature

1. In Square Dashboard → Webhooks
2. Look for "Test" or "Send Test Event" button
3. Click it to test the endpoint
4. This might help Square verify the URL is valid

### Step 4: Check Square Dashboard Requirements

Look for:
- ✅ "Verify Endpoint" button
- ✅ "Test Connection" option
- ✅ API Version selector
- ✅ Environment selector (Sandbox/Production)

---

## 🆘 Alternative: Use Railway's Generated Domain

If Square still rejects your custom domain, try Railway's generated domain first:

1. **Get Railway Domain**:
   - Go to Railway Dashboard → Your API Service
   - Settings → Networking
   - Copy the Railway-generated domain (e.g., `api-production-xxxx.up.railway.app`)

2. **Use Railway Domain in Square**:
   ```
   https://api-production-xxxx.up.railway.app/api/webhooks/square
   ```

3. **Update API_BASE_URL**:
   ```bash
   API_BASE_URL=https://api-production-xxxx.up.railway.app
   ```

4. **Once it works, switch to custom domain**:
   - After Square accepts the Railway domain
   - Update to your custom domain
   - Update `API_BASE_URL` accordingly

---

## ✅ Verification Checklist

Before trying again in Square:

- [ ] Endpoint is accessible: `curl https://api.fieldview.live/api/webhooks/square` returns 401
- [ ] SSL certificate is valid (check with browser)
- [ ] No trailing slash in URL (or try with trailing slash)
- [ ] Using correct Square environment (Sandbox/Production)
- [ ] API Version selected in Square Dashboard
- [ ] URL copied exactly (no extra spaces)

---

## 📞 Still Not Working?

### Check Square Dashboard Logs

1. Go to Square Dashboard → Webhooks
2. Look for "Delivery Logs" or "Event Logs"
3. Check if there are any error messages about the URL

### Contact Square Support

If none of the above works:
1. Square Developer Support: https://developer.squareup.com/support
2. Mention: "Notification URL must be a valid URL" error
3. Provide: Your webhook URL and that it returns 401 (expected)

### Verify Your Setup

Make sure you have:
- ✅ `SQUARE_WEBHOOK_SIGNATURE_KEY` set in Railway
- ✅ `API_BASE_URL` set correctly
- ✅ Endpoint responds to POST requests
- ✅ HTTPS enabled (not HTTP)

---

## 💡 Pro Tip

Sometimes Square's validation is overly strict. Try:
1. Create the webhook subscription with Railway domain first
2. Once it's working and receiving events
3. Then update to your custom domain

This "proves" to Square that your endpoint works, then they're more likely to accept the custom domain.

---

**Last Updated**: 2024-12-30

