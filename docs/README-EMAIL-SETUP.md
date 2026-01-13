# Email Provider Setup & Testing

## Overview

FieldView uses an abstracted email provider system that supports both **Mailpit** (local testing) and **SendGrid** (production).

## Email Provider Abstraction

The email system is abstracted through `IEmailProvider` interface:

- **MailpitEmailProvider**: For local development/testing (SMTP to Mailpit)
- **SendGridEmailProvider**: For production (SendGrid API)

Switch providers via `EMAIL_PROVIDER` environment variable:
- `EMAIL_PROVIDER=mailpit` (default for local)
- `EMAIL_PROVIDER=sendgrid` (for production)

## Local Setup with Mailpit

### 1. Start Mailpit

```bash
docker-compose up -d mailpit
```

Mailpit will be available at:
- **Web UI**: http://localhost:4304
- **SMTP**: localhost:1025

### 2. Configure Environment

Add to `apps/api/.env`:

```bash
EMAIL_PROVIDER=mailpit
MAILPIT_HOST=localhost
MAILPIT_PORT=1025
MAILPIT_FROM_EMAIL=noreply@fieldview.live
```

### 3. Test Email Sending

Emails sent through `NotificationService.sendEmail()` will:
- Be captured by Mailpit (if running)
- Be visible in Mailpit web UI at http://localhost:4304
- Log to console if Mailpit is unavailable (development mode)

## Production Setup with SendGrid

### 1. Get SendGrid API Key

1. Sign up at https://sendgrid.com
2. Create API key in Settings → API Keys
3. Copy the API key

### 2. Configure Environment

Set in Railway environment variables:

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-api-key-here
SENDGRID_FROM_EMAIL=noreply@fieldview.live
```

### 3. Verify Domain (Recommended)

For better deliverability, verify your domain in SendGrid:
1. Go to Settings → Sender Authentication
2. Authenticate your domain (fieldview.live)
3. Update `SENDGRID_FROM_EMAIL` to use verified domain

## Email Usage

### In Code

```typescript
import { getEmailProvider } from '@/lib/email';

const emailProvider = getEmailProvider();
await emailProvider.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome to FieldView</h1>',
  text: 'Welcome to FieldView',
});
```

### Via NotificationService

```typescript
import { NotificationService } from '@/services/NotificationService';

const notificationService = new NotificationService(viewerIdentityReader);
await notificationService.sendEmail(
  'user@example.com',
  'Subject',
  'Email body text'
);
```

## Testing End-to-End Paywall Flow

### Run E2E Test Script

```bash
./scripts/test-paywall-e2e.sh
```

This script:
1. Checks Mailpit is running
2. Checks API server is running
3. Fetches watch link bootstrap
4. Creates checkout
5. Verifies email was sent to Mailpit
6. Shows next steps for manual payment testing

### Manual Testing Steps

1. **Start services**:
   ```bash
   docker-compose up -d mailpit postgres redis
   pnpm --filter=api dev
   pnpm --filter=web dev
   ```

2. **Set channel to paid**:
   - Visit admin panel or use API to set `accessMode='pay_per_view'` and `priceCents=500` (for $5.00)

3. **Visit watch link**:
   - Go to: http://localhost:4300/watch/STORMFC/2010
   - Should see paywall with price

4. **Complete checkout**:
   - Enter email address
   - Click "Continue to Payment"
   - Complete payment on Square sandbox

5. **Check Mailpit**:
   - Visit: http://localhost:4304
   - Verify confirmation/subscription emails were sent

## Setting Passwords

### Local

```bash
DATABASE_URL="postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev?schema=public" \
pnpm --filter=api exec tsx apps/api/scripts/set-password.ts stormfc@darkware.net YourPasswordHere
```

### Production (Railway)

```bash
railway run --service api pnpm exec tsx apps/api/scripts/set-password.ts stormfc@darkware.net YourPasswordHere
```

## Troubleshooting

### Mailpit Not Receiving Emails

1. Check Mailpit is running: `docker ps | grep mailpit`
2. Check SMTP port: `curl http://localhost:4304/api/v1/messages`
3. Verify `EMAIL_PROVIDER=mailpit` in `.env`
4. Check API logs for email errors

### SendGrid Not Working

1. Verify `SENDGRID_API_KEY` is set correctly
2. Check SendGrid dashboard for API usage
3. Verify sender email is authenticated
4. Check API logs for SendGrid errors


