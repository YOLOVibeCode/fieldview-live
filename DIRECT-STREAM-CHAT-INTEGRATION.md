# Direct Streams + Chat Integration

## Current Status

✅ **Reusable chat components are built and ready**
✅ **Backend APIs are live** (`/api/public/games/:gameId/...`)
✅ **Direct stream pages exist** but need chat integration

## Integration Steps for Direct Streams

### Step 1: Update Bootstrap Endpoint

The `/api/direct/:slug/bootstrap` endpoint already returns `gameId`. Just ensure it's being called:

```typescript
// In your direct stream page
const [bootstrap, setBootstrap] = useState<{
  slug: string;
  gameId: string | null;
  streamUrl: string | null;
  chatEnabled: boolean;
  title: string;
} | null>(null);

useEffect(() => {
  fetch(`${API_URL}/api/direct/${slug}/bootstrap`)
    .then(r => r.json())
    .then(data => setBootstrap(data));
}, [slug]);
```

### Step 2: Add Chat to Direct Stream Page

**Example: `/apps/web/app/direct/[slug]/page.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useGameChat } from '@/hooks/useGameChat';
import { useViewerIdentity } from '@/hooks/useViewerIdentity';
import { GameChatPanel } from '@/components/GameChatPanel';
import { ViewerUnlockForm } from '@/components/ViewerUnlockForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

interface Bootstrap {
  slug: string;
  gameId: string | null;
  streamUrl: string | null;
  chatEnabled: boolean;
  title: string;
}

export default function DirectStreamPage({ params }: { params: { slug: string } }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [status, setStatus] = useState<'loading' | 'playing' | 'offline' | 'error'>('loading');
  const slug = params.slug || '';

  // Load bootstrap (includes gameId)
  useEffect(() => {
    fetch(`${API_URL}/api/direct/${slug}/bootstrap`)
      .then((res) => res.json())
      .then((data) => {
        setBootstrap(data);
        if (data.streamUrl) {
          initPlayer(data.streamUrl);
        } else {
          setStatus('offline');
        }
      })
      .catch(() => setStatus('offline'));
  }, [slug]);

  // Viewer identity for chat
  const viewer = useViewerIdentity({ gameId: bootstrap?.gameId || null });

  // Chat hook
  const chat = useGameChat({
    gameId: bootstrap?.gameId || null,
    viewerToken: viewer.token,
    enabled: viewer.isUnlocked && bootstrap?.chatEnabled === true,
  });

  function initPlayer(url: string) {
    // ... your existing HLS player code ...
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full"
                controls
                playsInline
                data-testid="video-player"
              />
            </div>
          </div>

          {/* Chat Sidebar */}
          <div>
            {bootstrap?.chatEnabled && bootstrap.gameId && (
              <>
                {!viewer.isUnlocked ? (
                  <ViewerUnlockForm
                    onUnlock={viewer.unlock}
                    isLoading={viewer.isLoading}
                    error={viewer.error}
                    title="Join the Chat"
                    description="Enter your info to watch and chat"
                  />
                ) : (
                  <GameChatPanel chat={chat} className="h-[600px]" />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Step 3: Admin Panel Updates (Optional)

Update the admin edit panel to include gameId when updating stream URL:

```typescript
// When posting stream URL update
const response = await fetch(`${API_URL}/api/direct/${slug}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    streamUrl: inputUrl,
    gameId: existingGameId, // Optional: associate with existing game
    password: adminPassword,
  }),
});
```

---

## Quick Integration Checklist

For each direct stream page (`/direct/[slug]`, `/direct/tchs`, etc.):

- [ ] Import hooks: `useGameChat`, `useViewerIdentity`
- [ ] Import components: `GameChatPanel`, `ViewerUnlockForm`
- [ ] Call `/api/direct/:slug/bootstrap` to get `gameId`
- [ ] Add viewer unlock hook: `const viewer = useViewerIdentity({ gameId })`
- [ ] Add chat hook: `const chat = useGameChat({ gameId, viewerToken: viewer.token })`
- [ ] Render unlock form or chat panel based on `viewer.isUnlocked`

---

## Example: Minimal Integration (5 lines)

```tsx
// Add these imports
import { useGameChat } from '@/hooks/useGameChat';
import { useViewerIdentity } from '@/hooks/useViewerIdentity';
import { GameChatPanel } from '@/components/GameChatPanel';
import { ViewerUnlockForm } from '@/components/ViewerUnlockForm';

// In your component
const viewer = useViewerIdentity({ gameId: bootstrap?.gameId || null });
const chat = useGameChat({ gameId: bootstrap?.gameId || null, viewerToken: viewer.token, enabled: viewer.isUnlocked });

// In your JSX (add sidebar)
<div className="lg:col-span-1">
  {viewer.isUnlocked ? <GameChatPanel chat={chat} /> : <ViewerUnlockForm onUnlock={viewer.unlock} />}
</div>
```

---

## Testing Direct Stream Chat

### 1. Start Local Services
```bash
# Terminal 1: API
cd apps/api && pnpm dev

# Terminal 2: Web
cd apps/web && pnpm dev
```

### 2. Test Flow
1. Visit `http://localhost:4300/direct/tchs`
2. Enter email, first name, last name → Click "Unlock Stream"
3. Should see chat panel appear
4. Open in second browser/incognito
5. Unlock with different name
6. Send message from one → should appear in other

### 3. Verify API
```bash
# Get bootstrap
curl http://localhost:4301/api/direct/tchs/bootstrap
# Should return: { gameId, streamUrl, chatEnabled: true }

# Unlock viewer
curl -X POST http://localhost:4301/api/public/games/<GAME_ID>/viewer/unlock \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","firstName":"Test","lastName":"User"}'
# Should return: { viewerToken, viewer, gameId }
```

---

## Production Deployment

1. **Migrations are already applied** ✅
2. **Routes are already registered** ✅
3. **Components are already built** ✅

Just deploy and test the integration!

```bash
# Deploy to Railway
git add .
git commit -m "Add chat to direct streams"
git push origin main

# Railway auto-deploys
# Then test: https://fieldview.live/direct/tchs
```

---

## Benefits

- ✅ **No duplication**: Same chat code works everywhere
- ✅ **Consistent UX**: Same unlock flow across all streams
- ✅ **Easy rollout**: Add to pages incrementally
- ✅ **Zero downtime**: Old pages keep working
- ✅ **Mobile-ready**: Responsive out of the box

---

## Next Steps

1. Pick one direct page to integrate first (e.g., `/direct/[slug]/page.tsx`)
2. Add the 5-line integration pattern above
3. Test locally with two browsers
4. Deploy
5. Repeat for other direct pages

**Total time per page: ~5 minutes** ⚡

ROLE: engineer STRICT=false

