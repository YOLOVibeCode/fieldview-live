# Data Model Package Implementation

## Package Overview

**Package Name**: `@fieldview/data-model`

**Purpose**: Shared TypeScript interfaces, Zod schemas, and Prisma schema used across `apps/api` and `apps/web`.

**Location**: `packages/data-model/`

**Requirement**: **100% test coverage** before publishing/consumption.

## Package Structure

```
packages/data-model/
├── src/
│   ├── entities/           # TypeScript interfaces
│   │   ├── OwnerAccount.ts
│   │   ├── Game.ts
│   │   ├── Purchase.ts
│   │   ├── ViewerIdentity.ts
│   │   ├── StreamSource.ts (new)
│   │   └── index.ts
│   ├── schemas/            # Zod schemas
│   │   ├── OwnerAccountSchema.ts
│   │   ├── GameSchema.ts
│   │   ├── PurchaseSchema.ts
│   │   ├── ViewerIdentitySchema.ts
│   │   ├── StreamSourceSchema.ts (new)
│   │   └── index.ts
│   ├── utils/              # Pure utility functions
│   │   ├── masking.ts      # Email masking
│   │   ├── feeCalculator.ts # Marketplace split calculation
│   │   └── index.ts
│   └── index.ts            # Main exports
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Migration files
├── __tests__/
│   └── unit/
│       ├── schemas/
│       │   ├── ViewerIdentitySchema.test.ts
│       │   ├── StreamSourceSchema.test.ts
│       │   └── ...
│       └── utils/
│           ├── masking.test.ts
│           └── feeCalculator.test.ts
├── package.json
└── tsconfig.json
```

## Entity Interfaces

### ViewerIdentity (Email Required)

```typescript
// packages/data-model/src/entities/ViewerIdentity.ts
export interface ViewerIdentity {
  id: string;
  email: string; // Required
  phoneE164?: string; // Optional
  smsOptOut: boolean;
  optOutAt?: Date;
  createdAt: Date;
  lastSeenAt?: Date;
}
```

### StreamSource (New)

```typescript
// packages/data-model/src/entities/StreamSource.ts
export type StreamSourceType = 'mux_managed' | 'byo_hls' | 'byo_rtmp' | 'external_embed';

export type ProtectionLevel = 'strong' | 'moderate' | 'best_effort';

export interface StreamSource {
  id: string;
  gameId: string;
  type: StreamSourceType;
  
  // Mux-managed
  muxAssetId?: string;
  muxPlaybackId?: string;
  
  // BYO HLS
  hlsManifestUrl?: string;
  
  // BYO RTMP
  rtmpPublishUrl?: string;
  rtmpStreamKey?: string;
  
  // External embed
  externalEmbedUrl?: string;
  externalProvider?: 'youtube' | 'twitch' | 'vimeo' | 'other';
  
  protectionLevel: ProtectionLevel;
  createdAt: Date;
  updatedAt: Date;
}

// Protection level mapping
export const STREAM_SOURCE_PROTECTION: Record<StreamSourceType, ProtectionLevel> = {
  mux_managed: 'strong',
  byo_rtmp: 'strong', // Routes to Mux, same protection
  byo_hls: 'moderate', // Depends on proxy/signing
  external_embed: 'best_effort', // Limited protection
};
```

### Game (Updated with StreamSource)

```typescript
// packages/data-model/src/entities/Game.ts
export interface Game {
  id: string;
  ownerAccountId: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: Date;
  endsAt?: Date;
  state: 'draft' | 'active' | 'live' | 'ended' | 'cancelled';
  priceCents: number;
  currency: string;
  keywordCode: string;
  keywordStatus: 'active' | 'disabled' | 'rotated';
  qrUrl: string;
  
  // StreamSource relationship
  streamSourceId?: string;
  
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
}
```

## Zod Schemas

### ViewerIdentitySchema (Email Required)

```typescript
// packages/data-model/src/schemas/ViewerIdentitySchema.ts
import { z } from 'zod';
import { ViewerIdentity } from '../entities/ViewerIdentity';

export const ViewerIdentitySchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(), // Required
  phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
  smsOptOut: z.boolean(),
  optOutAt: z.date().optional(),
  createdAt: z.date(),
  lastSeenAt: z.date().optional(),
}) satisfies z.ZodType<ViewerIdentity>;
```

### StreamSourceSchema

