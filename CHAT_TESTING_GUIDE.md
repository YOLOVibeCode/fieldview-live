# Chat Testing Guide

## Overview

The chat system uses a transport abstraction layer (`IMessageTransport`) that allows you to:
- **Run fast unit tests** with `MockMessageTransport` (no network, instant)
- **Simulate multiple users** chatting together in the same test
- **Test production code** with the real `SSEMessageTransport`
- **Write deterministic E2E tests** without flakiness

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  useGameChat Hook                                            │
│  ├─ Accepts optional transport (DI pattern)                 │
│  ├─ Defaults to SSEMessageTransport (production)            │
│  └─ Can inject MockMessageTransport (testing)               │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │   IMessageTransport          │
          │   (Interface)                │
          └──────────────────────────────┘
                   │           │
        ┌──────────┘           └──────────┐
        ▼                                 ▼
┌───────────────────┐         ┌───────────────────────┐
│ SSEMessageTransport│         │ MockMessageTransport │
│ (Production)       │         │ (Testing)            │
│ - Real SSE         │         │ - In-memory          │
│ - Network calls    │         │ - Multi-user sim     │
└───────────────────┘         └───────────────────────┘
```

---

## Unit Testing with MockMessageTransport

### Example: Single User

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGameChat } from '@/hooks/useGameChat';
import { MockMessageTransport } from '@/lib/chat/__mocks__/MockMessageTransport';

describe('Chat', () => {
  beforeEach(() => {
    MockMessageTransport.reset(); // Clear state between tests
  });

  it('should send and receive a message', async () => {
    const transport = new MockMessageTransport('Alice S.');
    
    const { result } = renderHook(() => useGameChat({
      gameId: 'game-123',
      viewerToken: 'token-abc',
      transport, // Inject mock
    }));
    
    // Wait for connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    // Send message
    await act(async () => {
      await result.current.sendMessage('Hello!');
    });
    
    // Verify it appears in messages
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });
    
    expect(result.current.messages[0].message).toBe('Hello!');
    expect(result.current.messages[0].displayName).toBe('Alice S.');
  });
});
```

### Example: Two Users Chatting

```typescript
it('should broadcast messages between Alice and Bob', async () => {
  const aliceTransport = new MockMessageTransport('Alice S.');
  const bobTransport = new MockMessageTransport('Bob J.');
  
  // Render both hooks
  const { result: alice } = renderHook(() => useGameChat({
    gameId: 'game-123',
    viewerToken: 'alice-token',
    transport: aliceTransport,
  }));
  
  const { result: bob } = renderHook(() => useGameChat({
    gameId: 'game-123',
    viewerToken: 'bob-token',
    transport: bobTransport,
  }));
  
  // Wait for both to connect
  await waitFor(() => {
    expect(alice.current.isConnected).toBe(true);
    expect(bob.current.isConnected).toBe(true);
  });
  
  // Alice sends message
  await act(async () => {
    await alice.current.sendMessage('Hi Bob!');
  });
  
  // Both should receive it (including Alice - echo behavior)
  await waitFor(() => {
    expect(alice.current.messages).toHaveLength(1);
    expect(bob.current.messages).toHaveLength(1);
  });
  
  expect(bob.current.messages[0].displayName).toBe('Alice S.');
  expect(bob.current.messages[0].message).toBe('Hi Bob!');
  
  // Bob responds
  await act(async () => {
    await bob.current.sendMessage('Hey Alice!');
  });
  
  // Both now have 2 messages
  await waitFor(() => {
    expect(alice.current.messages).toHaveLength(2);
    expect(bob.current.messages).toHaveLength(2);
  });
});
```

### Example: 10 Concurrent Users

```typescript
it('should handle 10 concurrent users', async () => {
  const users = Array.from({ length: 10 }, (_, i) => ({
    transport: new MockMessageTransport(`User${i}`),
    hook: null as any,
  }));
  
  // Render all hooks
  users.forEach(user => {
    const { result } = renderHook(() => useGameChat({
      gameId: 'game-123',
      viewerToken: `token-${user.transport}`,
      transport: user.transport,
    }));
    user.hook = result;
  });
  
  // Wait for all to connect
  await waitFor(() => {
    users.forEach(user => {
      expect(user.hook.current.isConnected).toBe(true);
    });
  });
  
  // User 0 sends message
  await act(async () => {
    await users[0].hook.current.sendMessage('Hello everyone!');
  });
  
  // All 10 users receive it
  await waitFor(() => {
    users.forEach(user => {
      expect(user.hook.current.messages).toHaveLength(1);
    });
  });
});
```

---

## Test Helpers

### Reset State Between Tests

```typescript
beforeEach(() => {
  MockMessageTransport.reset();
});
```

### Simulate Network Latency

```typescript
// Add 50ms delay to all operations
MockMessageTransport.setLatency(50);

// Your test code here

// Reset to instant
MockMessageTransport.setLatency(0);
```

### Simulate Disconnect

