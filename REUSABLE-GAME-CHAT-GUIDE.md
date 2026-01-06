# Reusable Game Chat - Implementation Guide

## ✅ What's Been Built

A **game-agnostic, portable chat system** that works with ANY stream type:
- Watch links (`/watch/ORG/TEAM`)
- Direct streams (`/direct/slug`)
- Paid games (`/game/:gameId`)

**Architecture**: Clean separation, ISP compliance, minimal coupling.

---

## 📦 Reusable Components

### Frontend (React/Next.js)

#### 1. **`useGameChat` Hook** (`hooks/useGameChat.ts`)
```typescript
const chat = useGameChat({
  gameId: 'game-123',
  viewerToken: 'jwt-token',
  enabled: true,
});
// Returns: { messages, sendMessage, isConnected, error }
```

#### 2. **`GameChatPanel` Component** (`components/GameChatPanel.tsx`)
```typescript
<GameChatPanel chat={chat} className="h-96" />
```
- Auto-scrolling
- Character counter (1-240)
- Newest messages at top
- Mobile-responsive

#### 3. **`useViewerIdentity` Hook** (`hooks/useViewerIdentity.ts`)
```typescript
const viewer = useViewerIdentity({ gameId });
// Returns: { identity, token, isUnlocked, unlock, logout }
```

#### 4. **`ViewerUnlockForm` Component** (`components/ViewerUnlockForm.tsx`)
```typescript
<ViewerUnlockForm
  onUnlock={viewer.unlock}
  isLoading={viewer.isLoading}
  error={viewer.error}
/>
```

---

### Backend (Express)

#### 1. **Universal Unlock Endpoint**
```
POST /api/public/games/:gameId/viewer/unlock
Body: { email, firstName, lastName }
Returns: { viewerToken, viewer: { displayName }, gameId }
```

#### 2. **Chat Endpoints**
```
POST /api/public/games/:gameId/chat/messages
Headers: Authorization: Bearer <viewerToken>
Body: { message: "Hello!" }

GET /api/public/games/:gameId/chat/stream?token=<viewerToken>
Returns: SSE stream with events:
  - chat_snapshot (initial 50 messages)
  - chat_message (new messages)
```

#### 3. **Repositories & Services (ISP)**
- `ChatRepository` (IChatReader + IChatWriter)
- `ChatService` (validation + pubsub)
- `InMemoryChatPubSub` (single-instance POC, Redis-ready)

---

## 🎯 How to Add Chat to ANY Page

### Example: Add to existing `/watch/[org]/[team]` page

```tsx
'use client';

import { useGameChat } from '@/hooks/useGameChat';
import { useViewerIdentity } from '@/hooks/useViewerIdentity';
import { GameChatPanel } from '@/components/GameChatPanel';
import { ViewerUnlockForm } from '@/components/ViewerUnlockForm';

export default function WatchLinkPage() {
  const [gameId, setGameId] = useState<string | null>(null);
  
  // Load bootstrap to get gameId
  useEffect(() => {
    fetch(`/api/public/watch-links/${org}/${team}`)
      .then(r => r.json())
      .then(data => setGameId(data.gameId)); // Assume bootstrap returns gameId
  }, [org, team]);

  // Viewer unlock state
  const viewer = useViewerIdentity({ gameId });
  
  // Chat hook (only connects if unlocked)
  const chat = useGameChat({
    gameId,
    viewerToken: viewer.token,
    enabled: viewer.isUnlocked,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Video Player */}
      <div className="lg:col-span-2">
        <video ref={videoRef} controls />
      </div>

      {/* Chat Sidebar */}
      <div>
        {!viewer.isUnlocked ? (
          <ViewerUnlockForm
            onUnlock={viewer.unlock}
            isLoading={viewer.isLoading}
            error={viewer.error}
          />
        ) : (
          <GameChatPanel chat={chat} />
        )}
      </div>
    </div>
  );
}
```

---

## 🔧 Backend Integration Checklist

### 1. **Ensure Bootstrap Returns `gameId`**

All bootstrap endpoints must return a `gameId`:

```typescript
// Example: WatchLinkService.getPublicBootstrap
return {
  ...otherData,
  gameId: channel.gameId || null, // <-- REQUIRED
  chatEnabled: true,
};
```

### 2. **Link Channels to Games (if needed)**

If your `WatchChannel` doesn't have a direct `gameId`, create a placeholder:

```typescript
// On first bootstrap request, create a long-running "channel game"
const game = await prisma.game.create({
  data: {
    ownerAccountId: channel.ownerAccountId,
    title: `${org}/${team}`,
    homeTeam: team,
    awayTeam: 'TBD',
    startsAt: new Date(),
    priceCents: 0,
    currency: 'USD',
    keywordCode: `WATCH-${org}-${team}`,
    qrUrl: '',
    state: 'live',
  },
});
```

---

## 🧪 Testing

### Unit Tests
```bash
cd apps/api
pnpm vitest run ChatRepository.test
pnpm vitest run viewer-jwt.test
```

### Integration Tests
```bash
pnpm vitest run --config vitest.live.config.ts public.game-viewer.test
```

### E2E (Playwright)
```typescript
test('chat works across two viewers', async ({ browser }) => {
  const page1 = await browser.newPage();
  const page2 = await browser.newPage();

  // Viewer 1: unlock + send message
  await page1.goto('/watch/ORG/TEAM');
  await page1.fill('[data-testid="input-email"]', 'alice@test.com');
  await page1.fill('[data-testid="input-first-name"]', 'Alice');
  await page1.fill('[data-testid="input-last-name"]', 'Smith');
  await page1.click('[data-testid="btn-unlock-stream"]');
  await page1.fill('[data-testid="input-chat-message"]', 'Hello!');
  await page1.click('[data-testid="btn-send-message"]');

  // Viewer 2: unlock + see message
  await page2.goto('/watch/ORG/TEAM');
  await page2.fill('[data-testid="input-email"]', 'bob@test.com');
  // ... unlock
  await page2.waitForSelector('text=Alice S.: Hello!');
});
```

---

## 🚀 Deployment Steps

### 1. Apply Migrations
```bash
npx prisma migrate deploy
```

### 2. Environment Variables
```env
# Already set, no new vars needed!
```

### 3. Test on Railway
```bash
curl https://api.fieldview.live/api/public/games/<GAME_ID>/viewer/unlock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","firstName":"Test","lastName":"User"}'
```

---

## 📊 Owner Chat Toggle (Optional)

Add a `chatEnabled` field to `Game` or `WatchChannel`:

```prisma
model WatchChannel {
  // ... existing fields
  chatEnabled Boolean @default(true)
}
```

Then in bootstrap:
```typescript
chatEnabled: channel.chatEnabled && gameId !== null
```

Frontend conditionally renders chat:
```typescript
{bootstrap.chatEnabled && <GameChatPanel ... />}
```

---

## 🎨 Fullscreen Overlay (Future)

Create `GameChatOverlay.tsx` (same hook, different UI):
```typescript
<GameChatOverlay
  chat={chat}
  side="right"
  onToggleSide={() => setSide(side === 'left' ? 'right' : 'left')}
  className="absolute top-4 right-4 bg-black/70 text-white p-4 rounded"
/>
```

---

## Summary

**✅ Portable**: Zero coupling to direct streams  
**✅ Reusable**: Works with ANY game via `gameId`  
**✅ Clean**: ISP-compliant, hooks-based, testable  
**✅ Ready**: All backend routes + frontend components complete  

**Next Step**: Add chat to your `/watch` pages using the example above!

ROLE: engineer STRICT=false

