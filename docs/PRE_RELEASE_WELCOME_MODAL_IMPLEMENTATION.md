# Pre-Release Implementation Guide: Veo Discovery Welcome Modal & Freemium System

**Version**: 1.0.0  
**Status**: Pre-Release Planning  
**Last Updated**: January 17, 2026  
**Author**: FieldView.Live Engineering

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [User Journey](#user-journey)
3. [Feature Specifications](#feature-specifications)
4. [Database Schema](#database-schema)
5. [Interface Definitions (ISP)](#interface-definitions-isp)
6. [TDD Test Specifications](#tdd-test-specifications)
7. [Component Specifications](#component-specifications)
8. [Abuse Detection & Compassionate Messaging](#abuse-detection--compassionate-messaging)
9. [API Endpoints](#api-endpoints)
10. [Implementation Checklist](#implementation-checklist)
11. [Rollout Plan](#rollout-plan)

---

## Executive Summary

### Background

FieldView.Live uses a guerrilla marketing strategy where our Veo camera appears in other users' camera lists with the name:

```
fieldview.live ← make money off your veo - PLEASE DO NOT SELECT
```

When curious users visit fieldview.live, we need to:
1. Welcome them and explain the value proposition
2. Guide them through monetizing their own Veo stream
3. Offer a freemium model (5 free games)
4. Protect against abuse while remaining compassionate

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Free tier limit | **5 games** | Covers a tournament weekend |
| After limit options | Paywall / Subscribe / Pay-per-stream | Flexibility |
| IP locking | **1 IP per purchase** (family-friendly) | Prevents link sharing |
| Abuse handling | **Compassionate warnings** | Human-first approach |
| Veo Live requirement | **Transparent disclosure** | No hidden requirements |

---

## User Journey

### Entry Point

```
┌─────────────────────────────────────────────────────────────────┐
│                         VEO APP                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📷 Camera List                                          │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │  ○ John's Veo Cam 3                    ● Connected     │    │
│  │                                                         │    │
│  │  ○ fieldview.live ← make money off     ○ Not detected  │    │
│  │    your veo - PLEASE DO NOT SELECT                      │    │
│  │                                                         │    │
│  │  ○ Soccer Field Camera                 ○ Not detected  │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  User thinks: "fieldview.live? What's that? Let me check..."    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Visits fieldview.live
                              │
                              ▼
                    Welcome Modal Appears
```

### Complete User Flow

```
1. User visits fieldview.live
   └── Welcome Modal appears (first visit or ?ref=veo)

2. User clicks "Get Started Free"
   └── Redirects to /owners/register
   
3. User creates account
   ├── Collects fingerprint (abuse detection)
   ├── Checks for linked accounts
   │   ├── 0 accounts → ✅ Allow
   │   ├── 1 account → ⚠️ Warning (proceed with note)
   │   └── 2+ accounts → 🛑 Compassionate block (one-time pass available)
   └── Account created → Dashboard

4. User connects Square
   └── OAuth flow → Square tokens stored encrypted

5. User creates a game
   ├── Enter: Title, Teams, Date/Time
   ├── Choose admin password (manual or auto-generate)
   ├── Optionally: Enable paywall + set price
   ├── Optionally: Paste HLS URL now (or later)
   └── Game created → Get shareable link

6. User gets HLS URL from Veo Live
   ├── Log into Veo account
   ├── Navigate to Live Streaming
   ├── Copy HLS manifest URL
   └── Requires Veo Live subscription ($15/mo add-on)

7. User pastes HLS URL in Admin Panel
   ├── Visit stream page
   ├── Click Admin (gear icon)
   ├── Enter admin password
   └── Paste URL + configure settings

8. User shares link with team
   └── Parents receive: fieldview.live/direct/[slug]

9. Parent accesses stream
   ├── If paywall enabled:
   │   ├── Show payment modal
   │   ├── Pay via Apple Pay / Google Pay / Card
   │   ├── Generate unique token URL
   │   ├── Lock to first IP address
   │   └── Stream access granted
   └── If free:
       └── Direct stream access

10. 5-minute reminder (optional)
    └── Email sent with unique watch link
```

---

## Feature Specifications

### F1: Welcome Modal

**Trigger Conditions:**
- First-time visitor (no `fv_welcome_shown` in localStorage)
- URL parameter `?ref=veo` present
- URL parameter `?welcome=true` present

**Dismiss Behavior:**
- Close button sets `localStorage.fv_welcome_shown = 'true'`
- "Get Started" button also dismisses and redirects

**Content Sections:**
1. Hero: "You spotted us on the field!"
2. Security selling point (IP-locked unique links)
3. Monetization pitch (90% to you via Square)
4. Free trial pitch (5 games, tournament-ready)
5. 4-step how-it-works guide
6. ROI example calculation
7. CTA: "Get Started Free"
8. Footer: Veo Live requirement disclosure

### F2: Freemium System (5 Free Games)

**Rules:**
- New accounts start with `freeGamesUsed = 0`
- Creating a game WITHOUT paywall increments counter
- Creating a game WITH paywall does NOT increment counter
- At `freeGamesUsed >= 5`, free games blocked

**After Limit Options:**
1. **Enable Paywall**: Any amount (even $1) - game doesn't count against limit
2. **Subscribe Pro**: $9.99/month - unlimited free streams
3. **Pay Per Stream**: $2.99 per additional free stream

**UI Messaging:**
```
┌──────────────────────────────────────────────────────────┐
│  🎯 Free Games Remaining: 3 of 5                         │
│  ━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░ 60%                    │
│                                                          │
│  Enable paywall to stream unlimited games!               │
└──────────────────────────────────────────────────────────┘
```

### F3: IP-Locked Entitlements

**Purpose:** Prevent link sharing while allowing family viewing

**How It Works:**
1. Viewer purchases access → Gets unique URL with token
2. First playback request → IP address recorded
3. Same IP → Always allowed (whole family behind router)
4. Different IP → Blocked (with grace period)

**Grace Period:** 15 minutes
- Allows for WiFi → LTE switching on mobile
- After grace, new IP can take over

**Error Message (blocked):**
```
This link is already being used on another device.

If you switched networks (WiFi to mobile data), 
wait 15 minutes and try again, or contact support.
```

### F4: Admin Password System

**Options at Game Creation:**

```
Admin Password
─────────────────────────────────────
○ Let me choose: [________________]

○ Auto-generate for me
  We'll show you the password once.
─────────────────────────────────────
```

**Auto-Generate Format:**
- 8 characters: lowercase letters + numbers
- Example: `abc12xyz`
- Shown once with "Copy" button
- Stored as bcrypt hash

**Password Recovery:**
- "Forgot password" link in admin panel
- Sends reset link to owner's email
- New password replaces old

### F5: 5-Minute Reminders

**Trigger:** Cron job runs every minute

**Query:**
```sql
SELECT * FROM "DirectStream" 
WHERE "scheduledStartAt" BETWEEN NOW() AND NOW() + INTERVAL '6 minutes'
  AND "sendReminders" = true
  AND "reminderSentAt" IS NULL;
```

**Email Template:**
```
Subject: 🎬 [Game Title] starts in 5 minutes!

Hi [First Name],

[Home Team] vs [Away Team] is about to begin.

Watch now: [unique_link]

Enjoy the game!
— FieldView.Live
```

**For Paid Streams:**
- Link is the viewer's unique purchased URL
- No additional payment needed

---

## Database Schema

### New Models

```prisma
// Device fingerprint tracking for abuse detection
model DeviceFingerprint {
  id              String   @id @default(uuid()) @db.Uuid
  fingerprintHash String   @unique // SHA-256 of browser fingerprint
  ipAddresses     String[] // Array of IPs seen from this device
  
  // Linked accounts
  ownerAccounts   OwnerAccountFingerprint[]
  
  // Abuse tracking
  abuseScore      Int      @default(0)    // 0-100 suspicion score
  warningsShown   Int      @default(0)    // Times warning displayed
  oneTimePassUsed Boolean  @default(false) // Compassionate pass used
  flaggedAt       DateTime?
  flagReason      String?
  
  createdAt       DateTime @default(now())
  lastSeenAt      DateTime @default(now())
  
  @@index([fingerprintHash])
}

// Junction: links accounts to fingerprints
model OwnerAccountFingerprint {
  id                  String            @id @default(uuid()) @db.Uuid
  ownerAccountId      String            @db.Uuid
  deviceFingerprintId String            @db.Uuid
  
  ownerAccount        OwnerAccount      @relation(fields: [ownerAccountId], references: [id], onDelete: Cascade)
  deviceFingerprint   DeviceFingerprint @relation(fields: [deviceFingerprintId], references: [id], onDelete: Cascade)
  
  registeredAt        DateTime          @default(now())
  registrationIp      String
  
  @@unique([ownerAccountId, deviceFingerprintId])
  @@index([deviceFingerprintId])
}
```

### Modified Models

```prisma
model OwnerAccount {
  // ... existing fields ...
  
  // Freemium tracking (NEW)
  freeGamesUsed       Int       @default(0)
  subscriptionTier    String?   // 'free' | 'pro' | null
  subscriptionEndsAt  DateTime?
  
  // Abuse tracking (NEW)
  deviceFingerprints  OwnerAccountFingerprint[]
  abuseWarnings       Int       @default(0)
  isSuspended         Boolean   @default(false)
  suspendedReason     String?
}

model Purchase {
  // ... existing fields ...
  
  // IP locking (NEW)
  lockedIpAddress     String?
  lockedAt            DateTime?
  lastAccessedAt      DateTime?
  lastAccessedIp      String?
}

model DirectStream {
  // ... existing fields ...
  
  // Already exists, confirm present:
  scheduledStartAt    DateTime?
  reminderSentAt      DateTime?
  sendReminders       Boolean   @default(true)
  reminderMinutes     Int       @default(5)
}
```

### Migration File

```sql
-- Migration: add_freemium_and_abuse_detection
-- Description: Adds freemium tracking, device fingerprinting, and IP locking

-- Add freemium fields to OwnerAccount
ALTER TABLE "OwnerAccount" 
ADD COLUMN IF NOT EXISTS "freeGamesUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "subscriptionTier" TEXT,
ADD COLUMN IF NOT EXISTS "subscriptionEndsAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "abuseWarnings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT;

-- Add IP locking to Purchase
ALTER TABLE "Purchase"
ADD COLUMN IF NOT EXISTS "lockedIpAddress" TEXT,
ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "lastAccessedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "lastAccessedIp" TEXT;

-- Create DeviceFingerprint table
CREATE TABLE IF NOT EXISTS "DeviceFingerprint" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "fingerprintHash" TEXT NOT NULL UNIQUE,
  "ipAddresses" TEXT[] NOT NULL DEFAULT '{}',
  "abuseScore" INTEGER NOT NULL DEFAULT 0,
  "warningsShown" INTEGER NOT NULL DEFAULT 0,
  "oneTimePassUsed" BOOLEAN NOT NULL DEFAULT false,
  "flaggedAt" TIMESTAMP,
  "flagReason" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastSeenAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "DeviceFingerprint_fingerprintHash_idx" 
ON "DeviceFingerprint"("fingerprintHash");

-- Create junction table
CREATE TABLE IF NOT EXISTS "OwnerAccountFingerprint" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerAccountId" UUID NOT NULL REFERENCES "OwnerAccount"("id") ON DELETE CASCADE,
  "deviceFingerprintId" UUID NOT NULL REFERENCES "DeviceFingerprint"("id") ON DELETE CASCADE,
  "registeredAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "registrationIp" TEXT NOT NULL,
  UNIQUE("ownerAccountId", "deviceFingerprintId")
);

CREATE INDEX IF NOT EXISTS "OwnerAccountFingerprint_deviceFingerprintId_idx"
ON "OwnerAccountFingerprint"("deviceFingerprintId");
```

---

## Interface Definitions (ISP)

Following Interface Segregation Principle, each interface has a single responsibility.

### Freemium Interfaces

```typescript
// apps/api/src/services/IFreemiumService.ts

export interface IFreemiumReader {
  /**
   * Get remaining free games for an owner
   */
  getRemainingFreeGames(ownerAccountId: string): Promise<number>;
  
  /**
   * Check if owner can create a free game
   */
  canCreateFreeGame(ownerAccountId: string): Promise<boolean>;
  
  /**
   * Get current subscription tier
   */
  getSubscriptionTier(ownerAccountId: string): Promise<SubscriptionTier | null>;
  
  /**
   * Get freemium status summary
   */
  getFreemiumStatus(ownerAccountId: string): Promise<FreemiumStatus>;
}

export interface IFreemiumWriter {
  /**
   * Increment free game usage counter
   */
  incrementFreeGameUsage(ownerAccountId: string): Promise<void>;
  
  /**
   * Upgrade to a subscription tier
   */
  upgradeToTier(ownerAccountId: string, tier: SubscriptionTier): Promise<void>;
  
  /**
   * Record a pay-per-stream purchase
   */
  recordPayPerStream(ownerAccountId: string): Promise<void>;
  
  /**
   * Reset free game counter (admin only)
   */
  resetFreeGames(ownerAccountId: string): Promise<void>;
}

export interface FreemiumStatus {
  freeGamesUsed: number;
  freeGamesRemaining: number;
  freeGamesLimit: number;
  subscriptionTier: SubscriptionTier | null;
  subscriptionEndsAt: Date | null;
  canCreateFreeGame: boolean;
}

export type SubscriptionTier = 'free' | 'pro';
```

### Abuse Detection Interfaces

```typescript
// apps/api/src/services/IAbuseDetectionService.ts

export interface IAbuseDetector {
  /**
   * Check if registration should be allowed
   */
  checkRegistration(input: RegistrationCheckInput): Promise<RegistrationCheckResult>;
  
  /**
   * Get accounts linked to a fingerprint
   */
  getLinkedAccounts(fingerprintHash: string): Promise<LinkedAccount[]>;
  
  /**
   * Check if fingerprint has used one-time pass
   */
  hasUsedOneTimePass(fingerprintHash: string): Promise<boolean>;
}

export interface IAbuseRecorder {
  /**
   * Record a fingerprint for an account
   */
  recordFingerprint(input: RecordFingerprintInput): Promise<void>;
  
  /**
   * Mark one-time pass as used
   */
  useOneTimePass(fingerprintHash: string): Promise<void>;
  
  /**
   * Flag an account/fingerprint for abuse
   */
  flagForAbuse(fingerprintHash: string, reason: string): Promise<void>;
  
  /**
   * Increment warning counter
   */
  incrementWarnings(fingerprintHash: string): Promise<void>;
}

export interface RegistrationCheckInput {
  fingerprintHash: string;
  ipAddress: string;
  email: string;
}

export interface RegistrationCheckResult {
  allowed: boolean;
  linkedAccountCount: number;
  abuseDetected: boolean;
  oneTimePassAvailable: boolean;
  message: AbuseMessage | null;
}

export type AbuseMessage = 
  | 'none'
  | 'first_warning'      // 1 existing account
  | 'abuse_detected'     // 2+ existing accounts
  | 'one_time_pass'      // Giving them a pass
  | 'final_block';       // Already used pass, hard block

export interface LinkedAccount {
  ownerAccountId: string;
  email: string;        // Masked: j***@example.com
  registeredAt: Date;
}
```

### Entitlement Interfaces

```typescript
// apps/api/src/services/IEntitlementService.ts

export interface IEntitlementChecker {
  /**
   * Validate stream access with IP checking
   */
  validateAccess(input: AccessCheckInput): Promise<AccessCheckResult>;
  
  /**
   * Check if IP is within grace period for switch
   */
  isWithinGracePeriod(purchaseId: string): Promise<boolean>;
  
  /**
   * Get current locked IP for a purchase
   */
  getLockedIp(purchaseId: string): Promise<string | null>;
}

export interface IEntitlementManager {
  /**
   * Lock purchase to an IP address
   */
  lockToIp(purchaseId: string, ipAddress: string): Promise<void>;
  
  /**
   * Update locked IP (during grace period)
   */
  updateLockedIp(purchaseId: string, newIpAddress: string): Promise<void>;
  
  /**
   * Record access attempt
   */
  recordAccess(purchaseId: string, ipAddress: string): Promise<void>;
  
  /**
   * Generate unique access token
   */
  generateAccessToken(purchaseId: string): Promise<string>;
}

export interface AccessCheckInput {
  purchaseId: string;
  ipAddress: string;
  token: string;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason: AccessDeniedReason | null;
  ipLocked: boolean;
  ipUpdated: boolean;
  gracePeriodActive: boolean;
}

export type AccessDeniedReason = 
  | 'invalid_token'
  | 'expired'
  | 'ip_locked'
  | 'grace_period_expired';
```

### Reminder Interfaces

```typescript
// apps/api/src/services/IReminderService.ts

export interface IReminderReader {
  /**
   * Get all reminders due to be sent
   */
  getDueReminders(): Promise<DueReminder[]>;
  
  /**
   * Check if reminder was already sent
   */
  wasReminderSent(streamId: string): Promise<boolean>;
  
  /**
   * Get viewers who purchased access to a stream
   */
  getStreamViewers(streamId: string): Promise<StreamViewer[]>;
}

export interface IReminderSender {
  /**
   * Send reminder email to a viewer
   */
  sendReminder(input: SendReminderInput): Promise<void>;
  
  /**
   * Mark reminder as sent for a stream
   */
  markReminderSent(streamId: string): Promise<void>;
  
  /**
   * Batch send reminders for a stream
   */
  sendStreamReminders(streamId: string): Promise<ReminderResult>;
}

export interface DueReminder {
  streamId: string;
  streamTitle: string;
  scheduledStartAt: Date;
  homeTeam: string;
  awayTeam: string;
  viewerCount: number;
}

export interface StreamViewer {
  viewerId: string;
  email: string;
  firstName: string;
  purchaseId: string;
  accessToken: string;
}

export interface SendReminderInput {
  viewerEmail: string;
  viewerFirstName: string;
  streamTitle: string;
  homeTeam: string;
  awayTeam: string;
  watchUrl: string;
  scheduledStartAt: Date;
}

export interface ReminderResult {
  sent: number;
  failed: number;
  errors: string[];
}
```

---

## TDD Test Specifications

### Test File Structure

```
apps/api/__tests__/
├── services/
│   ├── FreemiumService.test.ts
│   ├── AbuseDetectionService.test.ts
│   ├── EntitlementService.test.ts
│   └── ReminderService.test.ts
├── routes/
│   ├── owners.register.abuse.test.ts
│   ├── owners.games.freemium.test.ts
│   └── public.stream.access.test.ts
└── integration/
    ├── freemium-flow.test.ts
    ├── abuse-detection-flow.test.ts
    └── ip-locking-flow.test.ts
```

### FreemiumService Tests

```typescript
// apps/api/__tests__/services/FreemiumService.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { FreemiumService } from '../../src/services/FreemiumService';
import { createTestOwner, cleanupTestData } from '../helpers/fixtures';
import { prisma } from '../../src/lib/prisma';

describe('FreemiumService', () => {
  let service: FreemiumService;
  
  beforeEach(async () => {
    await cleanupTestData();
    service = new FreemiumService(prisma);
  });
  
  describe('IFreemiumReader', () => {
    describe('getRemainingFreeGames', () => {
      it('should return 5 for new account', async () => {
        const owner = await createTestOwner();
        
        const remaining = await service.getRemainingFreeGames(owner.id);
        
        expect(remaining).toBe(5);
      });
      
      it('should return correct count after games used', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 3 });
        
        const remaining = await service.getRemainingFreeGames(owner.id);
        
        expect(remaining).toBe(2);
      });
      
      it('should return 0 when limit reached', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 5 });
        
        const remaining = await service.getRemainingFreeGames(owner.id);
        
        expect(remaining).toBe(0);
      });
      
      it('should return unlimited for pro subscribers', async () => {
        const owner = await createTestOwner({ 
          subscriptionTier: 'pro',
          freeGamesUsed: 10 
        });
        
        const remaining = await service.getRemainingFreeGames(owner.id);
        
        expect(remaining).toBe(Infinity);
      });
    });
    
    describe('canCreateFreeGame', () => {
      it('should allow when under limit', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 4 });
        
        const canCreate = await service.canCreateFreeGame(owner.id);
        
        expect(canCreate).toBe(true);
      });
      
      it('should deny when at limit', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 5 });
        
        const canCreate = await service.canCreateFreeGame(owner.id);
        
        expect(canCreate).toBe(false);
      });
      
      it('should allow for pro subscribers regardless of count', async () => {
        const owner = await createTestOwner({ 
          subscriptionTier: 'pro',
          freeGamesUsed: 100 
        });
        
        const canCreate = await service.canCreateFreeGame(owner.id);
        
        expect(canCreate).toBe(true);
      });
    });
    
    describe('getFreemiumStatus', () => {
      it('should return complete status object', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 2 });
        
        const status = await service.getFreemiumStatus(owner.id);
        
        expect(status).toEqual({
          freeGamesUsed: 2,
          freeGamesRemaining: 3,
          freeGamesLimit: 5,
          subscriptionTier: null,
          subscriptionEndsAt: null,
          canCreateFreeGame: true,
        });
      });
    });
  });
  
  describe('IFreemiumWriter', () => {
    describe('incrementFreeGameUsage', () => {
      it('should increment counter by 1', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 2 });
        
        await service.incrementFreeGameUsage(owner.id);
        
        const updated = await prisma.ownerAccount.findUnique({
          where: { id: owner.id }
        });
        expect(updated?.freeGamesUsed).toBe(3);
      });
      
      it('should not increment beyond limit', async () => {
        const owner = await createTestOwner({ freeGamesUsed: 5 });
        
        await service.incrementFreeGameUsage(owner.id);
        
        const updated = await prisma.ownerAccount.findUnique({
          where: { id: owner.id }
        });
        expect(updated?.freeGamesUsed).toBe(5); // Unchanged
      });
    });
    
    describe('upgradeToTier', () => {
      it('should set subscription tier and expiration', async () => {
        const owner = await createTestOwner();
        
        await service.upgradeToTier(owner.id, 'pro');
        
        const updated = await prisma.ownerAccount.findUnique({
          where: { id: owner.id }
        });
        expect(updated?.subscriptionTier).toBe('pro');
        expect(updated?.subscriptionEndsAt).toBeDefined();
      });
    });
  });
});
```

### AbuseDetectionService Tests

```typescript
// apps/api/__tests__/services/AbuseDetectionService.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { AbuseDetectionService } from '../../src/services/AbuseDetectionService';
import { 
  createTestOwner, 
  createTestFingerprint,
  linkOwnerToFingerprint,
  cleanupTestData 
} from '../helpers/fixtures';
import { prisma } from '../../src/lib/prisma';

describe('AbuseDetectionService', () => {
  let service: AbuseDetectionService;
  
  beforeEach(async () => {
    await cleanupTestData();
    service = new AbuseDetectionService(prisma);
  });
  
  describe('IAbuseDetector', () => {
    describe('checkRegistration', () => {
      it('should allow first registration from new fingerprint', async () => {
        const result = await service.checkRegistration({
          fingerprintHash: 'new-fingerprint-hash-123',
          ipAddress: '192.168.1.1',
          email: 'coach@example.com',
        });
        
        expect(result.allowed).toBe(true);
        expect(result.linkedAccountCount).toBe(0);
        expect(result.abuseDetected).toBe(false);
        expect(result.message).toBe('none');
      });
      
      it('should warn on second registration (same fingerprint)', async () => {
        // Setup: One existing account with this fingerprint
        const fingerprint = await createTestFingerprint('existing-fp-hash');
        const existingOwner = await createTestOwner({ email: 'first@example.com' });
        await linkOwnerToFingerprint(existingOwner.id, fingerprint.id, '1.1.1.1');
        
        // Test: Second registration attempt
        const result = await service.checkRegistration({
          fingerprintHash: 'existing-fp-hash',
          ipAddress: '2.2.2.2',
          email: 'second@example.com',
        });
        
        expect(result.allowed).toBe(true); // Allow with warning
        expect(result.linkedAccountCount).toBe(1);
        expect(result.abuseDetected).toBe(false);
        expect(result.message).toBe('first_warning');
      });
      
      it('should detect abuse on third registration', async () => {
        // Setup: Two existing accounts
        const fingerprint = await createTestFingerprint('abuser-fp-hash');
        const owner1 = await createTestOwner({ email: 'a@test.com' });
        const owner2 = await createTestOwner({ email: 'b@test.com' });
        await linkOwnerToFingerprint(owner1.id, fingerprint.id, '1.1.1.1');
        await linkOwnerToFingerprint(owner2.id, fingerprint.id, '2.2.2.2');
        
        // Test: Third registration attempt
        const result = await service.checkRegistration({
          fingerprintHash: 'abuser-fp-hash',
          ipAddress: '3.3.3.3',
          email: 'c@test.com',
        });
        
        expect(result.allowed).toBe(false);
        expect(result.linkedAccountCount).toBe(2);
        expect(result.abuseDetected).toBe(true);
        expect(result.oneTimePassAvailable).toBe(true);
        expect(result.message).toBe('abuse_detected');
      });
      
      it('should offer one-time pass when abuse detected first time', async () => {
        const fingerprint = await createTestFingerprint('generous-fp', {
          oneTimePassUsed: false,
        });
        const owner1 = await createTestOwner({ email: 'a@test.com' });
        const owner2 = await createTestOwner({ email: 'b@test.com' });
        await linkOwnerToFingerprint(owner1.id, fingerprint.id, '1.1.1.1');
        await linkOwnerToFingerprint(owner2.id, fingerprint.id, '2.2.2.2');
        
        const result = await service.checkRegistration({
          fingerprintHash: 'generous-fp',
          ipAddress: '3.3.3.3',
          email: 'c@test.com',
        });
        
        expect(result.abuseDetected).toBe(true);
        expect(result.oneTimePassAvailable).toBe(true);
        expect(result.message).toBe('abuse_detected');
      });
      
      it('should hard block after one-time pass used', async () => {
        const fingerprint = await createTestFingerprint('blocked-fp', {
          oneTimePassUsed: true, // Already used their pass
        });
        const owner1 = await createTestOwner({ email: 'a@test.com' });
        const owner2 = await createTestOwner({ email: 'b@test.com' });
        const owner3 = await createTestOwner({ email: 'c@test.com' }); // Pass account
        await linkOwnerToFingerprint(owner1.id, fingerprint.id, '1.1.1.1');
        await linkOwnerToFingerprint(owner2.id, fingerprint.id, '2.2.2.2');
        await linkOwnerToFingerprint(owner3.id, fingerprint.id, '3.3.3.3');
        
        const result = await service.checkRegistration({
          fingerprintHash: 'blocked-fp',
          ipAddress: '4.4.4.4',
          email: 'd@test.com',
        });
        
        expect(result.allowed).toBe(false);
        expect(result.oneTimePassAvailable).toBe(false);
        expect(result.message).toBe('final_block');
      });
    });
    
    describe('getLinkedAccounts', () => {
      it('should return all accounts linked to fingerprint', async () => {
        const fingerprint = await createTestFingerprint('multi-account-fp');
        const owner1 = await createTestOwner({ email: 'user1@example.com' });
        const owner2 = await createTestOwner({ email: 'user2@example.com' });
        await linkOwnerToFingerprint(owner1.id, fingerprint.id, '1.1.1.1');
        await linkOwnerToFingerprint(owner2.id, fingerprint.id, '2.2.2.2');
        
        const linked = await service.getLinkedAccounts('multi-account-fp');
        
        expect(linked).toHaveLength(2);
        expect(linked[0].email).toMatch(/u\*\*\*@example\.com/); // Masked
      });
    });
  });
  
  describe('IAbuseRecorder', () => {
    describe('useOneTimePass', () => {
      it('should mark one-time pass as used', async () => {
        const fingerprint = await createTestFingerprint('pass-test-fp');
        
        await service.useOneTimePass('pass-test-fp');
        
        const updated = await prisma.deviceFingerprint.findUnique({
          where: { fingerprintHash: 'pass-test-fp' }
        });
        expect(updated?.oneTimePassUsed).toBe(true);
      });
    });
    
    describe('incrementWarnings', () => {
      it('should increment warning counter', async () => {
        const fingerprint = await createTestFingerprint('warn-fp', {
          warningsShown: 1,
        });
        
        await service.incrementWarnings('warn-fp');
        
        const updated = await prisma.deviceFingerprint.findUnique({
          where: { fingerprintHash: 'warn-fp' }
        });
        expect(updated?.warningsShown).toBe(2);
      });
    });
  });
});
```

### EntitlementService Tests

```typescript
// apps/api/__tests__/services/EntitlementService.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { EntitlementService } from '../../src/services/EntitlementService';
import { createTestPurchase, cleanupTestData } from '../helpers/fixtures';
import { prisma } from '../../src/lib/prisma';

describe('EntitlementService', () => {
  let service: EntitlementService;
  const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minutes
  
  beforeEach(async () => {
    await cleanupTestData();
    service = new EntitlementService(prisma);
  });
  
  describe('IEntitlementChecker', () => {
    describe('validateAccess', () => {
      it('should allow and lock IP on first access', async () => {
        const purchase = await createTestPurchase({
          lockedIpAddress: null,
          lockedAt: null,
        });
        
        const result = await service.validateAccess({
          purchaseId: purchase.id,
          ipAddress: '192.168.1.100',
          token: purchase.entitlementToken,
        });
        
        expect(result.allowed).toBe(true);
        expect(result.ipLocked).toBe(true);
        
        // Verify IP was saved
        const updated = await prisma.purchase.findUnique({
          where: { id: purchase.id }
        });
        expect(updated?.lockedIpAddress).toBe('192.168.1.100');
      });
      
      it('should allow same IP on subsequent access', async () => {
        const purchase = await createTestPurchase({
          lockedIpAddress: '192.168.1.100',
          lockedAt: new Date(),
        });
        
        const result = await service.validateAccess({
          purchaseId: purchase.id,
          ipAddress: '192.168.1.100', // Same IP
          token: purchase.entitlementToken,
        });
        
        expect(result.allowed).toBe(true);
      });
      
      it('should block different IP outside grace period', async () => {
        const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
        const purchase = await createTestPurchase({
          lockedIpAddress: '192.168.1.100',
          lockedAt: twentyMinutesAgo,
        });
        
        const result = await service.validateAccess({
          purchaseId: purchase.id,
          ipAddress: '10.0.0.50', // Different IP
          token: purchase.entitlementToken,
        });
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('ip_locked');
      });
      
      it('should allow IP change within grace period', async () => {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const purchase = await createTestPurchase({
          lockedIpAddress: '192.168.1.100',
          lockedAt: tenMinutesAgo,
        });
        
        const result = await service.validateAccess({
          purchaseId: purchase.id,
          ipAddress: '10.0.0.50', // Different IP but within grace
          token: purchase.entitlementToken,
        });
        
        expect(result.allowed).toBe(true);
        expect(result.ipUpdated).toBe(true);
        expect(result.gracePeriodActive).toBe(true);
      });
      
      it('should reject invalid token', async () => {
        const purchase = await createTestPurchase();
        
        const result = await service.validateAccess({
          purchaseId: purchase.id,
          ipAddress: '192.168.1.100',
          token: 'invalid-token',
        });
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('invalid_token');
      });
      
      it('should reject expired entitlement', async () => {
        const purchase = await createTestPurchase({
          entitlementExpiresAt: new Date(Date.now() - 1000), // Expired
        });
        
        const result = await service.validateAccess({
          purchaseId: purchase.id,
          ipAddress: '192.168.1.100',
          token: purchase.entitlementToken,
        });
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('expired');
      });
    });
    
    describe('isWithinGracePeriod', () => {
      it('should return true within 15 minutes', async () => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const purchase = await createTestPurchase({
          lockedAt: fiveMinutesAgo,
        });
        
        const result = await service.isWithinGracePeriod(purchase.id);
        
        expect(result).toBe(true);
      });
      
      it('should return false after 15 minutes', async () => {
        const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
        const purchase = await createTestPurchase({
          lockedAt: twentyMinutesAgo,
        });
        
        const result = await service.isWithinGracePeriod(purchase.id);
        
        expect(result).toBe(false);
      });
    });
  });
});
```

### ReminderService Tests

```typescript
// apps/api/__tests__/services/ReminderService.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReminderService } from '../../src/services/ReminderService';
import { 
  createTestStream, 
  createTestPurchase,
  cleanupTestData 
} from '../helpers/fixtures';
import { prisma } from '../../src/lib/prisma';

describe('ReminderService', () => {
  let service: ReminderService;
  
  beforeEach(async () => {
    await cleanupTestData();
    service = new ReminderService(prisma);
  });
  
  describe('IReminderReader', () => {
    describe('getDueReminders', () => {
      it('should find streams starting in 5 minutes', async () => {
        const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
        await createTestStream({
          scheduledStartAt: fiveMinFromNow,
          sendReminders: true,
          reminderSentAt: null,
        });
        
        const due = await service.getDueReminders();
        
        expect(due).toHaveLength(1);
      });
      
      it('should NOT find streams with reminder already sent', async () => {
        const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
        await createTestStream({
          scheduledStartAt: fiveMinFromNow,
          sendReminders: true,
          reminderSentAt: new Date(), // Already sent
        });
        
        const due = await service.getDueReminders();
        
        expect(due).toHaveLength(0);
      });
      
      it('should NOT find streams with reminders disabled', async () => {
        const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
        await createTestStream({
          scheduledStartAt: fiveMinFromNow,
          sendReminders: false, // Disabled
        });
        
        const due = await service.getDueReminders();
        
        expect(due).toHaveLength(0);
      });
      
      it('should NOT find streams starting in 10+ minutes', async () => {
        const tenMinFromNow = new Date(Date.now() + 10 * 60 * 1000);
        await createTestStream({
          scheduledStartAt: tenMinFromNow,
          sendReminders: true,
        });
        
        const due = await service.getDueReminders();
        
        expect(due).toHaveLength(0);
      });
      
      it('should NOT find streams that already started', async () => {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        await createTestStream({
          scheduledStartAt: fiveMinAgo,
          sendReminders: true,
        });
        
        const due = await service.getDueReminders();
        
        expect(due).toHaveLength(0);
      });
    });
    
    describe('getStreamViewers', () => {
      it('should return all purchasers for a stream', async () => {
        const stream = await createTestStream();
        await createTestPurchase({ directStreamId: stream.id, viewerEmail: 'a@test.com' });
        await createTestPurchase({ directStreamId: stream.id, viewerEmail: 'b@test.com' });
        
        const viewers = await service.getStreamViewers(stream.id);
        
        expect(viewers).toHaveLength(2);
      });
    });
  });
  
  describe('IReminderSender', () => {
    describe('markReminderSent', () => {
      it('should set reminderSentAt timestamp', async () => {
        const stream = await createTestStream({
          reminderSentAt: null,
        });
        
        await service.markReminderSent(stream.id);
        
        const updated = await prisma.directStream.findUnique({
          where: { id: stream.id }
        });
        expect(updated?.reminderSentAt).toBeDefined();
      });
    });
  });
});
```

---

## Component Specifications

### Welcome Modal Component

```tsx
// apps/web/components/welcome/WelcomeModal.tsx

'use client';

import { useState, useEffect } from 'react';
import { BottomSheet, TouchButton } from '@/components/v2/primitives';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'fv_welcome_shown';

interface WelcomeModalProps {
  forceShow?: boolean;
}

export function WelcomeModal({ forceShow = false }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    // Check URL params
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref') === 'veo';
    const welcomeParam = params.get('welcome') === 'true';
    
    // Check localStorage
    const hasSeenBefore = localStorage.getItem(STORAGE_KEY) === 'true';
    
    // Show if: forced, ref=veo, welcome=true, or first visit
    if (forceShow || refParam || welcomeParam || !hasSeenBefore) {
      setIsOpen(true);
    }
  }, [forceShow]);
  
  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };
  
  const handleGetStarted = () => {
    handleDismiss();
    router.push('/owners/register');
  };
  
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleDismiss}
      snapPoints={[0.92]}
      aria-labelledby="welcome-modal-title"
    >
      <div 
        className="space-y-6 px-2 pb-4 overflow-y-auto"
        data-testid="modal-welcome"
      >
        {/* Hero */}
        <div className="text-center">
          <span className="text-5xl">👋</span>
          <h2 
            id="welcome-modal-title"
            className="text-2xl font-bold mt-3 text-[var(--fv-color-text-primary)]"
          >
            You spotted us on the field!
          </h2>
          <p className="text-[var(--fv-color-text-secondary)] mt-2">
            That Veo camera you noticed is using FieldView.Live to 
            let parents pay-per-view and watch remotely.
          </p>
        </div>
        
        {/* Security Selling Point */}
        <div 
          className="p-4 rounded-lg bg-[var(--fv-color-bg-elevated)] border border-[var(--fv-color-border)]"
          data-testid="card-security"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <h3 className="font-semibold text-[var(--fv-color-text-primary)]">
                Secure, IP-Locked Streams
              </h3>
              <p className="text-sm text-[var(--fv-color-text-secondary)] mt-1">
                Unlike Veo Live's shareable links, each viewer gets a 
                <strong className="text-[var(--fv-color-text-primary)]"> unique, IP-locked URL</strong>. 
                One purchase = one household. No freeloaders.
              </p>
            </div>
          </div>
        </div>
        
        {/* Monetization Pitch */}
        <div 
          className="p-4 rounded-lg bg-[var(--fv-color-bg-elevated)] border border-[var(--fv-color-border)]"
          data-testid="card-monetize"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <h3 className="font-semibold text-[var(--fv-color-text-primary)]">
                Monetize Your Veo
              </h3>
              <p className="text-sm text-[var(--fv-color-text-secondary)] mt-1">
                Charge $5-15 per viewer. <strong className="text-[var(--fv-color-accent)]">90% goes to you</strong> via 
                Square. Cover your camera costs in one season.
              </p>
            </div>
          </div>
        </div>
        
        {/* Free Trial */}
        <div 
          className="p-4 rounded-lg bg-[var(--fv-color-primary-500)]/10 border border-[var(--fv-color-primary-500)]/30"
          data-testid="card-free-trial"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">🆓</span>
            <div>
              <h3 className="font-semibold text-[var(--fv-color-text-primary)]">
                Try It Free
              </h3>
              <p className="text-sm text-[var(--fv-color-text-secondary)] mt-1">
                <strong className="text-[var(--fv-color-primary-400)]">5 free games</strong> — perfect 
                for a tournament! No credit card required to start.
              </p>
            </div>
          </div>
        </div>
        
        {/* Divider */}
        <div className="border-t border-[var(--fv-color-border)] my-4" />
        
        {/* How It Works */}
        <div data-testid="section-how-it-works">
          <h3 className="font-semibold text-lg text-[var(--fv-color-text-primary)] mb-4">
            📋 How It Works
          </h3>
          
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--fv-color-primary-500)] flex items-center justify-center text-white font-bold text-sm">
                1
              </div>
              <div>
                <p className="font-medium text-[var(--fv-color-text-primary)]">
                  Create account + connect Square
                </p>
                <p className="text-sm text-[var(--fv-color-text-muted)]">
                  To receive payments directly
                </p>
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--fv-color-primary-500)] flex items-center justify-center text-white font-bold text-sm">
                2
              </div>
              <div>
                <p className="font-medium text-[var(--fv-color-text-primary)]">
                  Create a game & set your price
                </p>
                <p className="text-sm text-[var(--fv-color-text-muted)]">
                  Choose password or auto-generate
                </p>
              </div>
            </div>
            
            {/* Step 3 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--fv-color-primary-500)] flex items-center justify-center text-white font-bold text-sm">
                3
              </div>
              <div>
                <p className="font-medium text-[var(--fv-color-text-primary)]">
                  Copy HLS URL from Veo Live*
                </p>
                <p className="text-sm text-[var(--fv-color-text-muted)]">
                  Paste in your admin panel
                </p>
              </div>
            </div>
            
            {/* Step 4 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--fv-color-primary-500)] flex items-center justify-center text-white font-bold text-sm">
                4
              </div>
              <div>
                <p className="font-medium text-[var(--fv-color-text-primary)]">
                  Share your link with parents
                </p>
                <p className="text-sm text-[var(--fv-color-text-muted)]">
                  They pay → get unique link → watch!
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Divider */}
        <div className="border-t border-[var(--fv-color-border)] my-4" />
        
        {/* ROI Example */}
        <div 
          className="p-4 rounded-lg bg-[var(--fv-color-accent)]/10 border border-[var(--fv-color-accent)]/30"
          data-testid="card-roi"
        >
          <h3 className="font-semibold text-[var(--fv-color-text-primary)] flex items-center gap-2">
            <span>💵</span> ROI Example
          </h3>
          <p className="text-sm text-[var(--fv-color-text-secondary)] mt-2">
            <span className="font-mono text-[var(--fv-color-accent)]">
              $7 × 15 viewers × 20 games = $1,890/season
            </span>
          </p>
          <p className="text-xs text-[var(--fv-color-text-muted)] mt-1">
            That covers your Veo subscription + profit!
          </p>
        </div>
        
        {/* CTA */}
        <div className="space-y-3 pt-2">
          <TouchButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleGetStarted}
            data-testid="btn-get-started"
          >
            🚀 Get Started Free
          </TouchButton>
          
          <TouchButton
            variant="ghost"
            size="md"
            fullWidth
            onClick={handleDismiss}
            data-testid="btn-learn-later"
          >
            Maybe later
          </TouchButton>
        </div>
        
        {/* Veo Live Requirement */}
        <p className="text-xs text-[var(--fv-color-text-muted)] text-center">
          *Requires Veo Live subscription ($15/mo add-on from Veo)
        </p>
      </div>
    </BottomSheet>
  );
}

export default WelcomeModal;
```

---

## Abuse Detection & Compassionate Messaging

### Message Hierarchy

We implement a progressive, compassionate approach to abuse detection:

```
Level 0: First Account
├── Message: None
└── Action: Allow registration

Level 1: Second Account (Same Device)
├── Message: "first_warning"
├── Tone: Informational
└── Action: Allow with note

Level 2: Third+ Account (Abuse Detected)
├── Message: "abuse_detected"
├── Tone: Compassionate plea
├── Offer: One-time pass
└── Action: Block unless pass accepted

Level 3: After One-Time Pass Used
├── Message: "final_block"
├── Tone: Firm but understanding
└── Action: Hard block, support contact only
```

### Compassionate Abuse Messages

#### First Warning (Level 1)

```tsx
// Shows when 1 existing account found

<div data-testid="modal-first-warning">
  <span className="text-5xl">👋</span>
  
  <h2>Looks like you've been here before!</h2>
  
  <p>
    We found an existing account from this device. If that's 
    you, you can log in below. If you're a family member or 
    assistant coach, no worries — go ahead and create your account!
  </p>
  
  <TouchButton onClick={goToLogin}>
    Log into existing account
  </TouchButton>
  
  <TouchButton variant="secondary" onClick={proceedAnyway}>
    I'm someone else, continue
  </TouchButton>
</div>
```

#### Abuse Detected with One-Time Pass (Level 2)

```tsx
// Shows when 2+ accounts found, pass NOT yet used

<div data-testid="modal-abuse-detected">
  <span className="text-5xl">😅</span>
  
  <h2>Hey, I've got a family to feed!</h2>
  
  <p>
    It looks like you've already created 
    <strong>{linkedAccountCount} accounts</strong> from this device.
  </p>
  
  <p>
    I built FieldView.Live as a solo developer to help coaches 
    like you monetize their streams. The 5 free games is meant 
    to let you try it out — not to be reset with new emails 
    every tournament. 🙏
  </p>
  
  {/* Divider */}
  
  <h3>💚 But I get it...</h3>
  
  <p>
    Maybe you're in a tough spot right now. Maybe you can't pay. 
    I understand — I don't want to rob parents of being able to 
    see their kids play.
  </p>
  
  <p>
    <strong>I'll let you off this one time.</strong> But could you 
    please consider paying for the service if you find it valuable? 
    It means a lot.
  </p>
  
  <TouchButton variant="primary" onClick={useOneTimePass}>
    🙏 Thank you, I'll use my one-time pass
  </TouchButton>
  
  <TouchButton onClick={goToLogin}>
    Log into my existing account
  </TouchButton>
  
  <TouchButton variant="secondary" onClick={upgradeToPro}>
    Upgrade to Pro ($9.99/mo)
  </TouchButton>
  
  <p className="text-xs">
    If you're genuinely a different person using a shared device, 
    please <a href="mailto:support@fieldview.live">contact support</a>.
  </p>
</div>
```

#### Final Block (Level 3)

```tsx
// Shows when pass already used, 3+ accounts exist

<div data-testid="modal-final-block">
  <span className="text-5xl">🛑</span>
  
  <h2>We need to talk...</h2>
  
  <p>
    You've created <strong>{linkedAccountCount} accounts</strong> 
    from this device, including using your one-time pass.
  </p>
  
  <p>
    I really appreciate you trying FieldView.Live, but creating 
    multiple accounts to get unlimited free games isn't fair to 
    other coaches who pay for the service.
  </p>
  
  <p>
    Please log into one of your existing accounts, or consider 
    upgrading to Pro for unlimited streaming.
  </p>
  
  <TouchButton variant="primary" onClick={goToLogin}>
    Log into existing account
  </TouchButton>
  
  <TouchButton variant="secondary" onClick={upgradeToPro}>
    Upgrade to Pro ($9.99/mo)
  </TouchButton>
  
  <TouchButton variant="ghost" onClick={contactSupport}>
    Contact support (I'm a real person!)
  </TouchButton>
  
  <p className="text-xs text-muted">
    Thanks for understanding. It means a lot. ❤️
  </p>
</div>
```

### Abuse Modal Component

```tsx
// apps/web/components/welcome/AbuseDetectedModal.tsx

'use client';

import { BottomSheet, TouchButton } from '@/components/v2/primitives';
import { useRouter } from 'next/navigation';

export type AbuseLevel = 'first_warning' | 'abuse_detected' | 'final_block';

interface AbuseDetectedModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: AbuseLevel;
  linkedAccountCount: number;
  oneTimePassAvailable: boolean;
  onUseOneTimePass?: () => void;
  onProceedAnyway?: () => void;
}

export function AbuseDetectedModal({
  isOpen,
  onClose,
  level,
  linkedAccountCount,
  oneTimePassAvailable,
  onUseOneTimePass,
  onProceedAnyway,
}: AbuseDetectedModalProps) {
  const router = useRouter();
  
  const goToLogin = () => {
    onClose();
    router.push('/owners/login');
  };
  
  const upgradeToPro = () => {
    onClose();
    router.push('/owners/upgrade');
  };
  
  const contactSupport = () => {
    window.location.href = 'mailto:support@fieldview.live?subject=Account%20Help';
  };
  
  // First Warning (Level 1)
  if (level === 'first_warning') {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        snapPoints={[0.55]}
        aria-labelledby="warning-modal-title"
      >
        <div className="text-center space-y-5 px-4" data-testid="modal-first-warning">
          <span className="text-5xl">👋</span>
          
          <h2 
            id="warning-modal-title"
            className="text-xl font-bold text-[var(--fv-color-text-primary)]"
          >
            Looks like you've been here before!
          </h2>
          
          <p className="text-[var(--fv-color-text-secondary)]">
            We found an existing account from this device. If that's 
            you, you can log in below. If you're a family member or 
            assistant coach, no worries — go ahead and create your account!
          </p>
          
          <div className="space-y-3 pt-2">
            <TouchButton
              variant="primary"
              fullWidth
              onClick={goToLogin}
              data-testid="btn-login-existing"
            >
              Log into existing account
            </TouchButton>
            
            <TouchButton
              variant="secondary"
              fullWidth
              onClick={onProceedAnyway}
              data-testid="btn-proceed-anyway"
            >
              I'm someone else, continue
            </TouchButton>
          </div>
        </div>
      </BottomSheet>
    );
  }
  
  // Abuse Detected with One-Time Pass (Level 2)
  if (level === 'abuse_detected' && oneTimePassAvailable) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        snapPoints={[0.85]}
        aria-labelledby="abuse-modal-title"
      >
        <div className="text-center space-y-5 px-4 pb-4" data-testid="modal-abuse-detected">
          <span className="text-5xl">😅</span>
          
          <h2 
            id="abuse-modal-title"
            className="text-xl font-bold text-[var(--fv-color-text-primary)]"
          >
            Hey, I've got a family to feed!
          </h2>
          
          <div className="text-[var(--fv-color-text-secondary)] space-y-3 text-left">
            <p>
              It looks like you've already created{' '}
              <strong className="text-[var(--fv-color-text-primary)]">
                {linkedAccountCount} accounts
              </strong>{' '}
              from this device.
            </p>
            
            <p>
              I built FieldView.Live as a solo developer to help coaches 
              like you monetize their streams. The 5 free games is meant 
              to let you try it out — not to be reset with new emails 
              every tournament. 🙏
            </p>
          </div>
          
          <div className="border-t border-[var(--fv-color-border)] pt-4">
            <h3 className="font-semibold text-[var(--fv-color-accent)] flex items-center justify-center gap-2">
              <span>💚</span> But I get it...
            </h3>
            
            <div className="text-[var(--fv-color-text-secondary)] space-y-3 text-left mt-3">
              <p>
                Maybe you're in a tough spot right now. Maybe you can't pay. 
                I understand — I don't want to rob parents of being able to 
                see their kids play.
              </p>
              
              <p>
                <strong className="text-[var(--fv-color-text-primary)]">
                  I'll let you off this one time.
                </strong>{' '}
                But could you please consider paying for the service if you 
                find it valuable? It means a lot.
              </p>
            </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <TouchButton
              variant="primary"
              fullWidth
              onClick={onUseOneTimePass}
              data-testid="btn-use-pass"
            >
              🙏 Thank you, I'll use my one-time pass
            </TouchButton>
            
            <TouchButton
              variant="secondary"
              fullWidth
              onClick={goToLogin}
              data-testid="btn-login"
            >
              Log into my existing account
            </TouchButton>
            
            <TouchButton
              variant="ghost"
              fullWidth
              onClick={upgradeToPro}
              data-testid="btn-upgrade"
            >
              Upgrade to Pro ($9.99/mo)
            </TouchButton>
          </div>
          
          <p className="text-xs text-[var(--fv-color-text-muted)]">
            If you're genuinely a different person using a shared device,{' '}
            <button 
              onClick={contactSupport}
              className="underline hover:text-[var(--fv-color-text-secondary)]"
            >
              contact support
            </button>.
          </p>
        </div>
      </BottomSheet>
    );
  }
  
  // Final Block (Level 3)
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[0.7]}
      aria-labelledby="block-modal-title"
    >
      <div className="text-center space-y-5 px-4" data-testid="modal-final-block">
        <span className="text-5xl">🛑</span>
        
        <h2 
          id="block-modal-title"
          className="text-xl font-bold text-[var(--fv-color-text-primary)]"
        >
          We need to talk...
        </h2>
        
        <div className="text-[var(--fv-color-text-secondary)] space-y-3 text-left">
          <p>
            You've created{' '}
            <strong className="text-[var(--fv-color-text-primary)]">
              {linkedAccountCount} accounts
            </strong>{' '}
            from this device, including using your one-time pass.
          </p>
          
          <p>
            I really appreciate you trying FieldView.Live, but creating 
            multiple accounts to get unlimited free games isn't fair to 
            other coaches who pay for the service.
          </p>
          
          <p>
            Please log into one of your existing accounts, or consider 
            upgrading to Pro for unlimited streaming.
          </p>
        </div>
        
        <div className="space-y-3 pt-2">
          <TouchButton
            variant="primary"
            fullWidth
            onClick={goToLogin}
            data-testid="btn-login"
          >
            Log into existing account
          </TouchButton>
          
          <TouchButton
            variant="secondary"
            fullWidth
            onClick={upgradeToPro}
            data-testid="btn-upgrade"
          >
            Upgrade to Pro ($9.99/mo)
          </TouchButton>
          
          <TouchButton
            variant="ghost"
            fullWidth
            onClick={contactSupport}
            data-testid="btn-contact"
          >
            Contact support (I'm a real person!)
          </TouchButton>
        </div>
        
        <p className="text-xs text-[var(--fv-color-text-muted)] pt-2">
          Thanks for understanding. It means a lot. ❤️
        </p>
      </div>
    </BottomSheet>
  );
}

export default AbuseDetectedModal;
```

---

## API Endpoints

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/owners/register` | Modified to include fingerprint check |
| `POST` | `/api/abuse/check` | Check fingerprint before registration |
| `POST` | `/api/abuse/use-pass` | Consume one-time pass |
| `GET` | `/api/owners/me/freemium` | Get freemium status |
| `POST` | `/api/owners/me/upgrade` | Upgrade subscription |
| `GET` | `/api/stream/:token/access` | Validate access with IP check |

### Registration with Abuse Check

```typescript
// POST /api/owners/register
// Modified to include fingerprint

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  type: 'individual' | 'association';
  fingerprint: string;  // NEW: Browser fingerprint hash
  ipAddress?: string;   // Captured server-side
}

interface RegisterResponse {
  success: boolean;
  token?: { token: string; expiresAt: string };
  abuseCheck?: {
    level: AbuseLevel;
    linkedAccountCount: number;
    oneTimePassAvailable: boolean;
    message: string;
  };
}
```

### Freemium Status

```typescript
// GET /api/owners/me/freemium

interface FreemiumStatusResponse {
  freeGamesUsed: number;
  freeGamesRemaining: number;
  freeGamesLimit: number;
  subscriptionTier: 'free' | 'pro' | null;
  subscriptionEndsAt: string | null;
  canCreateFreeGame: boolean;
  afterLimitOptions: {
    enablePaywall: boolean;
    subscribePro: { pricePerMonth: number };
    payPerStream: { pricePerStream: number };
  };
}
```

### Stream Access with IP Check

```typescript
// GET /api/stream/:token/access

interface StreamAccessResponse {
  allowed: boolean;
  reason?: 'invalid_token' | 'expired' | 'ip_locked' | 'grace_period_expired';
  streamUrl?: string;
  ipLocked?: boolean;
  gracePeriodActive?: boolean;
  message?: string;  // User-friendly message
}
```

---

## Implementation Checklist

### Phase 1: Database & Core Services (Week 1)

- [ ] **Day 1: Database Migration**
  - [ ] Create migration file
  - [ ] Add DeviceFingerprint model
  - [ ] Add OwnerAccountFingerprint junction
  - [ ] Add freemium fields to OwnerAccount
  - [ ] Add IP locking fields to Purchase
  - [ ] Run migration locally
  - [ ] Test migration rollback

- [ ] **Day 2: FreemiumService (TDD)**
  - [ ] Write IFreemiumReader tests
  - [ ] Write IFreemiumWriter tests
  - [ ] Implement FreemiumService
  - [ ] All tests passing

- [ ] **Day 3: AbuseDetectionService (TDD)**
  - [ ] Write IAbuseDetector tests
  - [ ] Write IAbuseRecorder tests
  - [ ] Implement AbuseDetectionService
  - [ ] All tests passing

- [ ] **Day 4: EntitlementService (TDD)**
  - [ ] Write IEntitlementChecker tests
  - [ ] Write IEntitlementManager tests
  - [ ] Implement EntitlementService
  - [ ] All tests passing

- [ ] **Day 5: ReminderService (TDD)**
  - [ ] Write IReminderReader tests
  - [ ] Write IReminderSender tests
  - [ ] Implement ReminderService
  - [ ] Create cron job for reminders
  - [ ] All tests passing

### Phase 2: API & Frontend (Week 2)

- [ ] **Day 1: API Endpoints**
  - [ ] Modify POST /api/owners/register
  - [ ] Add POST /api/abuse/check
  - [ ] Add POST /api/abuse/use-pass
  - [ ] Add GET /api/owners/me/freemium
  - [ ] Add GET /api/stream/:token/access
  - [ ] Integration tests

- [ ] **Day 2: Welcome Modal**
  - [ ] Create WelcomeModal component
  - [ ] Add to home page
  - [ ] Test localStorage persistence
  - [ ] Test URL param triggers
  - [ ] E2E test

- [ ] **Day 3: Abuse Modals**
  - [ ] Create AbuseDetectedModal component
  - [ ] Create browser fingerprint utility
  - [ ] Integrate with registration flow
  - [ ] Test all three levels
  - [ ] E2E test

- [ ] **Day 4: Admin Password UI**
  - [ ] Add password options to game creation
  - [ ] Implement auto-generate logic
  - [ ] Show password once with copy button
  - [ ] Test flow

- [ ] **Day 5: Polish & E2E**
  - [ ] Full E2E test suite
  - [ ] Bug fixes
  - [ ] Performance testing
  - [ ] Documentation

### Phase 3: Deployment (Week 3)

- [ ] Run preflight build
- [ ] Deploy to staging
- [ ] QA testing
- [ ] Deploy to production
- [ ] Monitor for issues

---

## Rollout Plan

### Stage 1: Internal Testing
- Deploy to staging environment
- Team testing with multiple accounts
- Verify abuse detection works
- Test compassionate messaging

### Stage 2: Soft Launch
- Enable for new registrations only
- Monitor fingerprint accuracy
- Track one-time pass usage
- Adjust thresholds if needed

### Stage 3: Full Launch
- Enable welcome modal for all visitors
- Marketing push with Veo camera naming
- Monitor conversion rates
- Iterate on messaging

### Success Metrics
- [ ] Welcome modal shown rate: >80% of first-time visitors
- [ ] Registration conversion from modal: >15%
- [ ] Abuse detection accuracy: >90% (manual audit)
- [ ] One-time pass usage rate: <5% of new registrations
- [ ] Free tier to paid conversion: >20%

---

## Appendix: Browser Fingerprinting

### Fingerprint Components

```typescript
// What we collect (privacy-respecting, no PII)

const fingerprintComponents = {
  // Screen
  screenResolution: `${screen.width}x${screen.height}`,
  colorDepth: screen.colorDepth,
  
  // Browser
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  language: navigator.language,
  platform: navigator.platform,
  
  // Hardware hints
  hardwareConcurrency: navigator.hardwareConcurrency,
  deviceMemory: (navigator as any).deviceMemory,
  
  // Canvas fingerprint (GPU-specific)
  canvasHash: getCanvasFingerprint(),
  
  // WebGL renderer
  webglRenderer: getWebGLRenderer(),
  
  // Font detection (sample)
  availableFonts: detectFonts(['Arial', 'Helvetica', 'Georgia']),
};

// Hash the combined data
const fingerprintHash = await sha256(JSON.stringify(fingerprintComponents));
```

### Privacy Considerations

- ❌ We do NOT collect: IP geolocation, exact location, cookies, personal data
- ✅ We DO collect: Browser/device characteristics that create a semi-unique identifier
- 🔒 All data is hashed before storage — we cannot reverse-engineer device details
- 📋 Fingerprint is used ONLY for abuse detection, not tracking or advertising

---

*End of Pre-Release Implementation Guide*

**Document Status**: Ready for Implementation  
**Approval Required**: STRICT=false permission to proceed  
**Estimated Effort**: 2-3 weeks  
**Priority**: P0 (Pre-launch critical)
