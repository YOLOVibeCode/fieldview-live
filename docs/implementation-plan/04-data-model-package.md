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

> **Source of truth:** the complete Prisma schema lives in
> [`packages/data-model/prisma/schema.prisma`](../../packages/data-model/prisma/schema.prisma).
> It has grown well beyond the original core set, so the full model
> definitions are **not** duplicated here (they drift). Read the schema file
> directly for exact fields, indexes, and relations.

- **Datasource:** PostgreSQL — `provider = "postgresql"`, `url = env("DATABASE_URL")`
- **Generator:** `prisma-client-js` (`@prisma/client` 6.0.0)

The schema currently defines **38 models**:

**Owner / org / billing**
`OwnerAccount`, `VeoIntegration`, `OwnerUser`, `Organization`, `OrganizationMember`, `Subscription`, `LedgerEntry`, `Payout`, `CouponCode`, `CouponRedemption`

**Games & streaming**
`Game`, `StreamSource`, `GameScoreboard`, `GameChatMessage`, `Event`, `WatchChannel`, `WatchEventCode`, `DirectStream`, `DirectStreamEvent`, `DirectStreamRegistration`, `VideoClip`, `VideoBookmark`

**Viewers, purchases & playback**
`ViewerIdentity`, `ViewerSquareCustomer`, `ViewerRefreshToken`, `Purchase`, `PaymentAttempt`, `Entitlement`, `PlaybackSession`, `Refund`

**Auth, admin & misc**
`AdminAccount`, `AdminAuditLog`, `EarlyAccessSignup`, `SMSMessage`, `EmailVerificationToken`, `PasswordResetToken`, `DeviceFingerprint`, `OwnerAccountFingerprint`

Key Square-related fields (verified in the schema):

- `OwnerAccount.payoutProviderRef` — Square `merchant_id` (also holds encrypted Square OAuth tokens and `squareLocationId`)
- `Payout.payoutProviderRef` — Square transfer ID
- `ViewerSquareCustomer` — maps a viewer to a Square customer per owner account

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
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "db:generate": "pnpm exec prisma generate --schema=./prisma/schema.prisma",
    "db:migrate": "pnpm exec prisma migrate dev --schema=./prisma/schema.prisma",
    "db:studio": "pnpm exec prisma studio --schema=./prisma/schema.prisma"
  },
  "dependencies": {
    "@prisma/client": "6.0.0",
    "prisma": "6.0.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@vitest/coverage-v8": "^1.0.4",
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
