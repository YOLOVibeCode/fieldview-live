# Testing Strategy: Stream-Page Decoupling

**Date:** 2026-01-21  
**Approach:** Integrate new scenarios into existing test suite (avoid duplication)

---

## Test Duplication Analysis

### Existing Test Coverage

**E2E Tests:**
1. `apps/web/tests/e2e/direct-streams.spec.ts` - All direct stream pages, player, chat, scoreboard
2. `tests/e2e/direct-stream-complete-ux.spec.ts` - Full lifecycle (admin creates, viewers interact)

**API Tests:**
3. `apps/api/__tests__/live/direct-stream-admin.test.ts` - Admin settings, JWT auth
4. `apps/api/__tests__/live/direct-stream-unlock.test.ts` - Admin unlock

###Decision: Integrate, Don't Duplicate

❌ **Deleted duplicate test files:**
- `tests/e2e/stream-page-decoupling.spec.ts`
- `tests/e2e/stream-decoupling-manual.spec.ts`
- `playwright.manual.config.ts`
- `scripts/test-stream-decoupling.ts`

✅ **Integrated new scenarios into existing tests:**
- Added 4 new tests to `apps/api/__tests__/live/direct-stream-admin.test.ts`

---

## New Test Scenarios Added

### API Tests (`direct-stream-admin.test.ts`)

#### 1. Settings save without stream URL
```typescript
it('should save settings without stream URL (decoupled)', async () => {
  // Tests that page settings can be updated independently
  // Stream URL is not required for other settings
});
```

**What it validates:**
- ✅ Admin can configure chat, scoreboard, paywall without stream
- ✅ Stream URL field is optional in settings update
- ✅ Other settings save successfully when stream URL omitted

#### 2. Invalid URL doesn't block other settings
```typescript
it('should save other settings when stream URL is invalid (fault-tolerant)', async () => {
  // Tests fault-tolerant validation
  // Invalid URL is skipped, other settings still save
});
```

**What it validates:**
- ✅ Invalid stream URL doesn't cause 400 error
- ✅ Chat/scoreboard settings save despite invalid URL
- ✅ Original stream URL is preserved (invalid one skipped)

#### 3. Can clear stream URL
```typescript
it('should allow clearing stream URL', async () => {
  // Tests that stream can be removed while keeping page
});
```

**What it validates:**
- ✅ Stream URL can be set to null
- ✅ Page remains functional without stream
- ✅ Other settings unaffected

#### 4. Bootstrap returns decoupled structure
```typescript
describe('GET /api/direct/:slug/bootstrap', () => {
  it('should return decoupled page and stream structure', async () => {
    // Tests new API response structure
  });
  
  it('should return null stream when URL not configured', async () => {
    // Tests graceful handling of missing stream
  });
});
```

**What it validates:**
- ✅ Response has `page` and `stream` objects
- ✅ Stream is `null` when not configured
- ✅ Backward compatibility maintained (flat fields present)
- ✅ Page config independent of stream status

---

## Test Coverage Summary

### Scenarios Covered

| Scenario | Test File | Test Name |
|----------|-----------|-----------|
| **Page loads without stream** | `direct-stream-admin.test.ts` | Bootstrap returns null stream |
| **Settings save without stream** | `direct-stream-admin.test.ts` | Settings save without stream URL |
| **Invalid URL non-blocking** | `direct-stream-admin.test.ts` | Invalid URL doesn't block settings |
| **Clear stream URL** | `direct-stream-admin.test.ts` | Can clear stream URL |
| **Decoupled API structure** | `direct-stream-admin.test.ts` | Bootstrap decoupled structure |
| **Admin panel (existing)** | `direct-stream-unlock.test.ts` | Unlock with password |
| **Chat (existing)** | `direct-streams.spec.ts` | Chat functionality |
| **Scoreboard (existing)** | `direct-streams.spec.ts` | Scoreboard functionality |

---

## Running Tests

### API Tests
```bash
cd apps/api
pnpm test:unit
```

### E2E Tests
```bash
cd apps/web
pnpm test:e2e
```

### Specific Test File
```bash
cd apps/api
pnpm vitest apps/api/__tests__/live/direct-stream-admin.test.ts
```

---

## Benefits of This Approach

1. **No Duplication** - Leverages existing test infrastructure
2. **Focused Tests** - Only tests new decoupling scenarios
3. **Easier Maintenance** - Single source of truth per feature
4. **Faster Execution** - Fewer redundant tests to run
5. **Clear Intent** - Test names clearly indicate what's being validated

---

## Future Enhancements

If additional stream-specific tests are needed:

1. **Stream Health Monitoring** - Test background health checks
2. **Auto-Retry Logic** - Test exponential backoff
3. **Multi-Stream** - Test multiple streams per page
4. **DVR Fallback** - Test fallback to recorded stream

These should be added to existing test files, not new ones.

---

`ROLE: engineer STRICT=false`

**Testing strategy: Integrate new scenarios into existing tests. Avoid duplication.**