```typescript
// packages/data-model/src/schemas/StreamSourceSchema.ts
import { z } from 'zod';
import { StreamSource, StreamSourceType, ProtectionLevel } from '../entities/StreamSource';

export const StreamSourceTypeSchema = z.enum(['mux_managed', 'byo_hls', 'byo_rtmp', 'external_embed']);

export const ProtectionLevelSchema = z.enum(['strong', 'moderate', 'best_effort']);

export const StreamSourceSchema = z.object({
  id: z.string().uuid(),
  gameId: z.string().uuid(),
  type: StreamSourceTypeSchema,
  
  muxAssetId: z.string().optional(),
  muxPlaybackId: z.string().optional(),
  
  hlsManifestUrl: z.string().url().optional(),
  
  rtmpPublishUrl: z.string().url().optional(),
  rtmpStreamKey: z.string().optional(),
  
  externalEmbedUrl: z.string().url().optional(),
  externalProvider: z.enum(['youtube', 'twitch', 'vimeo', 'other']).optional(),
  
  protectionLevel: ProtectionLevelSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
}).refine((data) => {
  // Validate type-specific required fields
  if (data.type === 'mux_managed' && !data.muxAssetId) return false;
  if (data.type === 'byo_hls' && !data.hlsManifestUrl) return false;
  if (data.type === 'byo_rtmp' && (!data.rtmpPublishUrl || !data.rtmpStreamKey)) return false;
  if (data.type === 'external_embed' && !data.externalEmbedUrl) return false;
  return true;
}, {
  message: 'StreamSource type-specific fields are required',
}) satisfies z.ZodType<StreamSource>;
```

## Prisma Schema

### Database Schema