```typescript
const transport = new MockMessageTransport('Alice');
await transport.connect('game-123', 'token');

// Simulate connection loss
transport.simulateDisconnect();

await waitFor(() => {
  expect(result.current.isConnected).toBe(false);
});
```

### Simulate Error

```typescript
transport.simulateError('Connection timeout');

await waitFor(() => {
  expect(result.current.error).toBe('Connection timeout');
});
```

### Get Metrics

```typescript
// How many messages in a game?
const count = MockMessageTransport.getMessageCount('game-123');

// How many users connected?
const connected = MockMessageTransport.getConnectedCount('game-123');
```

---

## Integration Testing

Integration tests combine multiple units (hook + transport + component) to test real workflows.

### Example: Late Joiner

```typescript
it('should show previous messages to late joiners', async () => {
  const alice = new MockMessageTransport('Alice');
  
  const { result: aliceHook } = renderHook(() => useGameChat({
    gameId: 'game-123',
    viewerToken: 'alice-token',
    transport: alice,
  }));
  
  await waitFor(() => {
    expect(aliceHook.current.isConnected).toBe(true);
  });
  
  // Alice sends 3 messages
  await act(async () => {
    await aliceHook.current.sendMessage('First');
    await aliceHook.current.sendMessage('Second');
    await aliceHook.current.sendMessage('Third');
  });
  
  // Bob joins late
  const bob = new MockMessageTransport('Bob');
  const { result: bobHook } = renderHook(() => useGameChat({
    gameId: 'game-123',
    viewerToken: 'bob-token',
    transport: bob,
  }));
  
  // Bob should see all 3 messages in snapshot
  await waitFor(() => {
    expect(bobHook.current.messages).toHaveLength(3);
  });
  
  // Newest first
  expect(bobHook.current.messages[0].message).toBe('Third');
});
```

---

## E2E Testing (Existing)

E2E tests use real browsers and SSE connections. Keep them for smoke testing, but use unit/integration tests for the majority of scenarios.

```typescript
// apps/web/__tests__/e2e/game-chat.spec.ts
test('two viewers can have a full conversation', async ({ browser }) => {
  const contextAlice = await browser.newContext();
  const contextBob = await browser.newContext();
  
  // ... full browser test with real SSE
});
```

**When to use E2E:**
- Smoke tests in production
- Visual regression
- Browser-specific issues
- Full end-to-end validation

**When to use Unit/Integration:**
- Business logic (90% of tests)
- Multi-user scenarios
- Edge cases
- Rapid iteration

---

## Production Usage (No Changes Required)

The abstraction is **backward compatible**. Existing code continues to work without modifications:

```typescript
// Production code (unchanged)
const chat = useGameChat({
  gameId,
  viewerToken: viewer.token,
  enabled: viewer.isUnlocked,
  // No transport specified → uses SSEMessageTransport automatically
});

<GameChatPanel chat={chat} />
```

---

## Performance Comparison

| Test Type | Speed | Network | Browser | Use Case |
|-----------|-------|---------|---------|----------|
| **Unit (Mock)** | 5ms | ❌ | ❌ | Business logic, multi-user |
| **Integration (Mock)** | 50ms | ❌ | ❌ | Complex workflows |
| **E2E (Real SSE)** | 5000ms | ✅ | ✅ | Smoke tests, visual |

**Result**: 100x faster tests for the majority of scenarios.

---

## Best Practices

1. **Always reset state**: Call `MockMessageTransport.reset()` in `beforeEach`
2. **Use `act()` for actions**: Wrap `sendMessage()` in `act()` for React state updates
3. **Use `waitFor()` for assertions**: Async state updates need `waitFor()`
4. **Test business logic with mocks**: Reserve E2E for critical paths only
5. **Keep E2E tests as smoke tests**: They catch regressions, not edge cases

---

## Troubleshooting

### Issue: Tests fail with "not connected"

**Solution**: Wait for connection before sending messages:

```typescript
await waitFor(() => {
  expect(result.current.isConnected).toBe(true);
});
```

### Issue: Messages not appearing

**Solution**: Check you're using the same `gameId` for all users:

```typescript
// ✅ CORRECT
await alice.connect('game-123', 'token1');
await bob.connect('game-123', 'token2');

// ❌ WRONG (different games)
await alice.connect('game-1', 'token1');
await bob.connect('game-2', 'token2');
```

### Issue: Flaky test results

**Solution**: Add proper waits and reset state:

```typescript
beforeEach(() => {
  MockMessageTransport.reset(); // Critical!
});

await waitFor(() => {
  expect(condition).toBe(true);
});
```

---

## Summary

✅ **Use `MockMessageTransport`** for fast, deterministic tests  
✅ **Inject transport via DI** for unit/integration tests  
✅ **Keep E2E tests** as smoke tests for critical paths  
✅ **No changes needed** in production code (backward compatible)  
✅ **100x faster** test execution for multi-user scenarios  

For examples, see:
- `/apps/web/lib/chat/__tests__/MockMessageTransport.test.ts`
- `/apps/web/hooks/__tests__/useGameChat.test.tsx`
- `/apps/web/__tests__/integration/multi-user-chat.test.tsx`

