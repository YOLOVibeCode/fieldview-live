# Direct Stream Chat + Viewer Unlock - Implementation Progress

## ✅ Completed (Phase A-B)

### Database Schema
- ✅ Added `firstName`, `lastName` to `ViewerIdentity`
- ✅ Created `GameChatMessage` model with cascade delete on `gameId`
- ✅ Migrations applied locally (`20260106041438_add_viewer_names_and_game_chat`)

### Authentication & Authorization
- ✅ Viewer JWT utilities (`lib/viewer-jwt.ts`)
  - `generateViewerToken` (24h expiry, scoped to gameId)
  - `verifyViewerToken`
  - `formatDisplayName` (privacy: "First L.")
- ✅ Viewer auth middleware (`middleware/viewer-auth.ts`)
  - `requireViewerAuth`
  - `requireGameMatch`
- ✅ Unit tests passing (12/12)

### API Endpoints
- ✅ `GET /api/direct/:slug/bootstrap` - Returns gameId + stream metadata
- ✅ `POST /api/public/direct/:slug/viewer/unlock` - Upsert viewer + issue token
- ✅ Integration tests passing (7/7)

### Repository Layer (ISP)
- ✅ `IChatReader` + `IChatWriter` interfaces
- ✅ `ChatRepository` implementation
- ✅ Unit tests for ChatRepository

---

## 🚧 Remaining (Phase C-F) - Implementation Patterns

### Phase C: Chat Endpoints + Realtime

#### 1. Pubsub Abstraction (`lib/chat-pubsub.ts`)
```typescript
export interface IChatPubSub {
  publish(gameId: string, message: GameChatMessage): Promise<void>;
  subscribe(gameId: string, handler: (msg: GameChatMessage) => void): () => void;
}

// In-memory POC (single instance)
class InMemoryChatPubSub implements IChatPubSub {
  private handlers = new Map<string, Set<(msg: GameChatMessage) => void>>();
  
  async publish(gameId: string, message: GameChatMessage): Promise<void> {
    const handlers = this.handlers.get(gameId) || new Set();
    handlers.forEach(h => h(message));
  }
  
  subscribe(gameId: string, handler: (msg: GameChatMessage) => void): () => void {
    if (!this.handlers.has(gameId)) {
      this.handlers.set(gameId, new Set());
    }
    this.handlers.get(gameId)!.add(handler);
    return () => this.handlers.get(gameId)?.delete(handler);
  }
}

// Redis-backed (production)
class RedisChatPubSub implements IChatPubSub {
  // ... use ioredis pub/sub
}
```

#### 2. ChatService (`services/ChatService.ts`)
```typescript
export class ChatService implements IChatService {
  constructor(
    private chatRepo: IChatReader & IChatWriter,
    private pubsub: IChatPubSub
  ) {}

  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    // Validate message length (1-240 chars)
    if (input.message.trim().length < 1 || input.message.length > 240) {
      throw new BadRequestError('Message must be 1-240 characters');
    }

    // Create message
    const message = await this.chatRepo.createMessage({
      gameId: input.gameId,
      viewerId: input.viewerId,
      displayName: input.displayName,
      message: input.message.trim(),
    });

    // Broadcast to subscribers
    await this.pubsub.publish(input.gameId, message);

    return { message, broadcastNeeded: true };
  }

  async getGameSnapshot(gameId: string, limit = 50): Promise<ChatSnapshot> {
    const messages = await this.chatRepo.getRecentMessages(gameId, limit);
    const total = await this.chatRepo.countMessages(gameId);
    return { gameId, messages, total };
  }
}
```

#### 3. POST /games/:gameId/chat/messages (`routes/public.chat.ts`)
```typescript
router.post(
  '/games/:gameId/chat/messages',
  requireViewerAuth,
  requireGameMatch,
  validateRequest({ body: SendMessageSchema }),
  async (req: ViewerAuthRequest, res, next) => {
    const { message } = req.body;
    const gameId = requireGameId(req);
    const viewerId = requireViewerId(req);
    const displayName = req.displayName!;

    const result = await chatService.sendMessage({
      gameId,
      viewerId,
      displayName,
      message,
    });

    res.json(result.message);
  }
);
```

#### 4. SSE Stream (`routes/public.chat.ts`)
```typescript
router.get(
  '/games/:gameId/chat/stream',
  requireViewerAuth,
  requireGameMatch,
  async (req: ViewerAuthRequest, res) => {
    const gameId = requireGameId(req);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send snapshot
    const snapshot = await chatService.getGameSnapshot(gameId, 50);
    res.write(`event: chat_snapshot\n`);
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);

    // Subscribe to new messages
    const unsubscribe = pubsub.subscribe(gameId, (msg) => {
      res.write(`event: chat_message\n`);
      res.write(`data: ${JSON.stringify(msg)}\n\n`);
    });

    // Cleanup on disconnect
    req.on('close', unsubscribe);
  }
);
```

---

### Phase D: Frontend Components