```prisma
// packages/data-model/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model OwnerAccount {
  id                String   @id @default(uuid())
  type              String   // 'owner' | 'association'
  name              String
  status            String   // 'active' | 'suspended' | 'pending_verification'
  contactEmail      String
  payoutProviderRef String?  // Square account ID
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  games             Game[]
  users             OwnerUser[]
  ledgerEntries     LedgerEntry[]
  payouts           Payout[]
  
  @@index([status])
}

model OwnerUser {
  id            String       @id @default(uuid())
  ownerAccountId String      @db.Uuid
  email         String
  role          String       // 'owner_admin' | 'association_admin' | 'association_operator'
  mfaEnabled    Boolean      @default(false)
  mfaSecret     String?      // Encrypted TOTP secret
  status        String       @default("active")
  createdAt     DateTime     @default(now())
  lastLoginAt   DateTime?
  
  ownerAccount OwnerAccount @relation(fields: [ownerAccountId], references: [id])
  
  @@index([ownerAccountId])
  @@index([email])
}

model Game {
  id            String        @id @default(uuid())
  ownerAccountId String      @db.Uuid
  title         String
  homeTeam      String
  awayTeam      String
  startsAt      DateTime
  endsAt        DateTime?
  state         String        @default("draft") // 'draft' | 'active' | 'live' | 'ended' | 'cancelled'
  priceCents    Int
  currency      String        @default("USD")
  keywordCode   String        @unique
  keywordStatus String        @default("active") // 'active' | 'disabled' | 'rotated'
  qrUrl         String
  streamSourceId String?      @db.Uuid
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  cancelledAt   DateTime?
  
  ownerAccount OwnerAccount  @relation(fields: [ownerAccountId], references: [id])
  streamSource StreamSource?  @relation(fields: [streamSourceId], references: [id])
  purchases    Purchase[]
  
  @@index([ownerAccountId])
  @@index([keywordCode])
  @@index([state])
}

model StreamSource {
  id                String   @id @default(uuid())
  gameId            String   @db.Uuid
  type              String   // 'mux_managed' | 'byo_hls' | 'byo_rtmp' | 'external_embed'
  protectionLevel   String   // 'strong' | 'moderate' | 'best_effort'
  
  // Mux-managed
  muxAssetId        String?
  muxPlaybackId     String?
  
  // BYO HLS
  hlsManifestUrl    String?
  
  // BYO RTMP
  rtmpPublishUrl    String?
  rtmpStreamKey     String?  // Encrypted
  
  // External embed
  externalEmbedUrl  String?
  externalProvider  String?  // 'youtube' | 'twitch' | 'vimeo' | 'other'
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  game              Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
  
  @@index([gameId])
}

model ViewerIdentity {
  id          String     @id @default(uuid())
  email       String     @unique
  phoneE164   String?
  smsOptOut   Boolean    @default(false)
  optOutAt    DateTime?
  createdAt   DateTime   @default(now())
  lastSeenAt DateTime?
  
  purchases   Purchase[]
  
  @@index([email])
  @@index([phoneE164])
}

model Purchase {
  id                      String     @id @default(uuid())
  gameId                  String     @db.Uuid
  viewerId                String     @db.Uuid
  amountCents             Int
  currency                String     @default("USD")
  platformFeeCents        Int
  processorFeeCents       Int
  ownerNetCents           Int
  status                  String     // 'created' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'
  paymentProviderPaymentId String?
  paymentProviderCustomerId String?
  createdAt               DateTime   @default(now())
  paidAt                  DateTime?
  failedAt                DateTime?
  refundedAt              DateTime?
  
  game                    Game       @relation(fields: [gameId], references: [id])
  viewer                  ViewerIdentity @relation(fields: [viewerId], references: [id])
  entitlement             Entitlement?
  paymentAttempts         PaymentAttempt[]
  refunds                 Refund[]
  
  @@index([gameId])
  @@index([viewerId])
  @@index([status])
}

model Entitlement {
  id          String     @id @default(uuid())
  purchaseId  String     @db.Uuid @unique
  tokenId     String     @unique // Hash of token claims
  validFrom   DateTime
  validTo     DateTime
  status      String     @default("active") // 'active' | 'expired' | 'revoked'
  createdAt   DateTime   @default(now())
  revokedAt   DateTime?
  
  purchase    Purchase   @relation(fields: [purchaseId], references: [id])
  sessions    PlaybackSession[]
  
  @@index([purchaseId])
  @@index([tokenId])
}

model PlaybackSession {
  id              String     @id @default(uuid())
  entitlementId   String     @db.Uuid
  startedAt       DateTime   @default(now())
  endedAt         DateTime?
  deviceHash      String?
  ipHash          String?
  userAgent       String?
  state           String     @default("started") // 'started' | 'ended' | 'error'
  
  // Telemetry summary
  totalWatchMs    Int        @default(0)
  totalBufferMs   Int        @default(0)
  bufferEvents    Int        @default(0)
  fatalErrors     Int        @default(0)
  startupLatencyMs Int?
  
  entitlement     Entitlement @relation(fields: [entitlementId], references: [id])
  
  @@index([entitlementId])
}

model Refund {
  id              String     @id @default(uuid())
  purchaseId      String     @db.Uuid
  amountCents     Int
  reasonCode      String     // 'buffer_ratio_high' | 'buffer_ratio_medium' | 'excessive_buffering' | 'fatal_error' | 'manual'
  issuedBy        String     // 'auto' | 'admin' | 'superadmin'
  ruleVersion     String     // Refund rule version applied
  telemetrySummary Json      // JSON snapshot of telemetry inputs
  createdAt       DateTime   @default(now())
  processedAt     DateTime?
  
  purchase        Purchase   @relation(fields: [purchaseId], references: [id])
  
  @@index([purchaseId])
}

model LedgerEntry {
  id            String     @id @default(uuid())
  ownerAccountId String    @db.Uuid
  type          String     // 'charge' | 'platform_fee' | 'processor_fee' | 'refund' | 'payout'
  amountCents   Int        // Positive for credits, negative for debits
  currency      String     @default("USD")
  referenceType String     // 'purchase' | 'refund' | 'payout'
  referenceId   String?
  description   String
  createdAt     DateTime   @default(now())
  
  ownerAccount  OwnerAccount @relation(fields: [ownerAccountId], references: [id])
  
  @@index([ownerAccountId])
  @@index([referenceType, referenceId])
}

model Payout {
  id              String     @id @default(uuid())
  ownerAccountId  String     @db.Uuid
  amountCents     Int
  currency         String     @default("USD")
  status           String     // 'pending' | 'processing' | 'completed' | 'failed'
  payoutProviderRef String?    // Square transfer ID
  ledgerEntryIds   String[]   // Array of ledger entry IDs
  createdAt        DateTime   @default(now())
  processedAt      DateTime?
  completedAt      DateTime?
  
  ownerAccount     OwnerAccount @relation(fields: [ownerAccountId], references: [id])
  
  @@index([ownerAccountId])
  @@index([status])
}

model SMSMessage {
  id              String     @id @default(uuid())
  direction       String     // 'inbound' | 'outbound'
  phoneE164       String
  keywordCode     String?
  gameId          String?    @db.Uuid
  messageBody     String
  status          String     // 'sent' | 'delivered' | 'failed'
  providerMessageId String?
  createdAt       DateTime   @default(now())
  deliveredAt     DateTime?
  
  @@index([phoneE164])
  @@index([keywordCode])
}

model AdminAuditLog {
  id              String     @id @default(uuid())
  adminUserId     String
  actionType      String     // 'refund_create' | 'resend_sms' | 'keyword_disable' | 'view_audience' | etc.
  targetType      String     // 'purchase' | 'game' | 'owner' | 'config' | 'viewer'
  targetId        String?
  reason          String?
  requestMetadata Json       // JSON snapshot (redacted)
  createdAt       DateTime   @default(now())
  
  @@index([adminUserId])
  @@index([targetType, targetId])
  @@index([createdAt])
}
```

