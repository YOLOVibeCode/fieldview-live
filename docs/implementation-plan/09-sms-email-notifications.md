# SMS & Email Notifications

## Overview

Twilio SMS integration for inbound keyword routing and outbound notifications. SendGrid email integration for transactional emails.

**SMS Provider**: Twilio
**Email Provider**: SendGrid

## Twilio SMS Integration

### Inbound SMS (Keyword Routing)

**Webhook Endpoint**: `POST /api/webhooks/twilio`

**Flow**:
1. Viewer texts keyword (e.g., `EAGLES22`) to Twilio number
2. Twilio sends webhook to FieldView
3. System looks up game by keyword
4. System sends payment link SMS to viewer

**Implementation**:
```typescript
// apps/api/src/webhooks/twilio.ts
import { Request, Response } from 'express';
import { twilioClient } from '@/lib/twilio';
import { smsService } from '@/services/SmsService';
import { gameRepository } from '@/repositories/GameRepository';

export async function handleTwilioWebhook(req: Request, res: Response) {
  // Verify Twilio signature
  const isValid = twilioClient.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    req.headers['x-twilio-signature'] as string,
    req.url,
    req.body
  );
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const { From: phoneE164, Body: messageBody } = req.body;
  
  // Normalize keyword (uppercase, trim)
  const keyword = messageBody.trim().toUpperCase();
  
  // Handle STOP/HELP
  if (keyword === 'STOP') {
    await smsService.handleStop(phoneE164);
    return res.type('text/xml').send('<Response><Message>You have been unsubscribed.</Message></Response>');
  }
  
  if (keyword === 'HELP') {
    await smsService.handleHelp(phoneE164);
    return res.type('text/xml').send('<Response><Message>Text a game keyword to receive a payment link. Reply STOP to unsubscribe.</Message></Response>');
  }
  
  // Lookup game by keyword
  const game = await gameRepository.findByKeyword(keyword);
  
  if (!game) {
    // Keyword not found
    return res.type('text/xml').send('<Response><Message>Game not found. Please check your keyword and try again.</Message></Response>');
  }
  
  // Check if game is active
  if (game.state !== 'active' && game.state !== 'live') {
    return res.type('text/xml').send('<Response><Message>This game is not currently available.</Message></Response>');
  }
  
  // Generate payment link
  const paymentLink = `${process.env.APP_URL}/checkout/${game.id}`;
  
  // Send payment link SMS
  await smsService.sendPaymentLink(game.id, phoneE164, paymentLink);
  
  // Log SMS message
  await smsMessageRepository.create({
    direction: 'inbound',
    phoneE164,
    keywordCode: keyword,
    gameId: game.id,
    messageBody: keyword,
    status: 'delivered',
  });
  
  // Respond to Twilio
  return res.type('text/xml').send('<Response><Message>Click here to purchase access: {paymentLink}</Message></Response>');
}
```

### Outbound SMS (Payment Links, Refunds)

**Send Payment Link**:
```typescript
// apps/api/src/services/SmsService.ts
export async function sendPaymentLink(gameId: string, phoneE164: string, paymentLink: string): Promise<void> {
  // Check opt-out
  const viewer = await viewerIdentityRepository.findByPhone(phoneE164);
  if (viewer?.smsOptOut) {
    logger.info({ phoneE164 }, 'SMS opt-out, skipping');
    return;
  }
  
  // Rate limiting check
  const recentCount = await smsMessageRepository.countRecentByPhone(phoneE164, '1 hour');
  if (recentCount >= 10) {
    throw new Error('Rate limit exceeded');
  }
  
  // Send SMS via Twilio
  const message = await twilioClient.messages.create({
    to: phoneE164,
    from: process.env.TWILIO_PHONE_NUMBER,
    body: `Watch ${game.title}: ${paymentLink}`,
  });
  
  // Log SMS
  await smsMessageRepository.create({
    direction: 'outbound',
    phoneE164,
    gameId,
    messageBody: `Watch ${game.title}: ${paymentLink}`,
    status: 'sent',
    providerMessageId: message.sid,
  });
}
```

