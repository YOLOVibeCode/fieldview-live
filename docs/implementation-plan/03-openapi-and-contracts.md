# OpenAPI & Contracts (Swagger-First)

## Swagger-First Mandate

Per `.cursorrules`, **all API endpoints must be defined in OpenAPI before implementation**. This ensures:
- Type safety (generated TypeScript types)
- Contract testing
- Mock API server (Prism) for frontend development
- API documentation

## OpenAPI Specification Location

**File**: `openapi/api.yaml` (or `openapi/api.yml`)

**Structure**:
```
openapi/
├── api.yaml              # Main OpenAPI spec
├── components/           # Reusable components
│   ├── schemas.yaml     # Shared schemas
│   ├── parameters.yaml  # Shared parameters
│   └── responses.yaml   # Shared responses
└── paths/               # Endpoint definitions
    ├── public.yaml      # Public endpoints
    ├── owners.yaml      # Owner endpoints
    └── admin.yaml       # Admin endpoints
```

## Converting API Spec Outline to OpenAPI

### Source Document
- `docs/05-api-spec-outline.md` contains endpoint inventory and schema outlines

### Conversion Tasks

1. **Create OpenAPI structure**:
   - OpenAPI 3.1.0 format
   - Info section (title, version, description)
   - Servers (development, staging, production)
   - Security schemes (JWT Bearer, Session Cookie)

2. **Define schemas** (from `docs/04-data-model.md` and `docs/05-api-spec-outline.md`):
   - `OwnerAccount`, `Game`, `Purchase`, `Entitlement`, `PlaybackSession`
   - `ViewerIdentity` (email required)
   - `StreamSource` (new: Mux-managed, BYO HLS, BYO RTMP, external embed)
   - Request/response DTOs
   - Error response schema

3. **Define endpoints** (from `docs/05-api-spec-outline.md`):
   - Public endpoints (game landing, checkout, watch)
   - Owner endpoints (games, analytics, audience)
   - Admin endpoints (search, refunds, audit)
   - Webhook endpoints (Twilio, Square)

4. **Add validation rules**:
   - Required fields (e.g., `viewerEmail` in checkout)
   - Format constraints (email, E.164 phone, UUID)
   - Enum values (game states, purchase statuses)

## Key Schemas to Define

### ViewerIdentity (Email Required)

```yaml
ViewerIdentity:
  type: object
  required:
    - id
    - email
  properties:
    id:
      type: string
      format: uuid
    email:
      type: string
      format: email
      description: Required for viewer identity and monitoring
    phoneE164:
      type: string
      pattern: '^\+[1-9]\d{1,14}$'
      description: Optional, E.164 format
    smsOptOut:
      type: boolean
    createdAt:
      type: string
      format: date-time
```

### StreamSource (New)

```yaml
StreamSource:
  type: object
  required:
    - type
    - gameId
  properties:
    type:
      type: string
      enum:
        - mux_managed
        - byo_hls
        - byo_rtmp
        - external_embed
    gameId:
      type: string
      format: uuid
    muxAssetId:
      type: string
      description: For mux_managed type
    hlsManifestUrl:
      type: string
      format: uri
      description: For byo_hls type
    rtmpPublishUrl:
      type: string
      format: uri
      description: For byo_rtmp type
    externalEmbedUrl:
      type: string
      format: uri
      description: For external_embed type (YouTube/Twitch/Vimeo)
    protectionLevel:
      type: string
      enum:
        - strong
        - moderate
        - best_effort
      description: Protection guarantee level
```

### CheckoutCreateRequest (Email Required)

```yaml
CheckoutCreateRequest:
  type: object
  required:
    - viewerEmail
  properties:
    viewerEmail:
      type: string
      format: email
      description: Required for viewer identity and monitoring
    viewerPhone:
      type: string
      pattern: '^\+[1-9]\d{1,14}$'
      description: Optional, E.164 format
    returnUrl:
      type: string
      format: uri
```

### GameAudience Response

