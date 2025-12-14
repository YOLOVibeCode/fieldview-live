# Contract Tests

Contract tests ensure API implementation matches OpenAPI specification.

## Purpose

- Validate request/response shapes match OpenAPI schemas
- Ensure all endpoints are covered
- Prevent API drift

## Running Contract Tests

```bash
pnpm --filter api test:contract
```

## Test Structure

Each endpoint should have a contract test that:
1. Validates request matches OpenAPI schema
2. Validates response matches OpenAPI schema
3. Tests error responses match error schema

## Example

```typescript
import { describe, it, expect } from 'vitest';
import { validateRequest, validateResponse } from '@/lib/openapi-validator';

describe('POST /public/games/{gameId}/checkout', () => {
  it('request matches OpenAPI schema', () => {
    const request = {
      viewerEmail: 'test@example.com',
    };
    
    validateRequest('/public/games/{gameId}/checkout', 'post', request);
  });
  
  it('response matches OpenAPI schema', async () => {
    const response = await api.post('/public/games/123/checkout', {
      viewerEmail: 'test@example.com',
    });
    
    validateResponse('/public/games/{gameId}/checkout', 'post', response.body);
  });
});
```