#### 1. ViewerUnlockForm (`components/direct-stream/ViewerUnlockForm.tsx`)
```typescript
export function ViewerUnlockForm({ slug, onUnlock }: Props) {
  const form = useForm({
    resolver: zodResolver(unlockSchema),
    defaultValues: getSavedFormData(), // localStorage
  });

  useEffect(() => {
    const subscription = form.watch((data) => {
      localStorage.setItem('direct_viewer_identity', JSON.stringify(data));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (data) => {
    const result = await apiClient.unlockDirectStream(slug, data);
    localStorage.setItem('viewer_token', result.viewerToken);
    onUnlock(result);
  };

  return (
    <form data-testid="form-viewer-unlock" onSubmit={form.handleSubmit(onSubmit)}>
      <input data-testid="input-email" {...form.register('email')} />
      <input data-testid="input-first-name" {...form.register('firstName')} />
      <input data-testid="input-last-name" {...form.register('lastName')} />
      <button data-testid="btn-unlock-stream" type="submit">Unlock Stream</button>
    </form>
  );
}
```

#### 2. ChatPanel (`components/direct-stream/ChatPanel.tsx`)
```typescript
export function ChatPanel({ gameId, viewerToken }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    // Connect to SSE stream
    const eventSource = new EventSource(
      `/api/public/games/${gameId}/chat/stream`,
      { headers: { Authorization: `Bearer ${viewerToken}` } }
    );

    eventSource.addEventListener('chat_snapshot', (e) => {
      const snapshot = JSON.parse(e.data);
      setMessages(snapshot.messages); // Already newest-first from API
    });

    eventSource.addEventListener('chat_message', (e) => {
      const msg = JSON.parse(e.data);
      setMessages(prev => [msg, ...prev]); // Insert at top
    });

    return () => eventSource.close();
  }, [gameId, viewerToken]);

  const sendMessage = async () => {
    await apiClient.sendChatMessage(gameId, viewerToken, { message: input });
    setInput('');
  };

  return (
    <div data-testid="panel-chat">
      <div data-testid="list-chat-messages">
        {messages.map(msg => (
          <div key={msg.id} data-testid={`chat-msg-${msg.id}`}>
            <strong>{msg.displayName}</strong>: {msg.message}
          </div>
        ))}
      </div>
      <input
        data-testid="input-chat-message"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        maxLength={240}
      />
      <button data-testid="btn-send-message" onClick={sendMessage}>Send</button>
    </div>
  );
}
```

#### 3. ChatOverlay (`components/direct-stream/ChatOverlay.tsx`)
```typescript
export function ChatOverlay({ messages, onSide }: Props) {
  const [side, setSide] = useState<'left' | 'right'>(
    () => (localStorage.getItem('direct_chat_overlay_side') as 'left' | 'right') || 'right'
  );

  const toggleSide = () => {
    const newSide = side === 'left' ? 'right' : 'left';
    setSide(newSide);
    localStorage.setItem('direct_chat_overlay_side', newSide);
  };

  return (
    <div
      data-testid="overlay-chat"
      className={`absolute top-4 ${side === 'left' ? 'left-4' : 'right-4'} 
                  bg-black/60 text-white p-4 rounded max-w-sm`}
    >
      <button data-testid="btn-chat-side-left" onClick={toggleSide}>
        {side === 'left' ? '→' : '←'}
      </button>
      <div className="space-y-2">
        {messages.slice(0, 5).map(msg => (
          <div key={msg.id}>{msg.displayName}: {msg.message}</div>
        ))}
      </div>
    </div>
  );
}
```

---

### Phase E: E2E Testing

#### Playwright Test (`e2e/direct-chat.spec.ts`)
```typescript
test('two viewers can chat in real-time', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // Viewer 1: Unlock
  await page1.goto('http://localhost:4300/direct/tchs');
  await page1.fill('[data-testid="input-email"]', 'viewer1@test.com');
  await page1.fill('[data-testid="input-first-name"]', 'Alice');
  await page1.fill('[data-testid="input-last-name"]', 'Smith');
  await page1.click('[data-testid="btn-unlock-stream"]');
  await page1.waitForSelector('[data-testid="panel-chat"]');

  // Viewer 2: Unlock
  await page2.goto('http://localhost:4300/direct/tchs');
  await page2.fill('[data-testid="input-email"]', 'viewer2@test.com');
  await page2.fill('[data-testid="input-first-name"]', 'Bob');
  await page2.fill('[data-testid="input-last-name"]', 'Jones');
  await page2.click('[data-testid="btn-unlock-stream"]');
  await page2.waitForSelector('[data-testid="panel-chat"]');

  // Viewer 1 sends message
  await page1.fill('[data-testid="input-chat-message"]', 'Hello from Alice!');
  await page1.click('[data-testid="btn-send-message"]');

  // Viewer 2 sees message
  await page2.waitForSelector('text=Alice S.: Hello from Alice!');
  const messageVisible = await page2.isVisible('text=Alice S.: Hello from Alice!');
  expect(messageVisible).toBe(true);
});
```

---

### Phase F: Production Deployment

1. **Apply migrations to production**:
```bash
railway run --service api "npx prisma migrate deploy"
```

2. **Test cascade delete**:
```sql
-- Create test game with messages
-- Delete game
-- Verify messages deleted
SELECT COUNT(*) FROM "GameChatMessage" WHERE "gameId" = '<deleted-game-id>';
-- Should return 0
```

3. **Environment variables**:
```env
DIRECT_CHAT_ENABLED=true
CHAT_RATE_LIMIT_PER_MINUTE=30
```

---

## Summary

**Completed**: 8/18 todos (Phases A-B fully tested)
**Remaining**: Architecture + patterns provided for Phases C-F

All interfaces follow ISP, TDD established for critical paths, E2E spec ready for execution.

ROLE: engineer STRICT=false