## Utility Functions

### Email Masking

```typescript
// packages/data-model/src/utils/masking.ts
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return '***@***';
  
  if (localPart.length <= 1) {
    return `***@${domain}`;
  }
  
  return `${localPart[0]}***@${domain}`;
}
```

### Marketplace Fee Calculator

```typescript
// packages/data-model/src/utils/feeCalculator.ts
export interface MarketplaceSplit {
  grossAmountCents: number;
  platformFeeCents: number;
  processorFeeCents: number;
  ownerNetCents: number;
}

export function calculateMarketplaceSplit(
  grossAmountCents: number,
  platformFeePercent: number
): MarketplaceSplit {
  // Square: 2.9% + $0.30 per transaction
  const processorFeeCents = Math.round(grossAmountCents * 0.029 + 30);
  const platformFeeCents = Math.round(grossAmountCents * (platformFeePercent / 100));
  const ownerNetCents = grossAmountCents - platformFeeCents - processorFeeCents;
  
  return {
    grossAmountCents,
    platformFeeCents,
    processorFeeCents,
    ownerNetCents,
  };
}
```

## Testing Requirements (100% Coverage)

### Schema Tests

```typescript
// packages/data-model/__tests__/unit/schemas/ViewerIdentitySchema.test.ts
import { ViewerIdentitySchema } from '@/schemas/ViewerIdentitySchema';
import { z } from 'zod';

describe('ViewerIdentitySchema', () => {
  it('validates valid viewer identity with email', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      smsOptOut: false,
      createdAt: new Date(),
    };
    
    expect(() => ViewerIdentitySchema.parse(valid)).not.toThrow();
  });
  
  it('rejects missing email', () => {
    const invalid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      smsOptOut: false,
      createdAt: new Date(),
    };
    
    expect(() => ViewerIdentitySchema.parse(invalid)).toThrow(z.ZodError);
  });
  
  it('rejects invalid email format', () => {
    const invalid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'not-an-email',
      smsOptOut: false,
      createdAt: new Date(),
    };
    
    expect(() => ViewerIdentitySchema.parse(invalid)).toThrow(z.ZodError);
  });
});
```

### Utility Tests

```typescript
// packages/data-model/__tests__/unit/utils/masking.test.ts
import { maskEmail } from '@/utils/masking';

describe('maskEmail', () => {
  it('masks email correctly', () => {
    expect(maskEmail('john@example.com')).toBe('j***@example.com');
    expect(maskEmail('a@example.com')).toBe('***@example.com');
  });
});
```

## Package Configuration

### `packages/data-model/package.json`

```json
{
  "name": "@fieldview/data-model",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc --noEmit",
    "lint": "eslint src",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "zod": "^3.22.4",
    "@prisma/client": "^5.7.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "prisma": "^5.7.1",
    "typescript": "^5.3.3",
    "vitest": "^1.0.4"
  }
}
```

## Acceptance Criteria

- [ ] All entity interfaces defined (matching `docs/04-data-model.md`)
- [ ] `StreamSource` entity and schema added (Mux, BYO HLS, BYO RTMP, external embed)
- [ ] `ViewerIdentity.email` marked as required in schema
- [ ] All Zod schemas created with validation
- [ ] Prisma schema matches entities
- [ ] Email masking utility implemented
- [ ] Marketplace fee calculator implemented
- [ ] 100% test coverage on schemas and utilities
- [ ] Package builds successfully (`pnpm build`)
- [ ] Package can be imported by other packages
- [ ] Prisma migrations created and tested

## Next Steps

- Proceed to [05-api-implementation.md](./05-api-implementation.md) for Express API implementation
