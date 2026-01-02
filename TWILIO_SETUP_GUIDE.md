# 📱 Twilio Setup Guide

Complete guide to set up Twilio SMS for FieldView.live text-to-pay functionality.

---

## 🎯 What Twilio Does

Twilio enables the **text-to-pay** flow:
1. Viewer texts a game keyword (e.g., "EAGLES22") to your Twilio number
2. Twilio sends the message to your API webhook
3. Your API responds with a payment link via SMS
4. Viewer clicks link → pays → watches game

---

## 📋 Step 1: Create Twilio Account

1. Go to [Twilio Console](https://console.twilio.com)
2. Sign up for a free account (includes $15.50 trial credit)
3. Verify your email and phone number

---

## 🔑 Step 2: Get Your Twilio Credentials

### Account SID & Auth Token

1. Go to [Twilio Console Dashboard](https://console.twilio.com/us1/home)
2. Your **Account SID** is displayed on the dashboard (starts with `AC...`)
3. Click **"Show"** next to Auth Token to reveal your **Auth Token**

**Copy these values** - you'll need them for environment variables:
- `TWILIO_ACCOUNT_SID` = Your Account SID (e.g., `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
- `TWILIO_AUTH_TOKEN` = Your Auth Token (e.g., `your_auth_token_here`)

---

## 📞 Step 3: Get a Phone Number

### Option A: Use Trial Number (Free - Testing Only)

Twilio provides a trial number automatically. **Limitations:**
- Can only send SMS to verified phone numbers
- Good for testing, not production

### Option B: Buy a Phone Number (Production)

1. Go to [Phone Numbers → Buy a Number](https://console.twilio.com/us1/develop/phone-numbers/manage/search)
2. Select:
   - **Country:** United States
   - **Capabilities:** SMS ✓
   - **Type:** Local (or Toll-Free)
3. Click **"Search"** and choose a number
4. Click **"Buy"** (costs ~$1/month)

**Copy the phone number** (e.g., `+15551234567`) - this is your `TWILIO_PHONE_NUMBER`

---

## 🔧 Step 4: Configure Environment Variables

### Local Development (Sandbox)

Add to `apps/api/.env`:

```bash
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_PHONE_NUMBER="+15551234567"
```

### Railway Production

1. Go to Railway Dashboard → `api` service → Settings → Variables
2. Add:

```bash
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_PHONE_NUMBER="+15551234567"
```

---

## 🔗 Step 5: Configure Twilio Webhook URL

The webhook tells Twilio where to send incoming SMS messages.

### For Local Development (using ngrok)

1. **Start your API server:**
   ```bash
   cd apps/api
   pnpm dev
   ```
   API runs on `http://localhost:4301`

2. **Start ngrok tunnel:**
   ```bash
   ngrok http 4301
   ```
   Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

3. **Configure Twilio webhook:**
   - Go to [Twilio Console → Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
   - Click your phone number
   - Under **"Messaging"** → **"A MESSAGE COMES IN"**
   - Set to: `https://abc123.ngrok.io/api/webhooks/twilio`
   - Method: `POST`
   - Click **"Save"**

### For Railway Production

1. **Get your API public URL:**
   - Railway Dashboard → `api` service → Settings → Networking
   - Copy your public domain (e.g., `https://api.fieldview.live`)

2. **Configure Twilio webhook:**
   - Go to [Twilio Console → Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
   - Click your phone number
   - Under **"Messaging"** → **"A MESSAGE COMES IN"**
   - Set to: `https://api.fieldview.live/api/webhooks/twilio`
   - Method: `POST`
   - Click **"Save"**

---

## ✅ Step 6: Test Twilio Integration

### Test Locally

1. **Start API with Twilio env vars:**
   ```bash
   cd apps/api
   TWILIO_ACCOUNT_SID="ACxxx" \
   TWILIO_AUTH_TOKEN="xxx" \
   TWILIO_PHONE_NUMBER="+15551234567" \
   pnpm dev
   ```

2. **Test webhook (using curl or Postman):**
   ```bash
   curl -X POST http://localhost:4301/api/webhooks/twilio \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "From=%2B15551234567&Body=TEST"
   ```
   
   **Note:** This won't have a valid signature, so it will fail auth. Use the test script below instead.

3. **Use the test script:**
   ```bash
   # Make sure you have a test game with keyword "TEST"
   pnpm --filter api test:live
   ```
   The `twilio-webhook.live.test.ts` test validates signature generation.

### Test with Real SMS

1. **Create a game via API** with a keyword (e.g., "EAGLES22")
2. **Text the keyword** to your Twilio number from a verified phone (trial) or any phone (production)
3. **You should receive** a payment link SMS back

---

## 🔒 Security: Webhook Signature Validation

Your API automatically validates Twilio webhook signatures using `TWILIO_AUTH_TOKEN`. This ensures requests are actually from Twilio.

**How it works:**
- Twilio signs each webhook request with your Auth Token
- Your API verifies the signature before processing
- Invalid signatures are rejected (401 Unauthorized)

**No additional configuration needed** - it's handled automatically by `validateTwilioRequest()`.

---

## 📝 Environment Variables Summary

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token | `your_auth_token_here` |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number | `+15551234567` |

### Where to Set

- **Local:** `apps/api/.env`
- **Railway:** API service → Variables

---

## 🚨 Troubleshooting

### "Invalid Twilio signature" Error

**Cause:** Webhook URL mismatch or signature validation failure

**Fix:**
1. Ensure `TWILIO_AUTH_TOKEN` matches your Twilio Console Auth Token
2. Ensure webhook URL in Twilio matches your API URL exactly
3. For local dev with ngrok, restart ngrok and update Twilio webhook URL

### "Trial account can only send to verified numbers"

**Cause:** Using Twilio trial account

**Fix:**
- Add phone numbers to [Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified) (trial)
- Or upgrade to paid account for production

### No SMS Received

**Check:**
1. Twilio webhook URL is correct and accessible
2. API logs show webhook requests arriving
3. Phone number is correct format (`+1` country code required)
4. For trial accounts, recipient number is verified

### Webhook Not Receiving Messages

**Check:**
1. Twilio webhook URL is set correctly in Phone Number settings
2. API is running and accessible at webhook URL
3. Check Twilio [Webhook Logs](https://console.twilio.com/us1/monitor/logs/webhooks) for delivery status

---

## 💰 Pricing

### Twilio SMS Pricing (US)

- **Inbound SMS:** Free (receiving messages)
- **Outbound SMS:** ~$0.0075 per message (varies by country)
- **Phone Number:** ~$1/month

**Example:** 100 viewers text → 100 inbound (free) + 100 payment link replies = ~$0.75

---

## 📚 Additional Resources

- [Twilio SMS Documentation](https://www.twilio.com/docs/sms)
- [Twilio Webhook Security](https://www.twilio.com/docs/usage/webhooks/webhooks-security)
- [Twilio Console](https://console.twilio.com)
- [Twilio Support](https://support.twilio.com)

---

## ✅ Checklist

- [ ] Twilio account created
- [ ] Account SID copied
- [ ] Auth Token copied
- [ ] Phone number purchased/configured
- [ ] Environment variables set (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`)
- [ ] Webhook URL configured in Twilio Console
- [ ] Test SMS sent successfully
- [ ] Payment link SMS received

---

**Next Steps:**
- Configure Square for payment processing
- Set up Mux for streaming
- Test the full text-to-pay flow end-to-end