```yaml
GameAudience:
  type: object
  properties:
    gameId:
      type: string
      format: uuid
    purchasers:
      type: array
      items:
        $ref: '#/components/schemas/PurchaserInfo'
    watchers:
      type: array
      items:
        $ref: '#/components/schemas/WatcherInfo'
    purchaseToWatchConversionRate:
      type: number
      minimum: 0
      maximum: 1

PurchaserInfo:
  type: object
  properties:
    purchaseId:
      type: string
      format: uuid
    emailMasked:
      type: string
      description: Masked email (e.g., j***@example.com)
    purchasedAt:
      type: string
      format: date-time
    amountCents:
      type: integer
    watched:
      type: boolean
```

## Type Generation

### Tools

- **openapi-typescript**: Generate TypeScript types from OpenAPI
- **openapi-fetch**: Generate typed fetch client
- **@openapitools/openapi-generator-cli**: Alternative (more features)

### Setup

```bash
# Install type generation tools
pnpm add -D openapi-typescript openapi-fetch

# Generate types script
# In root package.json:
"scripts": {
  "openapi:generate": "openapi-typescript openapi/api.yaml -o packages/api-client/src/types/api.ts"
}
```

### Generated Types Usage

```typescript
// packages/api-client/src/types/api.ts (generated)
export interface CheckoutCreateRequest {
  viewerEmail: string; // Required
  viewerPhone?: string;
  returnUrl?: string;
}

// apps/web/lib/api-client.ts
import { components } from '@/types/api';

type CheckoutRequest = components['schemas']['CheckoutCreateRequest'];
```

## Prism Mock Server

### Purpose

- Frontend development without backend
- Contract testing
- API exploration

### Setup

```bash
# Install Prism
pnpm add -D @stoplight/prism-cli

# Start mock server
pnpm exec prism mock openapi/api.yaml
```

### Usage

```bash
# Mock server runs on http://localhost:4010
# All endpoints return example responses from OpenAPI spec
```

### Integration

- Frontend can point to Prism mock server in development
- Switch to real API via environment variable
- Example: `NEXT_PUBLIC_API_URL=http://localhost:4010` (mock) vs `https://api.fieldview.live` (real)

## Contract Testing

### Purpose

Ensure API implementation matches OpenAPI spec.

### Tools

- **Dredd**: Test API against OpenAPI spec
- **Schemathesis**: Property-based testing
- **Custom tests**: Validate request/response shapes

### Implementation

```typescript
// apps/api/__tests__/contract/api.test.ts
import { validateRequest, validateResponse } from 'openapi-validator';
import { openapiSpec } from '../../../openapi/api.yaml';

describe('Contract Tests', () => {
  it('POST /public/games/{gameId}/checkout matches OpenAPI spec', async () => {
    const request = {
      viewerEmail: 'test@example.com',
    };
    
    // Validate request matches schema
    validateRequest(openapiSpec, '/public/games/{gameId}/checkout', 'post', request);
    
    const response = await api.post('/public/games/123/checkout', request);
    
    // Validate response matches schema
    validateResponse(openapiSpec, '/public/games/{gameId}/checkout', 'post', response);
  });
});
```

## OpenAPI Validation

### CI Integration

Add to CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Validate OpenAPI
  run: |
    pnpm add -D @apidevtools/swagger-cli
    pnpm exec swagger-cli validate openapi/api.yaml
```

## Acceptance Criteria

- [ ] OpenAPI YAML file created (`openapi/api.yaml`)
- [ ] All endpoints from `docs/05-api-spec-outline.md` defined
- [ ] All schemas defined (including `StreamSource`, `ViewerIdentity` with email required)
- [ ] OpenAPI spec validates (no errors)
- [ ] TypeScript types generated from OpenAPI
- [ ] Prism mock server runs successfully
- [ ] Contract tests validate request/response shapes
- [ ] OpenAPI validation added to CI pipeline

## Next Steps

- Proceed to [04-data-model-package.md](./04-data-model-package.md) for data model implementation
