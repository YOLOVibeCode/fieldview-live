# Fix: iOS Safari Crash on Direct Stream Pages

## Problem Summary

The `/direct/tchs/soccer-20260122-jv2` page shows "Application error: a client-side exception has occurred" on iOS Safari. The root cause is a **JavaScript runtime error** where a variable is used before it's declared.

## Root Cause Analysis

### Critical Bug Location

**File:** `apps/web/components/DirectStreamPageBase.tsx`

**Issue:** The `chat` variable is referenced in a `useEffect` hook on **line 253** but is not declared until **line 601**.

```typescript
// Line 252-257 - PROBLEM: `chat` doesn't exist yet!
useEffect(() => {
  if (chat.isConnected && !metrics.chatConnectTime) {  // ← ReferenceError
    const connectTime = performance.now() - metrics.pageLoadTime;
    setMetrics(prev => ({ ...prev, chatConnectTime: connectTime }));
  }
}, [chat.isConnected, metrics.chatConnectTime, metrics.pageLoadTime]);

// ... 340+ lines later ...

// Line 601 - Where `chat` is actually defined
const chat = useGameChat({
  gameId: effectiveGameId,
  viewerToken: viewer.token,
  enabled: bootstrap?.chatEnabled === true,
});
```

### Why This Causes a Crash

1. **JavaScript Temporal Dead Zone (TDZ)**: Accessing a `const` variable before its declaration throws a `ReferenceError`
2. **React doesn't catch this error**: It happens during component initialization, before any error boundary can catch it
3. **Build bypasses type checking**: `next.config.js` has `typescript.ignoreBuildErrors: true`, so the TypeScript error `TS2448: Block-scoped variable 'chat' used before its declaration` was ignored

### TypeScript Errors Confirming the Bug

```
apps/web/components/DirectStreamPageBase.tsx(257,7): error TS2448: Block-scoped variable 'chat' used before its declaration.
apps/web/components/DirectStreamPageBase.tsx(257,7): error TS2454: Variable 'chat' is used before being assigned.
```

### Hook Dependency Chain

The correct ordering must follow this dependency chain:
```
bootstrap → effectiveGameId → viewer → chat → chat-dependent useEffects
```

## Solution

### Step 1: Move Hook Declarations

Move these hooks from their current location (~line 601) to immediately after the `viewer` hook (~line 488):

1. `chat` hook (useGameChat)
2. `chatV2` hook (useGameChatV2)
3. The chat metrics useEffect (currently at line 252-257)

### Step 2: Remove Misleading Comment

Remove the comment at lines 248-249 that incorrectly states "Chat hook already declared above".

## Implementation

### Changes Required

```typescript
// CURRENT (BROKEN):
// ~Line 252: useEffect using chat.isConnected (chat is undefined!)
// ~Line 485: viewer = useViewerIdentity(...)
// ~Line 491: globalAuth = useGlobalViewerAuth()
// ~Line 601: chat = useGameChat(...) ← TOO LATE!
// ~Line 608: chatV2 = useGameChatV2(...)

// FIXED:
// ~Line 485: viewer = useViewerIdentity(...)
// ~Line 491: globalAuth = useGlobalViewerAuth()
// ~Line 493: chat = useGameChat(...)        ← MOVED HERE
// ~Line 500: chatV2 = useGameChatV2(...)    ← MOVED HERE
// ~Line 507: useEffect for chat metrics     ← MOVED HERE
```

## Verification Strategy

### 1. Pre-Fix: Confirm Error Exists

```bash
cd apps/web && pnpm type-check 2>&1 | grep -E "(TS2448|TS2454|chat)"
```

Expected output:
```
DirectStreamPageBase.tsx(257,7): error TS2448: Block-scoped variable 'chat' used before its declaration.
DirectStreamPageBase.tsx(257,7): error TS2454: Variable 'chat' is used before being assigned.
```

### 2. Post-Fix: Verify Error is Gone

Same command should show no errors for `chat`.

### 3. Run E2E Tests (WebKit/Safari)

```bash
cd apps/web && pnpm test:live --project=webkit tests/e2e/direct-streams.spec.ts
```

### 4. Add Regression Test

Add to `tests/e2e/direct-streams.spec.ts`:

```typescript
test('should not have JavaScript reference errors on page load', async ({ page }) => {
  const errors: string[] = [];

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  await page.goto('http://localhost:4300/direct/tchs/soccer-20260122-jv2');
  await page.waitForTimeout(3000);

  // Filter for reference errors (the type of error this bug causes)
  const referenceErrors = errors.filter(e =>
    e.includes('ReferenceError') ||
    e.includes('is not defined') ||
    e.includes('before initialization') ||
    e.includes('Cannot access')
  );

  expect(referenceErrors).toEqual([]);
});
```

### 5. Manual iOS Safari Testing

After deployment:
1. Open Safari on iPhone
2. Navigate to `https://fieldview.live/direct/tchs/soccer-20260122-jv2`
3. Page should load without "Application error" message
4. Video player area should be visible (even if stream is offline)

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/components/DirectStreamPageBase.tsx` | Reorder hook declarations |
| `apps/web/tests/e2e/direct-streams.spec.ts` | Add regression test |

## Risk Assessment

**Risk Level:** LOW

- The fix is a simple reordering of hook declarations
- No business logic changes
- No API changes
- Existing tests will continue to work
- The change makes the code more correct (follows React hooks rules)

## Implementation Checklist

- [ ] Run type-check to confirm current error
- [ ] Move `chat` hook declaration to after `viewer` hook
- [ ] Move `chatV2` hook declaration to after `chat` hook
- [ ] Move chat-dependent useEffect to after `chat` hook
- [ ] Remove misleading comment at lines 248-249
- [ ] Run type-check to confirm these specific errors are fixed
- [ ] Run existing e2e tests with webkit project
- [ ] Add regression test for JavaScript errors
- [ ] Test on iOS Safari (manual or via BrowserStack)
- [ ] Deploy and verify in production
