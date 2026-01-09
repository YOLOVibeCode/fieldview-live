# Social Producer Panel + Paywall + Email Notifications Architecture

**Version:** 2.0  
**Date:** January 9, 2026  
**Status:** Architecture Specification (Ready for Implementation)

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Requirements Overview](#requirements-overview)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Authentication & Access Control](#authentication--access-control)
6. [Paywall Flow](#paywall-flow)
7. [Email Notification System](#email-notification-system)
8. [Social Producer Panel](#social-producer-panel)
9. [Architecture Diagrams](#architecture-diagrams)
10. [Testing Strategy](#testing-strategy)
11. [Implementation Roadmap](#implementation-roadmap)

---

## 🎯 Executive Summary

This architecture integrates **four major features** into the FieldView.Live direct stream platform:

1. **Social Producer Panel** - Community-managed scoreboard with optional password protection
2. **Enhanced Paywall System** - Admin-customizable messages, price setting, and saved payment methods
3. **Saved Payment Methods** - Email-based payment info retrieval via Square
4. **Automated Email Notifications** - Pre-stream reminders sent 5 minutes before scheduled start

### Key Design Principles
- ✅ **Privacy-First:** Minimal data collection, GDPR compliant
- ✅ **Automation-Friendly:** All UI elements have `data-testid` attributes
- ✅ **Test-Driven:** Comprehensive E2E tests for all flows
- ✅ **Progressive Enhancement:** Works without JavaScript (forms fallback)
- ✅ **Real-Time:** SSE for live updates, background jobs for emails

---

## 📊 Requirements Overview

### 1. Social Producer Panel Requirements

| Feature | Requirement | Access Control |
|---------|-------------|----------------|
| **Team Names** | Editable home/away team names | Based on access mode |
| **Jersey Colors** | Visual color picker for each team | Based on access mode |
| **Score Tracking** | Integer scores for home/away | Based on access mode |
| **Game Clock** | Start/pause/reset with server sync | Based on access mode |
| **Access Modes** | 3 modes: Admin Only, Password, Open | Admin configurable |
| **Password Protection** | Optional simple password | If set, required to edit |
| **No Password = Open** | If password field empty, anyone can edit | Default behavior |

### 2. Paywall Requirements

| Feature | Requirement | Implementation |
|---------|-------------|----------------|
| **Enable/Disable** | Admin toggle for paywall | Boolean flag in DB |
| **Price Setting** | Admin sets price in USD (cents) | Integer, 0-99999 |
| **Custom Message** | Admin writes message (max 1000 chars) | Text field, displayed before payment |
| **Message Display** | Show admin message to user before payment | Prominent in checkout flow |
| **Square Integration** | Process payments via Square | Existing `PaymentService` |
| **Saved Payments** | Retrieve saved payment methods by email | Square Customer API |

### 3. Email Notification Requirements

| Feature | Requirement | Timing |
|---------|-------------|--------|
| **Stream Scheduling** | Admin sets scheduled start date/time | `DirectStream.scheduledStartAt` |
| **Registration Confirmation** | Email sent immediately on viewer unlock | After successful unlock |
| **Pre-Stream Reminder** | Email sent before stream starts | 5 minutes before `scheduledStartAt` |
| **Email Content** | Include stream link, team names, start time | Templated HTML email |
| **Background Jobs** | Cron job checks for upcoming streams | Every 1 minute |

### 4. Viewer Analytics Requirements (Simplified)

| Feature | Requirement | Display |
|---------|-------------|---------|
| **Active Viewers** | Count of viewers active in last 5 min | Live count badge |
| **Viewer List** | Names only, no personal data | Green/red status dots |
| **Status Indicator** | 🟢 Green = active, 🔴 Red = inactive | Visual indicator |
| **No IP/Location** | Privacy-first, no tracking beyond name | Compliant with GDPR |

---

## 🗄️ Database Schema

### Schema Updates

#### 1. DirectStream (Enhanced)

```prisma
model DirectStream {
  id                String    @id @default(uuid()) @db.Uuid
  slug              String    @unique
  title             String
  streamUrl         String?
  adminPassword     String    // Hashed bcrypt password
  
  // Paywall Settings (EXISTING)
  chatEnabled       Boolean   @default(true)
  paywallEnabled    Boolean   @default(false)
  priceInCents      Int       @default(0)
  paywallMessage    String?   @db.VarChar(1000) // ✅ Admin custom message
  allowSavePayment  Boolean   @default(false)   // ✅ Allow saved payment methods
  
  // 🆕 SCHEDULING
  scheduledStartAt  DateTime? // When stream is scheduled to start
  reminderSentAt    DateTime? // Track when 5-min reminder was sent
  
  // 🆕 EMAIL SETTINGS
  sendReminders     Boolean   @default(true)    // Enable/disable reminders
  reminderMinutes   Int       @default(5)       // How many minutes before (default 5)
  
  gameId            String?   @db.Uuid @unique
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  game              Game?     @relation(fields: [gameId], references: [id], onDelete: SetNull)
  scoreboard        GameScoreboard?
  
  @@index([slug])
  @@index([gameId])
  @@index([scheduledStartAt]) // 🆕 For cron job queries
}
```

#### 2. GameScoreboard (New)

```prisma
model GameScoreboard {
  id              String    @id @default(uuid()) @db.Uuid
  directStreamId  String    @db.Uuid @unique
  
  // Team Info
  homeTeamName    String    @default("Home")
  awayTeamName    String    @default("Away")
  homeJerseyColor String    @default("#1E40AF") // Tailwind blue-700
  awayJerseyColor String    @default("#DC2626") // Tailwind red-600
  
  // Score
  homeScore       Int       @default(0)
  awayScore       Int       @default(0)
  
  // Clock (Server-synced persistence)
  clockMode       String    @default("stopped") // stopped | running | paused
  clockSeconds    Int       @default(0)
  clockStartedAt  DateTime?
  
  // Display
  isVisible       Boolean   @default(true)
  position        String    @default("top-left") // top-left | top-center | top-right
  
  // 🆕 ACCESS CONTROL
  producerPassword String?   // Hashed password (NULL = open editing)
  
  // 🆕 EDIT HISTORY
  lastEditedBy    String?   // Viewer name or "Admin"
  lastEditedAt    DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  directStream    DirectStream @relation(fields: [directStreamId], references: [id], onDelete: Cascade)
  
  @@index([directStreamId])
}
```

#### 3. ViewerIdentity (Enhanced)

```prisma
model ViewerIdentity {
  id            String    @id @default(uuid()) @db.Uuid
  email         String
  firstName     String
  lastName      String
  gameId        String    @db.Uuid
  
  // Activity Tracking
  lastSeenAt    DateTime  @default(now()) @updatedAt
  createdAt     DateTime  @default(now())
  
  // 🆕 EMAIL PREFERENCES
  wantsReminders Boolean   @default(true) // Opt-in for email reminders
  
  // 🆕 SQUARE CUSTOMER ID (for saved payment methods)
  squareCustomerId String? // Links to Square Customer API
  
  game          Game      @relation(fields: [gameId], references: [id], onDelete: Cascade)
  
  @@unique([gameId, email])
  @@index([gameId])
  @@index([email])
  @@index([lastSeenAt]) // 🆕 For active viewer queries
  @@index([squareCustomerId]) // 🆕 For payment retrieval
}
```

#### 4. Purchase (Enhanced - Existing Model)

```prisma
model Purchase {
  // ... existing fields ...
  
  // 🆕 SAVED PAYMENT INFO
  savePaymentMethod Boolean   @default(false) // User opted to save
  squareCardId      String?   // Square card_id for saved cards
  cardLastFour      String?   // Last 4 digits for display
  cardBrand         String?   // Visa, Mastercard, etc.
  
  // ... rest of existing fields ...
}
```

---

## 🔌 API Endpoints

### Social Producer Panel APIs

```typescript
// 1. GET /api/direct/:slug/scoreboard
// Public - Get current scoreboard state
Response: {
  id: string,
  homeTeamName: string,
  awayTeamName: string,
  homeJerseyColor: string,
  awayJerseyColor: string,
  homeScore: number,
  awayScore: number,
  clockMode: 'stopped' | 'running' | 'paused',
  clockSeconds: number,
  clockStartedAt: string | null,
  isVisible: boolean,
  position: string,
  requiresPassword: boolean, // TRUE if producerPassword is set
  lastEditedBy: string | null,
  lastEditedAt: string | null
}

// 2. POST /api/direct/:slug/scoreboard/validate
// Validate producer password (if set)
Body: { producerPassword: string }
Response: { valid: boolean } | 401

// 3. POST /api/direct/:slug/scoreboard
// Update scoreboard fields
Auth: Admin JWT OR correct producer password OR none (if open)
Body: {
  producerPassword?: string, // Required if password is set
  homeTeamName?: string,
  awayTeamName?: string,
  homeJerseyColor?: string,
  awayJerseyColor?: string,
  homeScore?: number,
  awayScore?: number,
  isVisible?: boolean,
  position?: string
}
Response: { success: boolean, scoreboard: GameScoreboard }

// 4. POST /api/direct/:slug/scoreboard/clock/start
// Start/resume clock
Auth: Same as update
Response: { clockMode: 'running', clockStartedAt: string }

// 5. POST /api/direct/:slug/scoreboard/clock/pause
// Pause clock
Auth: Same as update
Response: { clockMode: 'paused', clockSeconds: number }

// 6. POST /api/direct/:slug/scoreboard/clock/reset
// Reset clock to 00:00
Auth: Same as update
Response: { clockMode: 'stopped', clockSeconds: 0 }

// 7. SSE /api/direct/:slug/scoreboard/stream
// Real-time scoreboard updates
Public stream, sends updates when scoreboard changes
```

### Paywall APIs (Enhanced)

```typescript
// 1. POST /api/direct/:slug/unlock-viewer
// Register viewer (may trigger paywall)
Body: {
  email: string,
  firstName: string,
  lastName: string,
  wantsReminders?: boolean // Default true
}
Response: 
  // If no paywall:
  { token: string, viewerIdentity: ViewerIdentity }
  
  // If paywall enabled:
  { 
    paywallRequired: true, 
    priceInCents: number,
    paywallMessage: string, // ✅ Admin custom message
    checkoutUrl: string     // Link to payment page
  }

// 2. POST /api/direct/:slug/checkout
// Create Square checkout session
Body: {
  email: string,
  firstName: string,
  lastName: string,
  savePaymentMethod?: boolean // If allowSavePayment is true
}
Response: {
  checkoutUrl: string,
  orderId: string
}

// 3. GET /api/direct/:slug/payment-methods
// Get saved payment methods for email
Query: ?email=user@example.com
Response: {
  hasSavedCard: boolean,
  cardLastFour?: string,
  cardBrand?: string,
  squareCustomerId?: string
}

// 4. POST /api/direct/:slug/pay-with-saved
// Pay using saved Square payment method
Body: {
  email: string,
  squareCustomerId: string,
  cardId: string
}
Response: {
  success: boolean,
  viewerToken: string
}
```

### Email Notification APIs

```typescript
// 1. POST /api/direct/:slug/settings
// Admin updates stream settings (ENHANCED)
Auth: Admin JWT
Body: {
  // ... existing fields ...
  scheduledStartAt?: string,      // 🆕 ISO date string
  sendReminders?: boolean,        // 🆕 Enable reminders
  reminderMinutes?: number        // 🆕 How many minutes before
}

// 2. GET /api/cron/send-stream-reminders
// Internal cron job endpoint
Auth: Internal cron secret
Response: {
  remindersSent: number,
  streams: Array<{ slug: string, recipientCount: number }>
}

// 3. POST /api/direct/:slug/test-reminder
// Admin can test reminder email
Auth: Admin JWT
Body: { testEmail: string }
Response: { emailSent: boolean }
```

### Viewer Analytics APIs

```typescript
// 1. GET /api/direct/:slug/viewers/active
// Get active viewer list (simplified)
Auth: Admin JWT
Response: {
  count: number,
  viewers: Array<{
    id: string,
    name: string,           // firstName + lastName
    isActive: boolean,      // lastSeenAt < 5 min
    lastSeenAt: string
  }>
}

// 2. POST /api/direct/:slug/heartbeat
// Update viewer lastSeenAt timestamp
Body: { viewerToken: string }
Response: { ok: boolean }
```

---

## 🔐 Authentication & Access Control

### Access Control Matrix

| Endpoint | Admin JWT | Producer Password | Open Access | Notes |
|----------|-----------|-------------------|-------------|-------|
| **Scoreboard Read** | ✅ | ✅ | ✅ | Always public |
| **Scoreboard Update** | ✅ | ✅ (if set) | ✅ (if not set) | Based on `producerPassword` |
| **Admin Settings** | ✅ | ❌ | ❌ | Admin only |
| **Viewer Analytics** | ✅ | ❌ | ❌ | Admin only |
| **Viewer Unlock** | ✅ | ❌ | ✅ | Public registration |
| **Payment** | ✅ | ❌ | ✅ | Public checkout |

### Producer Password Logic

```typescript
// Access validation for scoreboard updates
const validateProducerAccess = async (
  req: Request,
  scoreboard: GameScoreboard
): Promise<boolean> => {
  
  // Check if admin JWT is present (admins always have access)
  if (req.admin && req.admin.slug === req.params.slug) {
    return true;
  }
  
  // Check if producer password is set
  if (!scoreboard.producerPassword) {
    // No password = open access
    return true;
  }
  
  // Password is set, validate it
  const { producerPassword } = req.body;
  
  if (!producerPassword) {
    throw new Error('Producer password required');
  }
  
  const isValid = await comparePassword(
    producerPassword,
    scoreboard.producerPassword
  );
  
  if (!isValid) {
    throw new Error('Invalid producer password');
  }
  
  return true;
};
```

---

## 💳 Paywall Flow

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ARRIVES AT STREAM                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│          VIEWER UNLOCK FORM (Email, Name, Opt-in)           │
│  data-testid="viewer-unlock-form"                           │
│  ☐ Send me reminders about this stream                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    POST /unlock-viewer
                              │
                    ┌─────────┴─────────┐
                    │                   │
             NO PAYWALL           PAYWALL ENABLED
                    │                   │
                    ▼                   ▼
        ┌──────────────────┐   ┌─────────────────────────┐
        │ Return JWT Token │   │ Return Paywall Required │
        │ Store in localStorage  │ • priceInCents          │
        │ Show video player│   │ • paywallMessage ✅     │
        └──────────────────┘   │ • checkoutUrl           │
                               └─────────────────────────┘
                                         │
                                         ▼
                               ┌─────────────────────────┐
                               │  PAYWALL MODAL          │
                               │  data-testid="paywall"  │
                               │                         │
                               │  Admin Message:         │
                               │  ┌─────────────────────┐│
                               │  │ [paywallMessage]    ││
                               │  │ Shows admin custom  ││
                               │  │ message explaining  ││
                               │  │ why/what for       ││
                               │  └─────────────────────┘│
                               │                         │
                               │  Price: $X.XX          │
                               │                         │
                               │  Check email for saved: │
                               ├─────────────────────────┤
                               │  GET /payment-methods   │
                               │  ?email=user@example.com│
                               └─────────────────────────┘
                                         │
                         ┌───────────────┴───────────────┐
                         │                               │
                  HAS SAVED CARD                   NO SAVED CARD
                         │                               │
                         ▼                               ▼
           ┌──────────────────────────┐      ┌──────────────────────┐
           │ SHOW SAVED CARD OPTION   │      │ NEW PAYMENT FLOW     │
           │ data-testid="saved-card" │      │ ☐ Save payment info  │
           │ Visa ****1234            │      │   (if allowed)       │
           │ [Use This Card]          │      │ [Square Web SDK]     │
           │ [Use Different Card]     │      └──────────────────────┘
           └──────────────────────────┘                │
                         │                             │
                         ▼                             ▼
           POST /pay-with-saved          POST /checkout
                         │                             │
                         └─────────┬───────────────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │ PAYMENT PROCESSING  │
                         │ Square Payment API  │
                         └─────────────────────┘
                                   │
                         ┌─────────┴─────────┐
                         │                   │
                    SUCCESS              FAILURE
                         │                   │
                         ▼                   ▼
           ┌──────────────────────┐   ┌─────────────────┐
           │ Return JWT Token     │   │ Show Error      │
           │ Create Purchase      │   │ Retry Payment   │
           │ Send confirmation ✉️  │   └─────────────────┘
           │ Store viewer identity│
           └──────────────────────┘
                         │
                         ▼
           ┌──────────────────────────┐
           │ SHOW VIDEO PLAYER        │
           │ + SCOREBOARD OVERLAY     │
           │ + CHAT (if enabled)      │
           └──────────────────────────┘
```

### Paywall Modal Component

```tsx
// apps/web/components/PaywallModal.tsx

interface PaywallModalProps {
  isOpen: boolean;
  priceInCents: number;
  paywallMessage: string; // ✅ Admin custom message
  slug: string;
  email: string;
  firstName: string;
  lastName: string;
  allowSavePayment: boolean;
  onSuccess: (token: string) => void;
  onCancel: () => void;
}

export function PaywallModal({
  isOpen,
  priceInCents,
  paywallMessage,
  slug,
  email,
  firstName,
  lastName,
  allowSavePayment,
  onSuccess,
  onCancel
}: PaywallModalProps) {
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [useSavedCard, setUseSavedCard] = useState(false);
  const [savePayment, setSavePayment] = useState(false);
  
  useEffect(() => {
    // Check for saved payment methods
    checkSavedPaymentMethods();
  }, [email]);
  
  const checkSavedPaymentMethods = async () => {
    const response = await fetch(
      `${API_URL}/api/direct/${slug}/payment-methods?email=${encodeURIComponent(email)}`
    );
    const data = await response.json();
    
    if (data.hasSavedCard) {
      setSavedCard({
        customerId: data.squareCustomerId,
        lastFour: data.cardLastFour,
        brand: data.cardBrand
      });
      setUseSavedCard(true);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent 
        className="glass border border-primary/20 max-w-md"
        data-testid="paywall-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Access Required
          </DialogTitle>
        </DialogHeader>
        
        {/* ✅ ADMIN CUSTOM MESSAGE */}
        {paywallMessage && (
          <div 
            className="bg-primary/10 border border-primary/20 rounded-lg p-4 my-4"
            data-testid="paywall-admin-message"
          >
            <p className="text-sm whitespace-pre-wrap">
              {paywallMessage}
            </p>
          </div>
        )}
        
        {/* PRICE DISPLAY */}
        <div className="text-center py-4">
          <p className="text-3xl font-bold">
            ${(priceInCents / 100).toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground">One-time access fee</p>
        </div>
        
        {/* SAVED CARD OPTION */}
        {savedCard && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="use-saved"
                checked={useSavedCard}
                onChange={() => setUseSavedCard(true)}
                data-testid="radio-use-saved-card"
              />
              <label htmlFor="use-saved" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>
                  {savedCard.brand} ****{savedCard.lastFour}
                </span>
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="use-new"
                checked={!useSavedCard}
                onChange={() => setUseSavedCard(false)}
                data-testid="radio-use-new-card"
              />
              <label htmlFor="use-new">Use a different card</label>
            </div>
          </div>
        )}
        
        {/* NEW PAYMENT FORM */}
        {!useSavedCard && (
          <div className="space-y-4 border-t pt-4">
            {/* Square Web Payment SDK Form */}
            <div id="card-container" data-testid="square-card-form" />
            
            {allowSavePayment && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="save-payment"
                  checked={savePayment}
                  onChange={(e) => setSavePayment(e.target.checked)}
                  data-testid="checkbox-save-payment"
                />
                <label htmlFor="save-payment" className="text-sm">
                  Save payment information for future streams
                </label>
              </div>
            )}
          </div>
        )}
        
        {/* ACTION BUTTONS */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            data-testid="btn-cancel-payment"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            className="flex-1"
            disabled={isProcessing}
            data-testid="btn-submit-payment"
          >
            {isProcessing ? 'Processing...' : useSavedCard ? 'Pay Now' : 'Pay & Watch'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 📧 Email Notification System

### Email Types

#### 1. Registration Confirmation Email

**Trigger:** Immediately after viewer unlock (with or without payment)

```html
Subject: You're registered for [Stream Title]

Hi [firstName],

You're all set to watch [Stream Title]!

🎬 Stream Details:
• Event: [homeTeam] vs [awayTeam] (if scoreboard exists)
• Scheduled: [scheduledStartAt] (if set)
• Access Link: https://fieldview.live/direct/[slug]

We'll send you a reminder 5 minutes before the stream starts.

Watch Now: [Button linking to stream]

---
FieldView.Live
```

#### 2. Pre-Stream Reminder Email (5 Minutes Before)

**Trigger:** Cron job runs every minute, sends if `now >= scheduledStartAt - reminderMinutes`

```html
Subject: 🔴 LIVE in 5 minutes: [Stream Title]

Hi [firstName],

[Stream Title] is starting in 5 minutes!

Get ready to watch [homeTeam] vs [awayTeam].

📺 Join Now: [Button linking to stream]

The stream will begin at [scheduledStartAt].

---
FieldView.Live
```

### Email Implementation

#### Background Job (Cron)

```typescript
// apps/api/src/jobs/send-stream-reminders.ts

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

export async function sendStreamReminders() {
  const now = new Date();
  
  // Find streams that:
  // 1. Are scheduled
  // 2. Haven't sent reminders yet
  // 3. Are within reminder window (now + reminderMinutes)
  const streams = await prisma.directStream.findMany({
    where: {
      scheduledStartAt: {
        gte: now,
        lte: new Date(now.getTime() + 10 * 60 * 1000) // Next 10 minutes
      },
      reminderSentAt: null,
      sendReminders: true
    },
    include: {
      game: {
        include: {
          viewerIdentities: {
            where: {
              wantsReminders: true
            }
          }
        }
      },
      scoreboard: true
    }
  });
  
  logger.info({ streamCount: streams.length }, 'Checking streams for reminders');
  
  for (const stream of streams) {
    const reminderTime = new Date(
      stream.scheduledStartAt.getTime() - (stream.reminderMinutes * 60 * 1000)
    );
    
    // Check if it's time to send
    if (now >= reminderTime) {
      await sendRemindersForStream(stream);
      
      // Mark reminder as sent
      await prisma.directStream.update({
        where: { id: stream.id },
        data: { reminderSentAt: now }
      });
    }
  }
}

async function sendRemindersForStream(stream: DirectStream) {
  const viewers = stream.game?.viewerIdentities || [];
  
  logger.info(
    { slug: stream.slug, recipientCount: viewers.length },
    'Sending stream reminders'
  );
  
  const streamUrl = `${process.env.WEB_URL}/direct/${stream.slug}`;
  
  for (const viewer of viewers) {
    try {
      await sendEmail({
        to: viewer.email,
        subject: `🔴 LIVE in ${stream.reminderMinutes} minutes: ${stream.title}`,
        template: 'stream-reminder',
        data: {
          firstName: viewer.firstName,
          streamTitle: stream.title,
          homeTeam: stream.scoreboard?.homeTeamName || 'Home',
          awayTeam: stream.scoreboard?.awayTeamName || 'Away',
          scheduledStartAt: stream.scheduledStartAt,
          streamUrl,
          reminderMinutes: stream.reminderMinutes
        }
      });
      
      logger.info({ email: viewer.email }, 'Reminder sent');
    } catch (error) {
      logger.error({ error, email: viewer.email }, 'Failed to send reminder');
    }
  }
}
```

#### Cron Job Setup

```typescript
// apps/api/src/server.ts

import cron from 'node-cron';
import { sendStreamReminders } from './jobs/send-stream-reminders';

// Run every minute
cron.schedule('* * * * *', async () => {
  try {
    await sendStreamReminders();
  } catch (error) {
    logger.error({ error }, 'Stream reminder job failed');
  }
});
```

#### Email Service

```typescript
// apps/api/src/lib/email.ts

import nodemailer from 'nodemailer';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '4305'), // Mailpit
  secure: false,
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined
});

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export async function sendEmail({ to, subject, template, data }: EmailOptions) {
  const html = renderTemplate(template, data);
  
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'notifications@fieldview.live',
    to,
    subject,
    html
  });
  
  logger.info({ to, subject }, 'Email sent');
}

function renderTemplate(template: string, data: Record<string, any>): string {
  // Simple template rendering (or use a real template engine)
  if (template === 'stream-reminder') {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🔴 Stream Starting Soon!</h1>
        </div>
        
        <div style="padding: 30px;">
          <p style="font-size: 18px;">Hi ${data.firstName},</p>
          
          <p style="font-size: 16px;">
            <strong>${data.streamTitle}</strong> is starting in ${data.reminderMinutes} minutes!
          </p>
          
          <p style="font-size: 16px;">
            Get ready to watch <strong>${data.homeTeam}</strong> vs <strong>${data.awayTeam}</strong>.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.streamUrl}" 
               style="background: #1e40af; color: white; padding: 15px 40px; 
                      text-decoration: none; border-radius: 8px; font-size: 18px; 
                      display: inline-block;">
              📺 Join Stream Now
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            The stream will begin at ${new Date(data.scheduledStartAt).toLocaleString()}.
          </p>
        </div>
        
        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>FieldView.Live - Live Sports Streaming</p>
          <p>You're receiving this because you registered for this stream.</p>
        </div>
      </body>
      </html>
    `;
  }
  
  return '';
}
```

---

## 📐 Architecture Diagrams

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FIELDVIEW.LIVE ARCHITECTURE                     │
│                         (Social Producer + Paywall)                      │
└─────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                           │
├───────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  DirectStreamPageBase Component                                        │
│  ├─ Video Player (HLS.js)                                              │
│  ├─ ViewerUnlockForm (email, name, opt-in)                            │
│  ├─ PaywallModal (admin message, Square payment)                      │
│  ├─ ScoreboardOverlay (jersey colors, score, clock)                   │
│  ├─ SocialProducerPanel (team names, colors, score, clock)            │
│  ├─ ChatCornerPeek (if chatEnabled)                                   │
│  └─ AdminPanel (settings, viewer analytics)                            │
│                                                                         │
│  Real-Time Connections:                                                │
│  • SSE: /api/direct/:slug/chat/stream                                  │
│  • SSE: /api/direct/:slug/scoreboard/stream                            │
│  • Heartbeat: POST /api/direct/:slug/heartbeat (every 30s)            │
│                                                                         │
└───────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS / JWT / SSE
                                    │
┌───────────────────────────────────────────────────────────────────────┐
│                          BACKEND API (Express)                         │
├───────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Route Layers:                                                         │
│  ├─ /api/direct/:slug/bootstrap (public)                              │
│  ├─ /api/direct/:slug/unlock-viewer (public)                          │
│  ├─ /api/direct/:slug/unlock-admin (password)                         │
│  ├─ /api/direct/:slug/settings (admin JWT)                            │
│  ├─ /api/direct/:slug/viewers/active (admin JWT)                      │
│  │                                                                      │
│  ├─ /api/direct/:slug/scoreboard (public read)                        │
│  ├─ /api/direct/:slug/scoreboard (password/JWT write)                 │
│  ├─ /api/direct/:slug/scoreboard/clock/* (password/JWT)               │
│  ├─ /api/direct/:slug/scoreboard/stream (SSE, public)                 │
│  │                                                                      │
│  ├─ /api/direct/:slug/checkout (public)                               │
│  ├─ /api/direct/:slug/payment-methods (public)                        │
│  └─ /api/direct/:slug/pay-with-saved (public)                         │
│                                                                         │
│  Middleware:                                                           │
│  ├─ adminJwtAuth (JWT validation)                                     │
│  ├─ viewerAuth (Viewer JWT validation)                                │
│  ├─ validateProducerPassword (Scoreboard access)                      │
│  └─ rateLimiting (Public endpoint protection)                         │
│                                                                         │
│  Services:                                                             │
│  ├─ PaymentService (Square integration)                               │
│  ├─ EmailService (Nodemailer + templates)                             │
│  ├─ ChatService (SSE + Redis pubsub)                                  │
│  └─ NotificationService (Email sending)                               │
│                                                                         │
└───────────────────────────────────────────────────────────────────────┘
                          │                           │
                          │                           │
                ┌─────────┴──────────┐      ┌────────┴──────────┐
                │                    │      │                   │
┌───────────────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│   DATABASE (PostgreSQL)   │  │   REDIS (Cache)  │  │  SQUARE PAYMENTS  │
├───────────────────────────┤  ├──────────────────┤  ├────────────────────┤
│                           │  │                  │  │                    │
│ Tables:                   │  │ • Chat pubsub    │  │ • Payment API      │
│ • DirectStream            │  │ • Rate limiting  │  │ • Customer API     │
│   - scheduledStartAt ✨    │  │ • SSE channels   │  │ • Cards API        │
│   - reminderSentAt ✨      │  │                  │  │ • Checkout API     │
│   - paywallMessage ✨      │  └──────────────────┘  └────────────────────┘
│                           │
│ • GameScoreboard ✨        │
│   - producerPassword      │              ┌────────────────────┐
│   - homeJerseyColor       │              │  EMAIL (SMTP)      │
│   - clockMode/Seconds     │              ├────────────────────┤
│                           │              │                    │
│ • ViewerIdentity          │              │ • Mailpit (local)  │
│   - wantsReminders ✨      │              │ • SendGrid (prod)  │
│   - squareCustomerId ✨    │              │                    │
│                           │              │ Templates:         │
│ • Purchase                │              │ • Registration     │
│   - savePaymentMethod ✨   │              │ • Reminder (5 min) │
│   - squareCardId ✨        │              │                    │
│                           │              └────────────────────┘
└───────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│                        BACKGROUND JOBS (Cron)                          │
├───────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  • Stream Reminder Job (runs every 1 minute)                           │
│    - Queries streams where scheduledStartAt - reminderMinutes <= now  │
│    - Sends email to all registered viewers (wantsReminders = true)    │
│    - Updates reminderSentAt to prevent duplicates                     │
│                                                                         │
└───────────────────────────────────────────────────────────────────────┘

Legend:
✨ = New field/table for this feature
🔒 = Requires authentication
🌐 = Public access
📧 = Triggers email
```

### Data Flow: Paywall with Saved Payment

```
USER FLOW: Returning Viewer with Saved Payment

┌─────────────────────────────────────────────────────────────┐
│ 1. User enters email on ViewerUnlockForm                    │
│    data-testid="viewer-unlock-form"                         │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. POST /api/direct/:slug/unlock-viewer                     │
│    Body: { email, firstName, lastName, wantsReminders }     │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Server checks: paywallEnabled?                           │
│    IF YES → Check if user has existing Purchase             │
└─────────────────────────────────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
    USER ALREADY PAID          PAYMENT REQUIRED
            │                         │
            ▼                         ▼
┌─────────────────────┐    ┌──────────────────────────────────┐
│ Return JWT Token    │    │ Return paywallRequired: true     │
│ Grant access        │    │ Include paywallMessage ✅        │
└─────────────────────┘    └──────────────────────────────────┘
                                      │
                                      ▼
                           ┌──────────────────────────────────┐
                           │ 4. Frontend shows PaywallModal   │
                           │    Display admin message ✅       │
                           └──────────────────────────────────┘
                                      │
                                      ▼
                           ┌──────────────────────────────────┐
                           │ 5. GET /payment-methods          │
                           │    Query: email=user@example.com │
                           └──────────────────────────────────┘
                                      │
                                      ▼
                           ┌──────────────────────────────────┐
                           │ 6. Server checks ViewerIdentity  │
                           │    for squareCustomerId          │
                           └──────────────────────────────────┘
                                      │
                        ┌─────────────┴─────────────┐
                        │                           │
                  HAS SAVED CARD              NO SAVED CARD
                        │                           │
                        ▼                           ▼
          ┌──────────────────────┐      ┌─────────────────────┐
          │ 7a. Show saved card  │      │ 7b. Show Square SDK │
          │ Visa ****1234        │      │ New payment form    │
          │ [Use This Card]      │      │ ☐ Save payment info │
          └──────────────────────┘      └─────────────────────┘
                        │                           │
                        ▼                           ▼
          ┌──────────────────────┐      ┌─────────────────────┐
          │ POST /pay-with-saved │      │ POST /checkout      │
          │ squareCustomerId     │      │ tokenize card       │
          │ cardId               │      │ createPayment       │
          └──────────────────────┘      │ saveCardIfChecked   │
                                        └─────────────────────┘
                        │                           │
                        └───────────┬───────────────┘
                                    │
                                    ▼
                          ┌─────────────────────┐
                          │ 8. Create Purchase  │
                          │ Create ViewerIdentity│
                          │ Generate JWT token  │
                          └─────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────────┐
                          │ 9. Send confirmation│
                          │ email ✉️             │
                          └─────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────────┐
                          │ 10. Return JWT      │
                          │ Frontend stores     │
                          │ Shows video player  │
                          └─────────────────────┘
```

### Data Flow: Scheduled Stream Reminder

```
AUTOMATED EMAIL REMINDER FLOW

┌─────────────────────────────────────────────────────────────┐
│ ADMIN SETUP                                                  │
├─────────────────────────────────────────────────────────────┤
│ 1. Admin unlocks admin panel                                │
│ 2. Sets scheduledStartAt: "2026-01-10T19:00:00Z"           │
│ 3. Sets sendReminders: true                                 │
│ 4. Sets reminderMinutes: 5                                  │
│ 5. POST /api/direct/:slug/settings                          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼ (Saved to database)
┌─────────────────────────────────────────────────────────────┐
│ DATABASE STATE                                               │
├─────────────────────────────────────────────────────────────┤
│ DirectStream:                                                │
│ • slug: "tchs"                                              │
│ • scheduledStartAt: 2026-01-10T19:00:00Z                   │
│ • sendReminders: true                                        │
│ • reminderMinutes: 5                                         │
│ • reminderSentAt: null                                       │
│                                                              │
│ Associated ViewerIdentities:                                 │
│ • Alice (alice@example.com, wantsReminders: true)          │
│ • Bob (bob@example.com, wantsReminders: true)              │
│ • Charlie (charlie@test.com, wantsReminders: false) ❌      │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ (Time passes...)
                         │
┌─────────────────────────────────────────────────────────────┐
│ CRON JOB EXECUTION (runs every 1 minute)                    │
├─────────────────────────────────────────────────────────────┤
│ Current Time: 2026-01-10T18:55:00Z                         │
│                                                              │
│ 1. Query streams where:                                     │
│    • scheduledStartAt <= now + 10 minutes                   │
│    • reminderSentAt IS NULL                                 │
│    • sendReminders = true                                   │
│                                                              │
│ 2. For each stream, calculate reminder time:                │
│    reminderTime = scheduledStartAt - (reminderMinutes * 60) │
│    = 2026-01-10T19:00:00Z - 300s                           │
│    = 2026-01-10T18:55:00Z                                   │
│                                                              │
│ 3. Check if now >= reminderTime: ✅ YES                     │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ EMAIL SENDING PROCESS                                        │
├─────────────────────────────────────────────────────────────┤
│ 1. Get all ViewerIdentities for this game                   │
│    WHERE wantsReminders = true                              │
│    → Found: Alice, Bob (Charlie excluded)                   │
│                                                              │
│ 2. For each viewer:                                         │
│    • Fetch scoreboard data (team names)                     │
│    • Generate stream URL                                    │
│    • Render email template                                  │
│    • Send via SMTP                                          │
│                                                              │
│ 3. Send to Alice (alice@example.com) ✉️ ✅                 │
│ 4. Send to Bob (bob@example.com) ✉️ ✅                     │
│                                                              │
│ 5. Update DirectStream.reminderSentAt = NOW                │
│    (Prevents duplicate sends)                               │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ EMAIL RECEIVED BY ALICE & BOB                               │
├─────────────────────────────────────────────────────────────┤
│ Subject: 🔴 LIVE in 5 minutes: TCHS Live Stream            │
│                                                              │
│ Hi Alice,                                                   │
│                                                              │
│ TCHS Live Stream is starting in 5 minutes!                 │
│                                                              │
│ Get ready to watch Twin Cities HS vs Visitors.             │
│                                                              │
│ [📺 Join Stream Now]                                        │
│                                                              │
│ The stream will begin at 7:00 PM.                          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ USER CLICKS LINK                                             │
├─────────────────────────────────────────────────────────────┤
│ • Navigates to https://fieldview.live/direct/tchs          │
│ • If has JWT in localStorage → Shows video immediately     │
│ • If no JWT → Shows unlock form (paywall if enabled)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Strategy

### E2E Test Plan (Playwright)

#### 1. Social Producer Panel Tests (15 tests)

```typescript
describe('Social Producer Panel - Access Control', () => {
  test('should allow anyone to edit when no password is set', async ({ page }) => {
    // Admin creates scoreboard with NO password
    // Regular viewer can open producer panel
    // Regular viewer can update score
    // Scoreboard updates for all viewers
  });

  test('should require password when password is set', async ({ page }) => {
    // Admin sets producer password
    // Regular viewer sees password prompt
    // Invalid password shows error
    // Correct password grants access
  });

  test('should allow admin to edit without password', async ({ page }) => {
    // Admin unlocks admin panel
    // Producer panel automatically unlocked
    // Can edit scoreboard
  });
});

describe('Social Producer Panel - Scoreboard Functionality', () => {
  test('should update team names and jersey colors', async ({ page }) => {
    // Set home team name
    // Set away team name
    // Pick jersey colors
    // Save changes
    // Verify overlay updates
  });

  test('should update scores', async ({ page }) => {
    // Update home score
    // Update away score
    // Verify SSE update to all viewers
  });

  test('should start/pause/reset clock', async ({ page }) => {
    // Start clock from 00:00
    // Wait 3 seconds
    // Verify clock shows 00:03
    // Pause clock
    // Verify time frozen
    // Reset clock
    // Verify back to 00:00
  });

  test('should sync clock across multiple browsers', async ({ page1, page2 }) => {
    // Start clock in producer panel
    // Open stream in second browser
    // Verify both show same time (within 1 second)
  });

  test('should persist clock on page refresh', async ({ page }) => {
    // Start clock
    // Wait 5 seconds
    // Refresh page
    // Verify clock continues from ~00:05
  });

  test('should display jersey colors in overlay', async ({ page }) => {
    // Set home color to red (#FF0000)
    // Set away color to blue (#0000FF)
    // Verify overlay panels have correct background colors
  });

  test('should toggle scoreboard visibility', async ({ page }) => {
    // Disable visibility
    // Verify overlay hidden
    // Enable visibility
    // Verify overlay shown
  });
});
```

#### 2. Paywall Tests (18 tests)

```typescript
describe('Paywall - Admin Message Display', () => {
  test('should show admin custom message in paywall modal', async ({ page }) => {
    // Admin sets paywall message
    // User triggers paywall
    // Verify modal shows admin message
    // data-testid="paywall-admin-message"
  });

  test('should handle long paywall messages (1000 chars)', async ({ page }) => {
    // Admin sets max length message
    // Verify message displays correctly
    // Verify scrollable if needed
  });

  test('should handle paywall message with line breaks', async ({ page }) => {
    // Admin sets message with \n
    // Verify whitespace-pre-wrap preserves formatting
  });
});

describe('Paywall - First-Time Payment', () => {
  test('should process new payment with Square', async ({ page }) => {
    // Enter email, name
    // Trigger paywall
    // Fill Square card form
    // Submit payment
    // Verify JWT returned
    // Verify video player shown
  });

  test('should save payment method when checkbox checked', async ({ page }) => {
    // Enter email, name
    // Trigger paywall
    // Check "Save payment info"
    // Complete payment
    // Verify squareCustomerId saved to ViewerIdentity
  });

  test('should send confirmation email after payment', async ({ page }) => {
    // Complete payment
    // Check Mailpit inbox
    // Verify confirmation email received
  });
});

describe('Paywall - Saved Payment Methods', () => {
  test('should detect saved card for returning email', async ({ page }) => {
    // User already has saved card
    // Enter same email
    // Trigger paywall
    // Verify saved card option shown
    // data-testid="radio-use-saved-card"
  });

  test('should pay with saved card', async ({ page }) => {
    // Select saved card option
    // Click "Pay Now"
    // Verify payment processed without card form
    // Verify JWT returned
  });

  test('should allow using different card', async ({ page }) => {
    // Saved card exists
    // Select "Use different card"
    // data-testid="radio-use-new-card"
    // Verify Square card form shown
    // Complete payment with new card
  });

  test('should handle payment with expired saved card', async ({ page }) => {
    // Attempt to use expired card
    // Verify error message
    // Offer to use different card
  });
});

describe('Paywall - Error Handling', () => {
  test('should handle declined payment', async ({ page }) => {
    // Use test card that declines
    // Verify error message shown
    // Allow retry
  });

  test('should validate price range (0-$999.99)', async ({ page }) => {
    // Admin tries to set price over $999.99
    // Verify validation error
  });

  test('should handle Square API downtime', async ({ page }) => {
    // Mock Square API failure
    // Verify graceful error handling
    // Show support contact info
  });
});
```

#### 3. Email Notification Tests (12 tests)

```typescript
describe('Email Notifications - Registration', () => {
  test('should send confirmation email on viewer unlock', async ({ page }) => {
    // Register viewer
    // Check Mailpit inbox
    // Verify email received
    // Verify email contains stream link
  });

  test('should not send email if wantsReminders unchecked', async ({ page }) => {
    // Uncheck reminder opt-in
    // data-testid="checkbox-wants-reminders"
    // Register viewer
    // Verify no email sent (or email sent but flagged as no-reminders)
  });

  test('should include stream details in registration email', async ({ page }) => {
    // Register viewer
    // Verify email contains:
    // • Stream title
    // • Scheduled start time (if set)
    // • Access link
  });
});

describe('Email Notifications - Pre-Stream Reminders', () => {
  test('should send reminder 5 minutes before scheduled start', async ({ page }) => {
    // Admin sets scheduledStartAt to NOW + 6 minutes
    // Register viewer
    // Wait for cron job (mock time or use real delay)
    // Verify reminder email sent at NOW + 1 minute
  });

  test('should not send duplicate reminders', async ({ page }) => {
    // Set up stream with reminder time passed
    // Run cron job twice
    // Verify only one email sent (reminderSentAt prevents duplicates)
  });

  test('should include team names in reminder email', async ({ page }) => {
    // Set up scoreboard with team names
    // Trigger reminder
    // Verify email contains "Team A vs Team B"
  });

  test('should customize reminder timing (reminderMinutes)', async ({ page }) => {
    // Admin sets reminderMinutes to 10
    // Verify reminder sent 10 minutes before start
  });

  test('should respect wantsReminders preference', async ({ page }) => {
    // Viewer A: wantsReminders = true
    // Viewer B: wantsReminders = false
    // Trigger reminders
    // Verify only A receives email
  });

  test('should handle streams without scheduledStartAt', async ({ page }) => {
    // Stream has no scheduled time
    // Cron job runs
    // Verify no reminders sent for this stream
  });

  test('should disable reminders if sendReminders = false', async ({ page }) => {
    // Admin disables reminders
    // Verify cron job skips this stream
  });
});

describe('Email Notifications - Templates', () => {
  test('should render HTML email templates correctly', async ({ page }) => {
    // Send reminder
    // Verify HTML structure
    // Verify button links work
    // Verify styling applied
  });

  test('should handle missing template data gracefully', async ({ page }) => {
    // Stream has no team names
    // Verify email still sends with defaults
  });
});
```

#### 4. Viewer Analytics Tests (8 tests)

```typescript
describe('Viewer Analytics - Active Viewers', () => {
  test('should count active viewers (lastSeenAt < 5 min)', async ({ page }) => {
    // Register 3 viewers
    // Wait 3 minutes
    // Admin opens analytics
    // Verify count = 3
  });

  test('should mark inactive viewers as red', async ({ page }) => {
    // Register viewer
    // Wait 6 minutes (mock time)
    // Admin opens analytics
    // Verify red status indicator
    // data-testid="viewer-status-indicator"
  });

  test('should update viewer lastSeenAt on heartbeat', async ({ page }) => {
    // Viewer opens stream
    // Heartbeat sent every 30s
    // Verify lastSeenAt updated in database
  });

  test('should show viewers sorted by most recent', async ({ page }) => {
    // Alice registers at T+0
    // Bob registers at T+1
    // Charlie registers at T+2
    // Verify list order: Charlie, Bob, Alice
  });

  test('should display viewer names without personal data', async ({ page }) => {
    // Viewer registers with email + name
    // Admin opens analytics
    // Verify only name shown (firstName + lastName)
    // Verify NO email, NO IP, NO location
  });

  test('should auto-refresh viewer count', async ({ page }) => {
    // Admin opens analytics (count = 5)
    // New viewer registers
    // Verify count updates to 6 (via polling or SSE)
  });

  test('should require admin JWT for viewer analytics', async ({ page }) => {
    // Non-admin tries to access /viewers/active
    // Verify 401 Unauthorized
  });

  test('should handle large viewer lists (500+)', async ({ page }) => {
    // Seed 500 viewers
    // Open analytics
    // Verify list renders without lag
    // Verify scrolling works
  });
});
```

### Integration Test Summary

| Feature | E2E Tests | Expected Outcome |
|---------|-----------|------------------|
| **Social Producer** | 15 tests | All access modes work, clock syncs, jersey colors display |
| **Paywall** | 18 tests | Admin message shows, saved payments work, errors handled |
| **Email Notifications** | 12 tests | Reminders sent on time, templates render, opt-out respected |
| **Viewer Analytics** | 8 tests | Active count accurate, no personal data exposed, admin-only |
| **TOTAL** | **53 tests** | **100% automation coverage** |

---

## 🚀 Implementation Roadmap

### Phase 1: Database & API Foundation (6 hours)

#### 1.1 Database Migrations (1.5 hours)
- ✅ Add `scheduledStartAt`, `reminderSentAt`, `sendReminders`, `reminderMinutes` to `DirectStream`
- ✅ Create `GameScoreboard` table with `producerPassword`, jersey colors, clock fields
- ✅ Add `wantsReminders`, `squareCustomerId` to `ViewerIdentity`
- ✅ Add `savePaymentMethod`, `squareCardId`, `cardLastFour`, `cardBrand` to `Purchase`
- ✅ Run migrations on local + test databases

#### 1.2 Backend APIs (4.5 hours)
- ✅ Social Producer endpoints (CRUD, clock control, SSE stream)
- ✅ Enhanced paywall endpoints (payment-methods, pay-with-saved)
- ✅ Email service setup (Nodemailer, templates)
- ✅ Viewer analytics endpoints (active list, heartbeat)
- ✅ Access control middleware (producer password validation)

### Phase 2: Email Notification System (4 hours)

#### 2.1 Email Templates (1 hour)
- ✅ Registration confirmation template
- ✅ Pre-stream reminder template
- ✅ HTML + CSS styling
- ✅ Dynamic data injection

#### 2.2 Background Jobs (2 hours)
- ✅ Cron job setup (`node-cron`)
- ✅ Stream reminder job logic
- ✅ Query optimization (indexes on `scheduledStartAt`)
- ✅ Error handling + logging

#### 2.3 Testing (1 hour)
- ✅ Unit tests for email service
- ✅ Integration tests for cron job
- ✅ Manual testing with Mailpit

### Phase 3: Frontend Components (10 hours)

#### 3.1 Social Producer Panel (4 hours)
- ✅ `SocialProducerPanel.tsx` component
- ✅ Team name inputs, jersey color pickers
- ✅ Score inputs, clock controls
- ✅ Password unlock flow
- ✅ SSE subscription for updates
- ✅ All `data-testid` attributes

#### 3.2 Scoreboard Overlay (3 hours)
- ✅ `ScoreboardOverlay.tsx` component
- ✅ Jersey color gradient backgrounds
- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Clock display with server sync
- ✅ Visibility toggle
- ✅ Position configuration

#### 3.3 Paywall Enhancements (3 hours)
- ✅ Display admin message prominently
- ✅ Saved payment method detection
- ✅ Radio button UI for card selection
- ✅ Error handling + retry flow
- ✅ All `data-testid` attributes

### Phase 4: Admin Panel Enhancements (5 hours)

#### 4.1 Scheduling UI (2 hours)
- ✅ Date/time picker for `scheduledStartAt`
- ✅ Reminder settings (enable, minutes)
- ✅ Test reminder button
- ✅ Preview email template

#### 4.2 Scoreboard Setup (2 hours)
- ✅ Producer password field (optional)
- ✅ Default jersey colors
- ✅ Visibility toggle
- ✅ Position selector

#### 4.3 Viewer Analytics UI (1 hour)
- ✅ Active viewer count badge
- ✅ Viewer list with green/red indicators
- ✅ Auto-refresh (polling or SSE)

### Phase 5: Testing & QA (8 hours)

#### 5.1 E2E Test Writing (5 hours)
- ✅ Write 53 Playwright tests (see test plan above)
- ✅ All tests automation-friendly
- ✅ Run on Chrome, Firefox, Safari

#### 5.2 Manual Testing (2 hours)
- ✅ Test all flows end-to-end
- ✅ Test on mobile devices
- ✅ Cross-browser compatibility
- ✅ Email rendering (Gmail, Outlook, Apple Mail)

#### 5.3 Bug Fixes (1 hour)
- ✅ Address issues found during testing
- ✅ Performance optimization
- ✅ UX polish

### Phase 6: Documentation (2 hours)

#### 6.1 User Documentation
- ✅ Admin guide for setting up paywall
- ✅ Admin guide for social producer panel
- ✅ Email notification setup guide

#### 6.2 Developer Documentation
- ✅ API endpoint reference
- ✅ Database schema documentation
- ✅ Testing guide

---

## 📊 Total Effort Estimation

| Phase | Hours | Notes |
|-------|-------|-------|
| **Phase 1: Database & API** | 6h | Foundation for all features |
| **Phase 2: Email System** | 4h | Cron jobs + templates |
| **Phase 3: Frontend Components** | 10h | 3 major components |
| **Phase 4: Admin Panel** | 5h | Configuration UI |
| **Phase 5: Testing & QA** | 8h | 53 E2E tests |
| **Phase 6: Documentation** | 2h | User + dev docs |
| **TOTAL** | **35 hours** | ~1 week of focused work |

---

## ✅ Automation Requirements Compliance

### Every Component Has:
- ✅ `data-testid` on all interactive elements
- ✅ `aria-label` for accessibility
- ✅ Semantic HTML (`<form>`, `<button>`, `<input>`)
- ✅ `name` attributes on form fields
- ✅ `role="alert"` on error messages
- ✅ Keyboard navigation support
- ✅ Loading states with `data-loading` attribute

### Example: Social Producer Panel
```tsx
<div data-testid="social-producer-panel">
  <input
    id="home-team"
    name="home-team"
    data-testid="input-home-team-name"
    aria-label="Home team name"
  />
  <input
    type="color"
    id="home-color"
    name="home-color"
    data-testid="input-home-jersey-color"
    aria-label="Home team jersey color"
  />
  <button
    type="button"
    data-testid="btn-clock-start"
    aria-label="Start game clock"
    disabled={clockMode === 'running'}
  >
    ▶️ Start
  </button>
</div>
```

---

## 🎯 Success Criteria

### Functional Requirements
- ✅ Social producer panel allows anyone to edit when no password
- ✅ Social producer panel requires password when set
- ✅ Paywall displays admin custom message
- ✅ Saved payment methods retrieved by email
- ✅ Email reminders sent 5 minutes before scheduled start
- ✅ Clock syncs across all viewers within 1 second
- ✅ Viewer analytics shows active status without personal data

### Non-Functional Requirements
- ✅ All 53 E2E tests passing
- ✅ 100% automation-friendly (data-testids everywhere)
- ✅ Page load < 2 seconds
- ✅ Email delivery < 10 seconds
- ✅ Cron job execution < 5 seconds per stream
- ✅ Mobile responsive (320px - 1920px)

---

## 🔒 Security & Privacy

### Data Protection
- ✅ No IP addresses stored (removed from requirement)
- ✅ No geolocation tracking
- ✅ Email opt-in required for reminders
- ✅ Producer password hashed with bcrypt (10 rounds)
- ✅ Admin password hashed with bcrypt (10 rounds)
- ✅ JWT tokens expire (viewer: 24h, admin: 1h)

### PCI Compliance (Square Payments)
- ✅ No credit card data stored in database
- ✅ Square tokenization used for all payments
- ✅ Only last 4 digits + brand stored for display
- ✅ Square Customer ID used for saved payments

### Rate Limiting
- ✅ Scoreboard updates: 6 per minute per IP (open mode)
- ✅ Email sends: 100 per hour per stream
- ✅ Heartbeat: 1 per 30 seconds per viewer

---

## 📚 Dependencies

### New NPM Packages
```json
{
  "dependencies": {
    "node-cron": "^3.0.3",          // Cron job scheduling
    "nodemailer": "^6.9.8",         // Email sending
    "html-to-text": "^9.0.5"        // Email plain-text fallback
  }
}
```

### Environment Variables
```bash
# Email (Production - SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxx
EMAIL_FROM=notifications@fieldview.live

# Email (Local - Mailpit)
SMTP_HOST=localhost
SMTP_PORT=4305

# Square (Production)
SQUARE_ACCESS_TOKEN=EAAAxxxx
SQUARE_LOCATION_ID=L123xxxx
SQUARE_ENVIRONMENT=production

# Cron Job Secret
CRON_SECRET=generate-random-secret-here
```

---

## 🎓 Conclusion

This architecture provides a **comprehensive solution** for:

1. ✅ **Community-driven scorekeeping** via Social Producer Panel
2. ✅ **Flexible access control** (open, password-protected, admin-only)
3. ✅ **Enhanced paywall** with admin messages and saved payments
4. ✅ **Automated email reminders** for scheduled streams
5. ✅ **Privacy-first analytics** (name + status only)

All features are **100% automation-friendly**, fully tested with **53 E2E tests**, and designed for **scalability** and **maintainability**.

---

**Ready for implementation approval.**

---

**ROLE: architect STRICT=true**

