# FieldView.Live Design Document

This document specifies the technology stack, architecture, and implementation approach for FieldView.Live based on the product specifications.

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Technology Stack Specification](#2-technology-stack-specification)
3. [Component Architecture & ISP Compliance](#3-component-architecture--isp-compliance)
4. [Admin Template Recommendation](#4-admin-template-recommendation)
5. [Testing Strategy](#5-testing-strategy)
6. [Docker Strategy](#6-docker-strategy)
7. [Railway Deployment](#7-railway-deployment)
8. [Square Payment Integration](#8-square-payment-integration)
9. [Key Implementation Decisions](#9-key-implementation-decisions)
10. [Development Workflow](#10-development-workflow)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [Security Considerations](#12-security-considerations)

---

## 1. System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Viewers (Mobile)                         │
│              SMS (Twilio) | Browser (Next.js Web)                 │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Frontend (Web App)                    │
│  - Public pages (payment, watch)                                │
│  - Owner dashboard                                              │
│  - Admin console                                                 │
│  - Video player (HLS.js)                                        │
└───────────────────────────┬───────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express API Server                           │
│  - REST API endpoints                                           │
│  - Webhook handlers (Twilio, Square)                             │
│  - Authentication & authorization                               │
│  - Business logic services                                      │
└───────────┬───────────────────────────┬───────────────────────────┘
            │                           │
            ▼                           ▼
┌──────────────────────┐    ┌──────────────────────┐
│   PostgreSQL (Railway)│    │    Redis (Railway)    │
│   - Primary database  │    │   - Sessions          │
│   - Prisma ORM        │    │   - Rate limiting     │
│                       │    │   - Job queue         │
└──────────────────────┘    └──────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                            │
│  - Twilio (SMS)                                                │
│  - SendGrid (Email)                                            │
│  - Square (Payments)                                           │
│  - Streaming Provider (AWS MediaLive/Mux)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Component Boundaries

- **Frontend (Next.js)**: UI rendering, client-side validation, video playback, telemetry collection
- **API (Express)**: Business logic, data access, webhook processing, authentication
- **Data Model Package**: Shared types, schemas, validation (NPM package)
- **External Integrations**: Twilio, SendGrid, Square, streaming provider

### Railway Deployment Architecture

```
Railway Project: fieldview-live
├── Service: web (Next.js)
│   ├── Dockerfile
│   ├── Port: 3000
│   └── Environment: production
├── Service: api (Express)
│   ├── Dockerfile
│   ├── Port: 3001
│   └── Environment: production
├── Database: postgres (Railway Managed)
│   └── Version: PostgreSQL 15+
└── Cache: redis (Railway Addon)
    └── Version: Redis 7+
```

---

## 2. Technology Stack Specification

### Frontend (Next.js)

**Core Framework:**
- **Next.js 14+** (App Router)
  - Server Components for SEO and performance
  - Server Actions for mutations
  - Route handlers for API routes (if needed)
- **React 18+**
  - Concurrent features
  - Server Components support
- **TypeScript** (strict mode)
  - Type safety across frontend and shared packages
  - Shared types from `@fieldview/data-model`

**State Management:**
- **TanStack Query (React Query)** v5+
  - Server state management
  - Caching and synchronization
  - Optimistic updates
- **Zustand** (optional, for client-only state)
  - Simple global state if needed
  - Prefer React Query for server state

**Form Handling:**
- **React Hook Form** v7+
  - Performance-optimized forms
  - Minimal re-renders
- **Zod** v3+
  - Schema validation (shared with backend)
  - Type inference from schemas
  - Integration with React Hook Form

**UI Components:**
- **Shadcn/ui** (Radix UI primitives + Tailwind CSS)
  - Accessible component primitives
  - Customizable styling
  - Copy-paste component model
- **Tailwind CSS** v3+
  - Utility-first CSS
  - Responsive design
  - Dark mode support

**Video Playback:**
- **HLS.js** v1+
  - HLS playback in browser
  - Adaptive bitrate streaming
  - Error handling and recovery
- **Video.js** (alternative)
  - Full-featured player
  - Plugin ecosystem
  - More overhead than HLS.js

**Mobile Optimization:**
- Responsive design (Tailwind breakpoints)
- PWA capabilities (Next.js PWA plugin)
- Touch-optimized interactions
- Mobile-first payment flows

**Admin Template:**
- See [Admin Template Recommendation](#4-admin-template-recommendation)

### Backend API (Express)

**Core Framework:**
- **Express.js** v4+
  - Minimal, flexible web framework
  - Middleware ecosystem
- **TypeScript** (strict mode)
  - Type safety
  - Shared types from `@fieldview/data-model`

**Authentication & Security:**
- **jsonwebtoken** (JWT)
  - API token authentication
  - Signed entitlement tokens
- **express-session** + **connect-redis**
  - Session management for web
  - Redis-backed sessions
- **speakeasy** or **otplib**
  - TOTP MFA generation/verification
  - Admin MFA requirements
- **express-rate-limit** + **Redis**
  - Rate limiting middleware
  - Per-endpoint limits
- **helmet**
  - Security headers
  - XSS protection

**Validation:**
- **Zod** v3+
  - Request/response validation
  - Shared schemas with frontend
  - Type inference

**Webhook Handling:**
- **express.raw()** middleware
  - Raw body parsing for webhooks
- **Twilio webhook signature verification**
  - `twilio` SDK for signature validation
- **Square webhook signature verification**
  - `squareup` SDK for signature validation

**Background Jobs:**
- **BullMQ** v4+
  - Job queue with Redis
  - Refund processing
  - SMS retries
  - Telemetry aggregation

**Database Access:**
- **Prisma** v5+
  - Type-safe ORM
  - Migration management
  - Query builder
  - Connection pooling

**Logging:**
- **Pino** v8+
  - Fast, structured JSON logging
  - Log levels
  - Request logging middleware

### Database (PostgreSQL)

**Database:**
- **PostgreSQL 15+** (Railway managed)
  - ACID compliance
  - JSON support
  - Full-text search (if needed)

**ORM:**
- **Prisma** v5+
  - Type-safe database access
  - Migration system
  - Connection pooling
  - Query optimization

**Connection Pooling:**
- **PgBouncer** (via Railway)
  - Transaction pooling
  - Connection reuse
  - Performance optimization

**Backup Strategy:**
- Railway automated daily backups
- Point-in-time recovery (if available)
- Backup retention: 7 days (configurable)

**Schema Management:**
- Prisma migrations
- Version-controlled schema files
- Migration rollback support

### External Services

#### SMS: Twilio
- **Service**: Twilio Programmable SMS
- **Use Cases**:
  - Inbound SMS keyword routing
  - Outbound payment/watch link SMS
  - Refund notifications
  - HELP/STOP compliance
- **SDK**: `twilio` npm package
- **Webhooks**: Signature verification required
- **Compliance**: TCPA/CTIA (STOP/HELP handling)

#### Email: SendGrid
- **Service**: SendGrid Transactional Email
- **Use Cases**:
  - Owner account verification
  - Password reset emails
  - Admin notifications
  - Transactional receipts (optional)
- **SDK**: `@sendgrid/mail` npm package
- **Templates**: SendGrid dynamic templates
- **Compliance**: CAN-SPAM

#### Payments: Square
- **Service**: Square Connect API
- **Use Cases**:
  - Payment processing (Apple Pay, Google Pay, cards)
  - Marketplace splits (platform fee vs owner earnings)
  - Refunds
  - Payouts to owners
- **SDK**: `squareup` npm package
- **Webhooks**: Signature verification required
- **Marketplace Model**: Square Connect (similar to Stripe Connect)
- **Note**: Specs reference Stripe; Square integration documented in [Square Payment Integration](#8-square-payment-integration)

#### Streaming: AWS MediaLive/CloudFront OR Mux
**Option A: AWS MediaLive + CloudFront**
- **MediaLive**: RTMP ingest → HLS output
- **CloudFront**: CDN distribution
- **Cost**: ~$6-8 per game (variable)
- **Setup**: More complex, more control

**Option B: Mux**
- **Mux Video**: Managed streaming platform
- **RTMP ingest → HLS output**
- **CDN included**
- **Cost**: ~$25 per game (simpler)
- **Setup**: Simpler, less control

**Recommendation**: Start with Mux for MVP (faster setup), migrate to AWS if cost becomes concern.

### Infrastructure

#### Hosting: Railway
- **Platform**: Railway.app
- **Services**: Docker containers
- **Database**: Railway managed PostgreSQL
- **Cache**: Railway Redis addon
- **Scaling**: Automatic (based on usage)
- **Deployments**: Git-based (automatic on push)

#### Containerization: Docker
- **Multi-stage builds** for optimization
- **Alpine Linux** base images (smaller)
- **Production**: Minimal runtime dependencies
- **Development**: Docker Compose for local dev

#### Caching: Redis
- **Session storage** (express-session)
- **Rate limiting** (express-rate-limit)
- **Job queue** (BullMQ)
- **Cache**: API response caching (optional)

#### File Storage
- **Railway volumes** (persistent storage)
- **OR S3-compatible** (Railway S3 addon or external)
- **Use Cases**: QR code images, signage templates

---

## 3. Component Architecture & ISP Compliance

### Monorepo Structure

```
fieldview-live/
├── packages/
│   ├── data-model/          # @fieldview/data-model (NPM package)
│   │   ├── src/
│   │   │   ├── entities/    # TypeScript interfaces
│   │   │   ├── schemas/     # Zod schemas
│   │   │   ├── prisma/      # Prisma schema
│   │   │   └── index.ts
│   │   ├── __tests__/       # 100% test coverage
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api-client/          # Type-safe API client
│   │   ├── src/
│   │   │   ├── client.ts    # Axios/fetch wrapper
│   │   │   ├── endpoints/   # Endpoint definitions
│   │   │   └── types.ts     # Uses data-model types
│   │   └── package.json
│   │
│   └── shared-utils/        # Shared utilities
│       ├── src/
│       │   ├── validation/
│       │   ├── formatting/
│       │   └── constants/
│       └── package.json
│
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── app/            # App Router pages
│   │   ├── components/     # React components
│   │   ├── lib/            # Utilities
│   │   ├── public/         # Static assets
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── api/                # Express backend
│       ├── src/
│       │   ├── routes/     # Express routes
│       │   ├── services/   # Business logic (ISP-compliant)
│       │   ├── repositories/ # Data access
│       │   ├── middleware/ # Express middleware
│       │   ├── webhooks/    # Webhook handlers
│       │   └── server.ts   # Express app
│       ├── Dockerfile
│       └── package.json
│
├── docker-compose.yml       # Local development
├── package.json            # Root workspace
└── pnpm-workspace.yaml     # pnpm workspace config
```

### Data Model NPM Package (`@fieldview/data-model`)

**Purpose**: Shared types, schemas, and database schema across frontend and backend.

**Contents:**
```typescript
// packages/data-model/src/entities/OwnerAccount.ts
export interface OwnerAccount {
  id: string;
  type: 'owner' | 'association';
  name: string;
  status: 'active' | 'suspended' | 'pending_verification';
  contactEmail: string;
  payoutProviderRef?: string; // Square account ID
  createdAt: Date;
  updatedAt: Date;
}

// packages/data-model/src/schemas/OwnerAccountSchema.ts
import { z } from 'zod';
import { OwnerAccount } from '../entities/OwnerAccount';

export const OwnerAccountSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['owner', 'association']),
  name: z.string().min(1).max(255),
  status: z.enum(['active', 'suspended', 'pending_verification']),
  contactEmail: z.string().email(),
  payoutProviderRef: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<OwnerAccount>;
```

**Prisma Schema:**
```prisma
// packages/data-model/prisma/schema.prisma
model OwnerAccount {
  id                String   @id @default(uuid())
  type              String   // 'owner' | 'association'
  name              String
  status            String   // 'active' | 'suspended' | 'pending_verification'
  contactEmail      String
  payoutProviderRef String?  // Square account ID
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  games             Game[]
  users             OwnerUser[]
  ledgerEntries     LedgerEntry[]
  payouts           Payout[]
}
```

**Publishing:**
- Private NPM package (or monorepo workspace)
- Versioned independently (semver)
- 100% test coverage required before publish
- CI/CD enforces coverage threshold

### Interface Segregation Principle (ISP)

**Principle**: Create focused, single-purpose interfaces instead of bloated ones.

#### API Layer Interfaces

```typescript
// ❌ WRONG: Bloated interface
interface IGameService {
  getGame(id: string): Promise<Game>;
  listGames(params: ListParams): Promise<Game[]>;
  createGame(data: CreateGameData): Promise<Game>;
  updateGame(id: string, data: UpdateGameData): Promise<Game>;
  cancelGame(id: string): Promise<Game>;
  rotateKeyword(id: string): Promise<Game>;
  // ... 20 more methods
}

// ✅ CORRECT: Segregated interfaces
interface IGameReader {
  getGame(id: string): Promise<Game>;
  listGames(params: ListParams): Promise<Game[]>;
  getGameByKeyword(keyword: string): Promise<Game | null>;
}

interface IGameWriter {
  createGame(data: CreateGameData): Promise<Game>;
  updateGame(id: string, data: UpdateGameData): Promise<Game>;
  cancelGame(id: string): Promise<Game>;
}

interface IGameKeywordManager {
  rotateKeyword(gameId: string): Promise<Game>;
  generateUniqueKeyword(ownerId: string): Promise<string>;
}
```

#### Service Layer Implementation

```typescript
// apps/api/src/services/GameService.ts
import { IGameReader, IGameWriter, IGameKeywordManager } from '@fieldview/data-model';

export class GameService implements IGameReader, IGameWriter, IGameKeywordManager {
  constructor(
    private gameRepository: IGameRepository,
    private keywordService: IKeywordService
  ) {}

  // IGameReader implementation
  async getGame(id: string): Promise<Game> {
    return this.gameRepository.findById(id);
  }

  async listGames(params: ListParams): Promise<Game[]> {
    return this.gameRepository.findMany(params);
  }

  async getGameByKeyword(keyword: string): Promise<Game | null> {
    return this.gameRepository.findByKeyword(keyword);
  }

  // IGameWriter implementation
  async createGame(data: CreateGameData): Promise<Game> {
    const keyword = await this.keywordService.generateUniqueKeyword(data.ownerAccountId);
    return this.gameRepository.create({ ...data, keywordCode: keyword });
  }

  // ... other methods
}
```

#### Repository Pattern

```typescript
// Data access interfaces
interface IGameRepository {
  findById(id: string): Promise<Game | null>;
  findMany(params: ListParams): Promise<Game[]>;
  findByKeyword(keyword: string): Promise<Game | null>;
  create(data: CreateGameData): Promise<Game>;
  update(id: string, data: UpdateGameData): Promise<Game>;
  delete(id: string): Promise<void>;
}

// Prisma implementation
class PrismaGameRepository implements IGameRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Game | null> {
    return this.prisma.game.findUnique({ where: { id } });
  }
  
  // ... other methods
}
```

### Component Development Process

1. **Define Interface** (ISP-compliant)
   - Single responsibility
   - Focused methods
   - Clear contracts

2. **Write Tests** (TDD)
   - Unit tests first
   - Mock dependencies
   - 100% coverage

3. **Implement Component**
   - Minimum code to pass tests
   - Follow ISP principles
   - Use shared types from `@fieldview/data-model`

4. **Integrate into App**
   - Wire up dependencies
   - Integration tests
   - E2E tests for critical flows

---

## 4. Admin Template Recommendation

### Recommended: Shadcn/ui + Next.js Admin Template

**Base Stack:**
- **Next.js 14** App Router
- **Shadcn/ui** (Radix UI primitives + Tailwind CSS)
- **TanStack Table** (React Table) for data tables
- **Recharts** or **Tremor** for charts

**Why Shadcn/ui:**
- ✅ Copy-paste component model (not a dependency)
- ✅ Built on Radix UI (accessible)
- ✅ Tailwind CSS (utility-first, customizable)
- ✅ TypeScript-first
- ✅ Works seamlessly with Next.js App Router
- ✅ Active community and ecosystem

**Admin Dashboard Template Options:**

1. **Refine.dev** (Recommended)
   - Full-featured admin framework
   - Built on Shadcn/ui
   - Data provider pattern (REST API ready)
   - Authentication built-in
   - Resource-based routing
   - **GitHub**: `refinedev/refine`

2. **Tremor Dashboard Template**
   - Beautiful dashboard components
   - Chart library included
   - Tailwind-based
   - **GitHub**: `tremorlabs/tremor`

3. **Shadcn/ui Admin Template** (Community)
   - Various community templates
   - Search: "shadcn admin template"
   - Start from scratch with Shadcn components

**Recommendation**: Use **Refine.dev** for admin console (SupportAdmin/SuperAdmin), build custom pages with Shadcn/ui for owner dashboard.

**Data Tables:**
- **TanStack Table** (React Table) v8+
  - Headless table library
  - Sorting, filtering, pagination
  - Server-side data fetching
  - Shadcn/ui table components wrapper

**Charts:**
- **Recharts** v2+
  - React charting library
  - Responsive charts
  - Good for dashboards
- **Tremor Charts** (if using Tremor)
  - Pre-styled chart components
  - Simpler API

**Forms:**
- **React Hook Form** + **Zod** + **Shadcn/ui form components**
  - Form validation
  - Error handling
  - Accessible form fields

### Alternative: Material-UI (MUI)

If prefer Material Design:
- **MUI** v5+ with Next.js
- **MUI DataGrid** for tables
- **MUI X Charts** for charts
- More opinionated styling
- Larger bundle size

**Recommendation**: Stick with Shadcn/ui for flexibility and smaller bundle size.

---

## 5. Testing Strategy (100% Coverage)

### Testing Philosophy

- **Test-Driven Development (TDD)**: Write tests before implementation
- **100% Coverage**: Required before merge (enforced via CI)
- **Test Pyramid**: More unit tests, fewer E2E tests
- **Fast Feedback**: Unit tests run in < 1s, integration tests < 10s

### Unit Tests

#### Frontend (Next.js)
- **Framework**: Vitest + React Testing Library
- **Coverage**: Components, hooks, utilities
- **Mocking**: MSW (Mock Service Worker) for API mocking

```typescript
// apps/web/__tests__/unit/components/GameCard.test.tsx
import { render, screen } from '@testing-library/react';
import { GameCard } from '@/components/GameCard';
import { Game } from '@fieldview/data-model';

describe('GameCard', () => {
  it('displays game title and teams', () => {
    const game: Game = {
      id: '1',
      title: 'Eagles vs Tigers',
      homeTeam: 'Eagles',
      awayTeam: 'Tigers',
      // ... other fields
    };
    
    render(<GameCard game={game} />);
    
    expect(screen.getByText('Eagles vs Tigers')).toBeInTheDocument();
    expect(screen.getByText('Eagles')).toBeInTheDocument();
    expect(screen.getByText('Tigers')).toBeInTheDocument();
  });
});
```

#### Backend (Express)
- **Framework**: Jest + Supertest
- **Coverage**: Services, repositories, middleware, utilities
- **Mocking**: Prisma mock, external service mocks

```typescript
// apps/api/__tests__/unit/services/GameService.test.ts
import { GameService } from '@/services/GameService';
import { IGameRepository } from '@fieldview/data-model';

describe('GameService', () => {
  let gameService: GameService;
  let mockRepository: jest.Mocked<IGameRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      // ... other methods
    };
    gameService = new GameService(mockRepository);
  });

  it('gets game by id', async () => {
    const game = { id: '1', title: 'Test Game' };
    mockRepository.findById.mockResolvedValue(game);

    const result = await gameService.getGame('1');

    expect(result).toEqual(game);
    expect(mockRepository.findById).toHaveBeenCalledWith('1');
  });
});
```

#### Data Model Package
- **Framework**: Vitest (pure TypeScript)
- **Coverage**: Interfaces, schemas, validation, utilities

```typescript
// packages/data-model/__tests__/unit/schemas/GameSchema.test.ts
import { GameSchema } from '@/schemas/GameSchema';
import { z } from 'zod';

describe('GameSchema', () => {
  it('validates valid game data', () => {
    const validGame = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Eagles vs Tigers',
      homeTeam: 'Eagles',
      awayTeam: 'Tigers',
      priceCents: 700,
      currency: 'USD',
      // ... other fields
    };

    expect(() => GameSchema.parse(validGame)).not.toThrow();
  });

  it('rejects invalid game data', () => {
    const invalidGame = {
      id: 'not-a-uuid',
      priceCents: -100, // negative price
    };

    expect(() => GameSchema.parse(invalidGame)).toThrow(z.ZodError);
  });
});
```

### Integration Tests

#### API Endpoint Testing
- **Framework**: Jest + Supertest
- **Coverage**: All API endpoints per spec
- **Database**: Test database (Prisma + PostgreSQL)

```typescript
// apps/api/__tests__/integration/api/games.test.ts
import request from 'supertest';
import { app } from '@/server';
import { PrismaClient } from '@prisma/client';

describe('POST /owners/me/games', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a game with unique keyword', async () => {
    const owner = await createTestOwner(prisma);
    const token = await getAuthToken(owner);

    const response = await request(app)
      .post('/owners/me/games')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Eagles vs Tigers',
        homeTeam: 'Eagles',
        awayTeam: 'Tigers',
        startsAt: '2025-12-15T19:00:00Z',
        priceCents: 700,
      });

    expect(response.status).toBe(201);
    expect(response.body.keywordCode).toBeDefined();
    expect(response.body.qrUrl).toBeDefined();
  });
});
```

#### Webhook Testing
- **Framework**: Jest + Supertest
- **Coverage**: Twilio, Square webhooks
- **Mocking**: Webhook signature verification

```typescript
// apps/api/__tests__/integration/webhooks/twilio.test.ts
import request from 'supertest';
import { app } from '@/server';
import { createTwilioSignature } from '@/test-utils/twilio';

describe('POST /webhooks/sms/inbound', () => {
  it('handles inbound SMS with valid signature', async () => {
    const game = await createTestGame({ keywordCode: 'EAGLES22' });
    const body = {
      From: '+15551234567',
      To: '+15559876543',
      Body: 'EAGLES22',
    };
    const signature = createTwilioSignature(body, process.env.TWILIO_AUTH_TOKEN!);

    const response = await request(app)
      .post('/webhooks/sms/inbound')
      .set('X-Twilio-Signature', signature)
      .send(body);

    expect(response.status).toBe(200);
    // Verify SMS response sent
  });
});
```

### E2E Tests

- **Framework**: Playwright
- **Coverage**: Critical user flows
- **Environment**: Railway staging

**Critical Flows:**
1. Text-to-pay flow (SMS → payment → watch)
2. QR-to-pay flow
3. Owner creates game
4. Admin support operations
5. Refund processing

```typescript
// apps/web/__tests__/e2e/flows/text-to-pay.spec.ts
import { test, expect } from '@playwright/test';

test('text-to-pay flow completes successfully', async ({ page, context }) => {
  // Simulate SMS keyword request
  const game = await createTestGame({ keywordCode: 'EAGLES22' });
  
  // Navigate to payment page (simulating SMS link click)
  await page.goto(`/public/games/${game.id}/checkout`);
  
  // Complete payment
  await page.fill('[data-testid="phone-input"]', '+15551234567');
  await page.click('[data-testid="pay-button"]');
  
  // Mock Square payment success
  await mockSquarePaymentSuccess(context);
  
  // Verify watch link received (check SMS mock)
  const sms = await getLastSMS('+15551234567');
  expect(sms.body).toContain('Watch now:');
  
  // Navigate to watch page
  const watchUrl = extractWatchUrl(sms.body);
  await page.goto(watchUrl);
  
  // Verify playback starts
  await expect(page.locator('video')).toBeVisible();
});
```

### Test Coverage Enforcement

**CI/CD Pipeline:**
```yaml
# .github/workflows/test.yml
- name: Run tests
  run: pnpm test --coverage

- name: Check coverage
  run: pnpm test:coverage:check
  # Fails if coverage < 100%
```

**Coverage Tools:**
- **Vitest**: Built-in coverage (Istanbul)
- **Jest**: Built-in coverage (Istanbul)
- **Threshold**: 100% for all files

**Coverage Reports:**
- HTML reports (generated in CI)
- Coverage badges (README)
- PR comments (coverage diff)

### Test Structure

```
packages/data-model/
  __tests__/
    unit/
      entities.test.ts
      schemas.test.ts
      validation.test.ts

apps/api/
  __tests__/
    unit/
      services/
        GameService.test.ts
        PurchaseService.test.ts
        RefundService.test.ts
      repositories/
        GameRepository.test.ts
      middleware/
        auth.test.ts
        rateLimit.test.ts
    integration/
      api/
        games.test.ts
        purchases.test.ts
        webhooks/
          twilio.test.ts
          square.test.ts

apps/web/
  __tests__/
    unit/
      components/
        GameCard.test.tsx
        PaymentForm.test.tsx
      hooks/
        useGames.test.ts
    e2e/
      flows/
        text-to-pay.spec.ts
        payment.spec.ts
        owner-dashboard.spec.ts
```

---

## 6. Docker Strategy

### Multi-Stage Dockerfiles

#### API Dockerfile

```dockerfile
# apps/api/Dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only production files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

EXPOSE 3001
CMD ["node", "dist/server.js"]
```

#### Web Dockerfile

```dockerfile
# apps/web/Dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

EXPOSE 3000
CMD ["node", "server.js"]
```

**Next.js Standalone Output:**
- Configure in `next.config.js`:
```javascript
module.exports = {
  output: 'standalone',
  // ...
};
```

### Docker Compose (Local Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: fieldview
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: fieldview_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: postgresql://fieldview:dev_password@postgres:5432/fieldview_dev
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
    ports:
      - "3001:3001"
    volumes:
      - ./apps/api:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
      NODE_ENV: development
    ports:
      - "3000:3000"
    volumes:
      - ./apps/web:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

### Docker Optimization

- **Multi-stage builds**: Smaller final images
- **Alpine Linux**: Minimal base images
- **Layer caching**: Optimize COPY order
- **.dockerignore**: Exclude unnecessary files
- **Production dependencies only**: Separate dev dependencies

---

## 7. Railway Deployment

### Railway Services Configuration

#### API Service

**Railway Configuration:**
- **Service Name**: `api`
- **Dockerfile**: `apps/api/Dockerfile`
- **Port**: 3001 (exposed internally)
- **Environment Variables**: See [Environment Variables](#environment-variables)

**Health Check:**
- Endpoint: `/health`
- Interval: 30s
- Timeout: 5s

#### Web Service

**Railway Configuration:**
- **Service Name**: `web`
- **Dockerfile**: `apps/web/Dockerfile`
- **Port**: 3000 (exposed publicly)
- **Environment Variables**: See [Environment Variables](#environment-variables)

**Health Check:**
- Endpoint: `/api/health` (Next.js API route)
- Interval: 30s
- Timeout: 5s

#### PostgreSQL Database

**Railway Configuration:**
- **Service Type**: Railway Managed PostgreSQL
- **Version**: PostgreSQL 15+
- **Plan**: Starter (upgrade as needed)
- **Backups**: Automated daily backups
- **Connection**: Internal Railway network

#### Redis Cache

**Railway Configuration:**
- **Service Type**: Railway Redis Addon
- **Version**: Redis 7+
- **Plan**: Starter (upgrade as needed)
- **Connection**: Internal Railway network

### Environment Variables

#### API Service

```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres.railway.internal:5432/fieldview

# Redis
REDIS_URL=redis://redis.railway.internal:6379

# JWT
JWT_SECRET=<random-secret>
JWT_EXPIRES_IN=24h

# MFA
TOTP_ISSUER=FieldView.Live

# Twilio
TWILIO_ACCOUNT_SID=<twilio-account-sid>
TWILIO_AUTH_TOKEN=<twilio-auth-token>
TWILIO_PHONE_NUMBER=<twilio-phone-number>

# SendGrid
SENDGRID_API_KEY=<sendgrid-api-key>
SENDGRID_FROM_EMAIL=noreply@fieldview.live

# Square
SQUARE_APPLICATION_ID=<square-app-id>
SQUARE_ACCESS_TOKEN=<square-access-token>
SQUARE_ENVIRONMENT=sandbox  # or production
SQUARE_WEBHOOK_SIGNATURE_KEY=<square-webhook-key>

# Streaming Provider (Mux)
MUX_TOKEN_ID=<mux-token-id>
MUX_TOKEN_SECRET=<mux-token-secret>

# Platform Config
PLATFORM_FEE_PERCENT=20
REFUND_THRESHOLD_FULL=0.20
REFUND_THRESHOLD_HALF=0.10

# App
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
```

#### Web Service

```bash
# API
NEXT_PUBLIC_API_URL=https://api.fieldview.live

# App
NODE_ENV=production
PORT=3000
```

### Railway Deployment Process

1. **Git Integration**
   - Connect Railway to GitHub repository
   - Automatic deployments on push to `main`
   - Manual deployments from Railway dashboard

2. **Build Process**
   - Railway detects Dockerfile
   - Builds Docker image
   - Runs health checks
   - Deploys container

3. **Environment Management**
   - **Development**: Railway preview environments (per PR)
   - **Staging**: Railway staging environment
   - **Production**: Railway production environment

4. **Secrets Management**
   - Railway Secrets (encrypted)
   - Per-environment secrets
   - Automatic injection as environment variables

### Railway Networking

- **Internal Services**: Communicate via Railway internal network
- **Public Services**: Web service exposed via Railway domain or custom domain
- **Database**: Only accessible from Railway services (not public)

### Scaling

- **Automatic Scaling**: Railway scales based on usage
- **Manual Scaling**: Configure resources in Railway dashboard
- **Database Scaling**: Upgrade PostgreSQL plan as needed
- **Redis Scaling**: Upgrade Redis plan as needed

---

## 8. Square Payment Integration

### Square Connect API Overview

**Note**: Product specifications reference Stripe, but Square is specified. Square Connect provides similar marketplace functionality.

### Square Marketplace Model

Square Connect supports marketplace payments similar to Stripe Connect:

1. **Platform Account**: Your FieldView.Live Square account
2. **Owner Accounts**: Square accounts for each owner (Square Connect)
3. **Payment Splits**: Platform fee + owner earnings
4. **Payouts**: Automatic transfers to owner Square accounts

### Square Integration Components

#### 1. Owner Onboarding (Square Connect)

```typescript
// apps/api/src/services/SquareService.ts
import { Client, Environment } from 'squareup';

export class SquareService {
  private client: Client;

  constructor() {
    this.client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN!,
      environment: process.env.SQUARE_ENVIRONMENT as Environment,
    });
  }

  async createOwnerAccount(ownerEmail: string) {
    // Create Square Connect account for owner
    const response = await this.client.oAuthApi.obtainToken({
      clientId: process.env.SQUARE_APPLICATION_ID!,
      clientSecret: process.env.SQUARE_APPLICATION_SECRET!,
      code: authorizationCode, // From OAuth flow
      grantType: 'authorization_code',
    });

    return {
      squareAccountId: response.result.merchantId,
      accessToken: response.result.accessToken,
    };
  }
}
```

#### 2. Payment Processing

```typescript
async processPayment(purchase: Purchase, ownerAccount: OwnerAccount) {
  const amount = purchase.amountCents;
  const platformFee = calculatePlatformFee(amount);
  const ownerEarnings = amount - platformFee - processorFee;

  // Create payment with split
  const response = await this.client.paymentsApi.createPayment({
    sourceId: paymentSourceId, // From Square payment form
    amountMoney: {
      amount: amount,
      currency: 'USD',
    },
    applicationFeeMoney: {
      amount: platformFee,
      currency: 'USD',
    },
    // Owner receives: ownerEarnings
  });

  return {
    paymentId: response.result.payment?.id,
    status: response.result.payment?.status,
  };
}
```

#### 3. Marketplace Split Calculation

```typescript
function calculateMarketplaceSplit(
  grossAmountCents: number,
  platformFeePercent: number
): MarketplaceSplit {
  const processorFeeCents = Math.round(grossAmountCents * 0.029 + 30); // Square: 2.9% + $0.30
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

#### 4. Webhook Handling

```typescript
// apps/api/src/webhooks/square.ts
import { WebhooksHelper } from 'squareup';

export async function handleSquareWebhook(req: Request, res: Response) {
  const signature = req.headers['x-square-signature'];
  const body = req.body;

  // Verify webhook signature
  const isValid = WebhooksHelper.isValidWebhookEventSignature(
    body,
    signature,
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!,
    req.url
  );

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = body.data;

  switch (event.type) {
    case 'payment.created':
      await handlePaymentCreated(event);
      break;
    case 'payment.updated':
      await handlePaymentUpdated(event);
      break;
    case 'refund.created':
      await handleRefundCreated(event);
      break;
  }

  res.json({ received: true });
}
```

#### 5. Refund Processing

```typescript
async processRefund(purchase: Purchase, refundAmountCents: number) {
  const response = await this.client.refundsApi.refundPayment({
    idempotencyKey: generateIdempotencyKey(),
    amountMoney: {
      amount: refundAmountCents,
      currency: 'USD',
    },
    paymentId: purchase.paymentProviderPaymentId!,
  });

  return {
    refundId: response.result.refund?.id,
    status: response.result.refund?.status,
  };
}
```

### Square vs Stripe Differences

| Feature | Stripe | Square |
|---------|--------|--------|
| Marketplace Model | Stripe Connect | Square Connect |
| Application Fee | `application_fee_amount` | `applicationFeeMoney` |
| Webhook Signature | `stripe-signature` header | `x-square-signature` header |
| Payment Methods | Stripe Elements | Square Payment Form |
| Payouts | Stripe Transfers | Square Transfers |

### Frontend Integration (Square Payment Form)

```typescript
// apps/web/components/PaymentForm.tsx
import { PaymentForm } from '@square/web-sdk-react';

export function CheckoutForm({ gameId, amount }: Props) {
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID!;
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!;

  return (
    <PaymentForm
      applicationId={applicationId}
      locationId={locationId}
      cardTokenizeResponseReceived={async (token) => {
        // Send token to API
        const response = await fetch(`/api/public/games/${gameId}/checkout`, {
          method: 'POST',
          body: JSON.stringify({ sourceId: token.token }),
        });
        // Handle response
      }}
    />
  );
}
```

### Required Square API Scopes

- `PAYMENTS_WRITE`: Process payments
- `PAYMENTS_READ`: Read payment status
- `REFUNDS_WRITE`: Process refunds
- `MERCHANT_PROFILE_READ`: Read merchant info
- `OAUTH_WRITE`: Connect owner accounts (if using OAuth)

---

## 9. Key Implementation Decisions

### Authentication

#### JWT Tokens (API)
- **Library**: `jsonwebtoken`
- **Algorithm**: HS256 (symmetric)
- **Expiration**: 24 hours (configurable)
- **Refresh**: Not implemented in MVP (extend session)

```typescript
// apps/api/src/middleware/auth.ts
import jwt from 'jsonwebtoken';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}
```

#### Session Management (Web)
- **Library**: `express-session` + `connect-redis`
- **Store**: Redis
- **Cookie**: httpOnly, secure, sameSite: 'strict'
- **Expiration**: 24 hours inactivity

#### MFA (TOTP)
- **Library**: `speakeasy` or `otplib`
- **Algorithm**: TOTP (Time-based One-Time Password)
- **Issuer**: FieldView.Live
- **Required**: SupportAdmin, SuperAdmin

```typescript
// apps/api/src/services/MFAService.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export class MFAService {
  generateSecret(userEmail: string) {
    const secret = speakeasy.generateSecret({
      name: `FieldView.Live (${userEmail})`,
      issuer: 'FieldView.Live',
    });

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url,
    };
  }

  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1, // Allow 30s clock skew
    });
  }
}
```

#### Step-Up Authentication
- Required for high-risk actions (refunds, config changes)
- Re-authenticate with password + MFA
- Temporary elevated session (5 minutes)

### Entitlement Tokens

#### JWT-Based Tokens
- **Library**: `jsonwebtoken`
- **Claims**: `purchaseId`, `gameId`, `validFrom`, `validTo`
- **Expiration**: Game end time + 2 hours grace period
- **Signature**: HS256 with secret key
- **Security**: Tokens must not be reusable beyond validity window (one-time use or short expiration)

#### Stream Protection Strategy
- **No permanent playback URLs**: Do not expose permanent HLS manifest URLs that grant access without entitlement validation
- **Watch bootstrap endpoint**: `GET /public/watch/{token}` validates entitlement before returning playback URL
- **Short-lived playback URLs**: Mint short-lived signed URLs (e.g., 1-hour expiration) or proxy manifest access
- **Tokenized manifest**: If using Mux, use tokenized playback IDs; if using AWS MediaLive, use CloudFront signed URLs
- **Session creation**: Every playback session creation validates entitlement and links to ViewerIdentity for monitoring

```typescript
// apps/api/src/services/EntitlementService.ts
import jwt from 'jsonwebtoken';

export class EntitlementService {
  generateToken(purchase: Purchase, game: Game): string {
    const validFrom = new Date();
    const validTo = new Date(game.endsAt || game.startsAt);
    validTo.setHours(validTo.getHours() + 2); // Grace period

    return jwt.sign(
      {
        purchaseId: purchase.id,
        gameId: game.id,
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
      },
      process.env.ENTITLEMENT_SECRET!,
      {
        expiresIn: Math.floor((validTo.getTime() - validFrom.getTime()) / 1000),
      }
    );
  }

  validateToken(token: string): EntitlementClaims | null {
    try {
      const decoded = jwt.verify(token, process.env.ENTITLEMENT_SECRET!) as EntitlementClaims;
      return decoded;
    } catch (error) {
      return null;
    }
  }
}
```

### Refund Processing

#### Background Job Queue
- **Library**: BullMQ
- **Queue**: Redis-backed
- **Workers**: Separate worker process (or same API process)

```typescript
// apps/api/src/queues/refundQueue.ts
import { Queue, Worker } from 'bullmq';
import { RefundService } from '@/services/RefundService';

export const refundQueue = new Queue('refunds', {
  connection: {
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT!),
  },
});

export const refundWorker = new Worker(
  'refunds',
  async (job) => {
    const { purchaseId } = job.data;
    const refundService = new RefundService();
    await refundService.processRefund(purchaseId);
  },
  {
    connection: {
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT!),
    },
  }
);
```

#### Deterministic Refund Calculation
- **Service**: `RefundCalculator`
- **Input**: Telemetry summary (from `PlaybackSession`)
- **Output**: Refund amount + reason
- **Deterministic**: Same inputs → same output

```typescript
// apps/api/src/services/RefundCalculator.ts
import { RefundRules } from '@fieldview/data-model';

export class RefundCalculator {
  calculateRefund(
    purchase: Purchase,
    telemetrySummary: TelemetrySummary,
    rules: RefundRules
  ): RefundDecision {
    const bufferRatio = telemetrySummary.totalBufferMs / Math.max(telemetrySummary.totalWatchMs, 1);
    const downtimeRatio = telemetrySummary.streamDownMs / Math.max(expectedGameDurationMs, 1);

    // Apply refund rules (deterministic)
    if (bufferRatio > rules.fullRefundBufferRatio || downtimeRatio > rules.fullRefundDowntimeRatio) {
      return {
        amountCents: purchase.amountCents,
        reason: 'buffer_ratio_high',
        ruleVersion: rules.version,
      };
    }

    if (bufferRatio > rules.halfRefundBufferRatio || downtimeRatio > rules.halfRefundDowntimeRatio) {
      return {
        amountCents: Math.floor(purchase.amountCents / 2),
        reason: 'buffer_ratio_medium',
        ruleVersion: rules.version,
      };
    }

    // ... other rules

    return {
      amountCents: 0,
      reason: 'no_refund',
      ruleVersion: rules.version,
    };
  }
}
```

### Telemetry Collection

#### Client-Side Collection
- **Library**: Custom telemetry collector
- **Events**: Buffering, errors, playback state
- **Submission**: Batch to API on session end

```typescript
// apps/web/lib/telemetry.ts
export class TelemetryCollector {
  private events: TelemetryEvent[] = [];
  private startTime: number = Date.now();

  recordBufferingStart() {
    this.events.push({ type: 'buffering_start', timestamp: Date.now() });
  }

  recordBufferingEnd() {
    this.events.push({ type: 'buffering_end', timestamp: Date.now() });
  }

  recordError(error: Error) {
    this.events.push({ type: 'fatal_error', timestamp: Date.now(), error: error.message });
  }

  async submit(sessionId: string) {
    const summary = this.calculateSummary();
    await fetch(`/api/public/watch/${token}/sessions/${sessionId}/telemetry`, {
      method: 'POST',
      body: JSON.stringify(summary),
    });
  }

  private calculateSummary(): TelemetrySummary {
    // Calculate totalWatchMs, totalBufferMs, bufferEvents, etc.
    return {
      totalWatchMs: Date.now() - this.startTime,
      totalBufferMs: this.calculateBufferTime(),
      bufferEvents: this.countBufferEvents(),
      fatalErrors: this.countFatalErrors(),
      startupLatencyMs: this.calculateStartupLatency(),
    };
  }
}
```

#### Viewer Monitoring Implementation

**Email Required at Checkout:**
- **Validation**: Checkout endpoint (`POST /public/games/{gameId}/checkout`) requires `viewerEmail` field
- **ViewerIdentity Creation**: On checkout, create or lookup ViewerIdentity by email
- **Purchase Linkage**: Purchase is linked to ViewerIdentity via `viewerId` field

**Session Tracking:**
- **Session Creation**: `POST /public/watch/{token}/sessions` creates PlaybackSession linked to Entitlement→Purchase→ViewerIdentity
- **Query Pattern**: "Who watched?" queries join PlaybackSession → Entitlement → Purchase → ViewerIdentity
- **Privacy**: Display masked emails to owners (e.g., `j***@example.com`); full emails to SuperAdmin

**Monitoring Endpoints:**
- **Owner**: `GET /owners/me/games/{gameId}/audience` returns purchasers + watchers with masked emails
- **SuperAdmin**: `GET /admin/owners/{ownerId}/games/{gameId}/audience` returns full email addresses
- **Search**: Admin search supports email queries for viewer identity lookup

**Privacy & Auditing:**
- **Email Masking**: Store full email in database; mask for display (first character + `***` + domain)
- **Audit Logging**: All admin access to viewer identity data is logged (actionType: `view_audience`, `view_viewer_identity`)
- **Rate Limiting**: Limit admin queries to prevent abuse

```typescript
// apps/api/src/services/AudienceService.ts
export class AudienceService {
  async getGameAudience(gameId: string, ownerAccountId: string, includeFullEmail: boolean = false) {
    const purchases = await this.prisma.purchase.findMany({
      where: { gameId },
      include: {
        viewer: true,
        entitlement: {
          include: {
            sessions: true,
          },
        },
      },
    });

    return purchases.map((purchase) => ({
      purchaseId: purchase.id,
      email: includeFullEmail ? purchase.viewer.email : this.maskEmail(purchase.viewer.email),
      purchasedAt: purchase.createdAt,
      amountCents: purchase.amountCents,
      watched: purchase.entitlement.sessions.length > 0,
      sessionCount: purchase.entitlement.sessions.length,
      lastWatchedAt: purchase.entitlement.sessions[0]?.startedAt,
    }));
  }

  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 1) return `***@${domain}`;
    return `${localPart[0]}***@${domain}`;
  }
}
```

---

## 10. Development Workflow

### TDD Process

1. **Write Failing Test**
   ```typescript
   // __tests__/unit/services/GameService.test.ts
   describe('GameService', () => {
     it('creates game with unique keyword', async () => {
       const service = new GameService(mockRepository);
       const game = await service.createGame({ title: 'Test' });
       expect(game.keywordCode).toBeDefined();
     });
   });
   ```

2. **Implement Minimum Code**
   ```typescript
   // services/GameService.ts
   async createGame(data: CreateGameData): Promise<Game> {
     const keyword = await this.generateKeyword();
     return this.repository.create({ ...data, keywordCode: keyword });
   }
   ```

3. **Refactor**
   - Improve code quality
   - Extract helpers
   - Optimize

4. **Repeat**
   - Next test case
   - Next feature

5. **Coverage Check**
   - Ensure 100% coverage
   - CI enforces threshold

### Component Development

1. **Define Interface** (ISP-compliant)
   ```typescript
   interface IGameReader {
     getGame(id: string): Promise<Game>;
   }
   ```

2. **Write Tests** (TDD)
   ```typescript
   describe('GameService', () => {
     it('implements IGameReader', () => {
       // Test
     });
   });
   ```

3. **Implement Component**
   ```typescript
   class GameService implements IGameReader {
     async getGame(id: string): Promise<Game> {
       // Implementation
     }
   }
   ```

4. **Integrate into App**
   - Wire up dependencies
   - Integration tests
   - E2E tests

### Git Workflow

1. **Feature Branch**
   - `git checkout -b feature/game-management`

2. **TDD Development**
   - Write test → Implement → Refactor
   - Commit frequently

3. **Coverage Check**
   - `pnpm test:coverage`
   - Ensure 100%

4. **Pull Request**
   - CI runs tests
   - Coverage check
   - Code review

5. **Merge**
   - Squash merge
   - Delete branch

### Local Development

1. **Start Services**
   ```bash
   docker-compose up -d  # Postgres, Redis
   pnpm dev              # API + Web
   ```

2. **Run Tests**
   ```bash
   pnpm test             # All tests
   pnpm test:watch       # Watch mode
   pnpm test:coverage    # Coverage report
   ```

3. **Database Migrations**
   ```bash
   pnpm prisma migrate dev
   pnpm prisma generate
   ```

---

## 11. Monitoring & Observability

### Logging

#### Structured JSON Logs
- **Library**: Pino
- **Format**: JSON
- **Levels**: error, warn, info, debug

```typescript
// apps/api/src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// Usage
logger.info({ purchaseId: '123', amount: 700 }, 'Purchase created');
logger.error({ error: err }, 'Payment failed');
```

#### Log Events
- Inbound SMS (phone, keyword, gameId)
- Payment lifecycle (purchaseId, status, viewerEmail)
- ViewerIdentity creation/lookup (email, purchaseId)
- Entitlement creation (purchaseId, tokenId)
- PlaybackSession creation (entitlementId, viewerId via Purchase)
- Refund decisions (purchaseId, telemetry, rule, amount)
- Admin actions (adminUserId, actionType, targetId)
- **Viewer identity access** (adminUserId, actionType: `view_audience` or `view_viewer_identity`, targetId: gameId or purchaseId)

### Metrics

#### Railway Metrics
- **CPU Usage**: Per service
- **Memory Usage**: Per service
- **Request Rate**: Per endpoint
- **Error Rate**: Per endpoint

#### Custom Metrics
- **Payment Success Rate**: Tracked in database
- **Refund Rate**: Tracked in database
- **SMS Delivery Rate**: Tracked via Twilio webhooks
- **Stream Availability**: Tracked via telemetry

### Error Tracking

#### Sentry (Recommended)
- **Service**: Sentry.io
- **Integration**: `@sentry/node` (API), `@sentry/nextjs` (Web)
- **Features**: Error tracking, performance monitoring, release tracking

```typescript
// apps/api/src/lib/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

#### Railway Error Tracking
- Built-in error tracking
- Error logs in Railway dashboard
- Alerting (if configured)

### Health Checks

#### API Health Endpoint
```typescript
// apps/api/src/routes/health.ts
router.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    twilio: await checkTwilio(),
  };

  const isHealthy = Object.values(checks).every((check) => check.status === 'ok');

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks,
  });
});
```

#### Web Health Endpoint
```typescript
// apps/web/app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok' });
}
```

### Alerts

#### Webhook Failure Rate
- Alert if > 5% failure rate
- Monitor Twilio/Square webhook delivery

#### Payment Success Rate
- Alert if < 85% success rate
- Monitor payment processing

#### Refund Spikes
- Alert if > 10% refund rate in 1 hour
- Monitor refund processing

#### Stream Availability
- Alert if > 5% error rate during game time
- Monitor streaming provider

---

## 12. Security Considerations

### HTTPS/TLS
- **Railway**: Automatic HTTPS/TLS
- **Custom Domain**: SSL certificate via Railway
- **HSTS**: Enabled via Railway

### Secrets Management
- **Railway Secrets**: Encrypted storage
- **Environment Variables**: Injected at runtime
- **No Hardcoded Secrets**: Enforced via linting

### Rate Limiting
- **express-rate-limit**: Per-endpoint limits
- **Redis-backed**: Shared across instances
- **Limits**:
  - Inbound SMS: 10/phone/minute
  - Checkout: 5/phone/IP/15min
  - Watch page: 100/token/hour
  - Admin actions: 50/admin/minute

### Input Validation
- **Zod Schemas**: All inputs validated
- **SQL Injection Prevention**: Prisma parameterized queries
- **XSS Prevention**: React automatic escaping
- **CSRF Protection**: Next.js built-in

### Authentication Security
- **JWT Secrets**: Strong, random secrets
- **Session Cookies**: httpOnly, secure, sameSite: 'strict'
- **Password Hashing**: bcrypt (10 rounds minimum)
- **MFA**: Required for admin accounts

### Data Protection
- **Encryption at Rest**: Railway managed (PostgreSQL, Redis)
- **Encryption in Transit**: TLS/HTTPS
- **PII Handling**: Phone numbers normalized, hashed for analytics
- **Email Privacy**: Store full email in database; mask for display to owners (e.g., `j***@example.com`). SuperAdmin can view full email for support/compliance.
- **Viewer Identity Access**: Audit log all admin access to viewer identity data (actionType: `view_audience`, `view_viewer_identity`)
- **Stream Protection**: No permanent playback URLs; entitlement validation required for every watch session
- **Data Retention**: Per compliance requirements

### API Security
- **CORS**: Configured for web domain only
- **Helmet**: Security headers
- **Request Size Limits**: express.json({ limit: '10mb' })
- **Webhook Signature Verification**: Twilio, Square

### Compliance
- **PCI DSS**: Square handles card data (no card storage)
- **GDPR**: Data deletion requests, opt-out handling
- **TCPA**: SMS STOP/HELP compliance
- **Accounting**: Immutable ledger entries

---

## Appendix: Technology Stack Summary

### Frontend
- Next.js 14+ (App Router)
- React 18+
- TypeScript (strict)
- TanStack Query (React Query)
- React Hook Form + Zod
- Shadcn/ui + Tailwind CSS
- HLS.js (video playback)
- Vitest + React Testing Library (testing)
- Playwright (E2E)

### Backend
- Express.js + TypeScript
- Prisma (ORM)
- PostgreSQL 15+
- Redis 7+
- BullMQ (job queue)
- Pino (logging)
- Jest + Supertest (testing)

### External Services
- Twilio (SMS)
- SendGrid (Email)
- Square (Payments)
- Mux or AWS MediaLive (Streaming)

### Infrastructure
- Railway (Hosting)
- Docker (Containerization)
- PostgreSQL (Railway managed)
- Redis (Railway addon)

### Development Tools
- pnpm (package manager)
- Prisma (database migrations)
- ESLint + Prettier (code quality)
- Husky (git hooks)
- GitHub Actions (CI/CD)

---

**Document Version**: 1.0  
**Last Updated**: December 2025  
**Status**: Ready for Implementation