**Send Refund Notification**:
```typescript
export async function sendRefundNotification(purchase: Purchase, refund: Refund): Promise<void> {
  const viewer = await viewerIdentityRepository.getById(purchase.viewerId);
  
  if (!viewer.phoneE164 || viewer.smsOptOut) {
    return; // Skip if no phone or opted out
  }
  
  const refundAmount = (refund.amountCents / 100).toFixed(2);
  
  await twilioClient.messages.create({
    to: viewer.phoneE164,
    from: process.env.TWILIO_PHONE_NUMBER,
    body: `Your refund of $${refundAmount} has been processed for ${purchase.game.title}.`,
  });
  
  // Log SMS
  await smsMessageRepository.create({
    direction: 'outbound',
    phoneE164: viewer.phoneE164,
    gameId: purchase.gameId,
    messageBody: `Refund processed: $${refundAmount}`,
    status: 'sent',
  });
}
```

### STOP/HELP Compliance

**STOP Handler**:
```typescript
export async function handleStop(phoneE164: string): Promise<void> {
  let viewer = await viewerIdentityRepository.findByPhone(phoneE164);
  
  if (!viewer) {
    // Create viewer with opt-out
    viewer = await viewerIdentityRepository.create({
      phoneE164,
      email: `optout-${Date.now()}@fieldview.live`, // Placeholder email
      smsOptOut: true,
      optOutAt: new Date(),
    });
  } else {
    // Update existing viewer
    await viewerIdentityRepository.update(viewer.id, {
      smsOptOut: true,
      optOutAt: new Date(),
    });
  }
  
  logger.info({ phoneE164 }, 'SMS opt-out processed');
}
```

**HELP Handler**:
```typescript
export async function handleHelp(phoneE164: string): Promise<void> {
  await twilioClient.messages.create({
    to: phoneE164,
    from: process.env.TWILIO_PHONE_NUMBER,
    body: 'Text a game keyword to receive a payment link. Reply STOP to unsubscribe. Support: support@fieldview.live',
  });
}
```

## SendGrid Email Integration

### Transactional Emails

**Types**:
- Purchase confirmation (with watch link)
- Refund notification
- Owner game reminders
- Admin notifications

### Setup

```typescript
// apps/api/src/lib/sendgrid.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  await sgMail.send({
    to: params.to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
}
```

### Purchase Confirmation Email

```typescript
// apps/api/src/services/EmailService.ts
export async function sendPurchaseConfirmation(purchase: Purchase, entitlement: Entitlement): Promise<void> {
  const viewer = await viewerIdentityRepository.getById(purchase.viewerId);
  const game = await gameRepository.getById(purchase.gameId);
  
  const watchUrl = `${process.env.APP_URL}/watch/${entitlement.token}`;
  
  const html = `
    <h1>Purchase Confirmed</h1>
    <p>Thank you for your purchase!</p>
    <p><strong>Game:</strong> ${game.title}</p>
    <p><strong>Amount:</strong> $${(purchase.amountCents / 100).toFixed(2)}</p>
    <p><a href="${watchUrl}">Watch Now</a></p>
  `;
  
  await sendEmail({
    to: viewer.email,
    subject: `Watch ${game.title}`,
    html,
  });
}
```

### Refund Notification Email

```typescript
export async function sendRefundNotification(purchase: Purchase, refund: Refund): Promise<void> {
  const viewer = await viewerIdentityRepository.getById(purchase.viewerId);
  
  const refundAmount = (refund.amountCents / 100).toFixed(2);
  
  const html = `
    <h1>Refund Processed</h1>
    <p>Your refund of $${refundAmount} has been processed for ${purchase.game.title}.</p>
    <p>Reason: ${refund.reasonCode}</p>
  `;
  
  await sendEmail({
    to: viewer.email,
    subject: 'Refund Processed',
    html,
  });
}
```

## Rate Limiting

### SMS Rate Limits

- **Inbound**: 10 requests per phone number per minute
- **Outbound**: 10 messages per phone number per day

### Implementation

```typescript
// apps/api/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '@/lib/redis';

export const smsRateLimit = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:sms:',
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  keyGenerator: (req) => req.body.From || req.ip,
});
```

## Acceptance Criteria

- [ ] Twilio webhook receives inbound SMS
- [ ] Keyword routing works correctly
- [ ] Payment link SMS sent successfully
- [ ] STOP/HELP compliance implemented
- [ ] Opt-out state respected
- [ ] SendGrid emails sent (purchase, refund)
- [ ] Rate limiting applied
- [ ] SMS messages logged
- [ ] 100% test coverage

## Next Steps

- Proceed to [10-refunds-telemetry.md](./10-refunds-telemetry.md) for refund implementation
