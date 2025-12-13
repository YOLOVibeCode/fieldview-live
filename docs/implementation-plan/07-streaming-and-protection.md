# Streaming & Protection

## Overview

FieldView.Live supports monetizing "any media stream" through multiple stream source types, with varying levels of protection against unauthorized access.

**Stream Source Types**:
1. **Mux-managed** (preferred): Strong protection
2. **BYO RTMP**: Routes to Mux, strong protection
3. **BYO HLS**: Moderate protection (depends on proxy/signing)
4. **External embed**: Best-effort protection (YouTube/Twitch/Vimeo)

## Protection Guarantees

### Strong Protection (Mux-managed, BYO RTMP)

**Mechanisms**:
- Entitlement token validation required
- Tokenized playback URLs (short-lived, signed)
- No permanent stream URLs exposed
- Token expiration enforced

**Implementation**:
- Mux signed URLs with expiration
- Token validation middleware
- Playback URLs generated on-demand

### Moderate Protection (BYO HLS)

**Mechanisms**:
- Entitlement token validation required
- Tokenized manifest endpoint (proxy/sign)
- Upstream origin may be public (depends on owner setup)

**Implementation**:
- Proxy HLS manifest through FieldView API
- Add token validation to manifest endpoint
- Owner guidance: use private CDN/origin

**Limitations**:
- If owner's HLS URL is public, rivals could access directly
- Protection depends on owner's infrastructure

### Best-Effort Protection (External Embed)

**Mechanisms**:
- Entitlement token validation on watch page
- Gate access to embed iframe
- Cannot prevent access if external link is shared

**Implementation**:
- Watch page validates token before rendering embed
- Owner guidance: use unlisted/private streams
- UI warning about protection limits

**Limitations**:
- Cannot prevent rivals from accessing external platform directly
- Protection limited to FieldView watch page gate

## Stream Source Configuration

### Mux-Managed Stream

**Owner Flow**:
1. Owner creates game
2. Selects "Mux-managed" stream source
3. System creates Mux live stream or asset
4. Stores `muxAssetId` and `muxPlaybackId`

**API Implementation**:
```typescript
// apps/api/src/services/StreamingService.ts
async function createMuxStream(gameId: string): Promise<MuxStreamConfig> {
  // Create Mux live stream
  const muxStream = await muxClient.liveStreams.create({
    playback_policy: 'signed', // Signed URLs required
  });
  
  // Store in database
  await streamSourceRepository.create({
    gameId,
    type: 'mux_managed',
    muxAssetId: muxStream.id,
    muxPlaybackId: muxStream.playback_ids[0].id,
    protectionLevel: 'strong',
  });
  
  return {
    rtmpPublishUrl: muxStream.stream_key,
    playbackId: muxStream.playback_ids[0].id,
  };
}
```

**Watch Bootstrap**:
```typescript
// apps/api/src/routes/public.ts
app.get('/api/public/watch/:token', async (req, res) => {
  const entitlement = await entitlementService.validateToken(req.params.token);
  
  const streamSource = await streamingService.getStreamSource(entitlement.purchase.gameId);
  
  if (streamSource.type === 'mux_managed') {
    // Generate signed playback URL
    const signedUrl = muxClient.playback.generateSignedUrl(
      streamSource.muxPlaybackId,
      { expiresIn: '2h' }
    );
    
    return res.json({
      streamUrl: signedUrl,
      playerType: 'hls',
      protectionLevel: 'strong',
    });
  }
});
```

### BYO RTMP

**Owner Flow**:
1. Owner creates game
2. Selects "BYO RTMP" stream source
3. Provides RTMP publish URL (or system generates)
4. System routes RTMP to Mux
5. Stores RTMP config and Mux playback ID

**API Implementation**:
```typescript
async function configureByoRtmp(gameId: string, publishUrl: string): Promise<RtmpConfig> {
  // Create Mux live stream for RTMP ingest
  const muxStream = await muxClient.liveStreams.create({
    playback_policy: 'signed',
  });
  
  // Store RTMP config
  await streamSourceRepository.create({
    gameId,
    type: 'byo_rtmp',
    rtmpPublishUrl: publishUrl,
    rtmpStreamKey: muxStream.stream_key, // Encrypted
    muxPlaybackId: muxStream.playback_ids[0].id,
    protectionLevel: 'strong',
  });
  
  return {
    rtmpUrl: muxStream.rtmp_ingest_url,
    streamKey: muxStream.stream_key,
  };
}
```

**Protection**: Same as Mux-managed (strong).

### BYO HLS

**Owner Flow**:
1. Owner creates game
2. Selects "BYO HLS" stream source
3. Provides HLS manifest URL
4. System stores URL and implements tokenized manifest endpoint

**API Implementation**:
```typescript
async function configureByoHls(gameId: string, manifestUrl: string): Promise<void> {
  await streamSourceRepository.create({
    gameId,
    type: 'byo_hls',
    hlsManifestUrl: manifestUrl,
    protectionLevel: 'moderate',
  });
}
```

**Tokenized Manifest Endpoint**:
```typescript
// apps/api/src/routes/public.ts
app.get('/api/public/watch/:token/manifest.m3u8', async (req, res) => {
  // Validate token
  const entitlement = await entitlementService.validateToken(req.params.token);
  
  const streamSource = await streamingService.getStreamSource(entitlement.purchase.gameId);
  
  if (streamSource.type !== 'byo_hls') {
    return res.status(400).json({ error: 'Invalid stream source type' });
  }
  
  // Proxy/fetch HLS manifest
  const manifest = await fetch(streamSource.hlsManifestUrl);
  const manifestText = await manifest.text();
  
  // Optionally: rewrite segment URLs to proxy through FieldView
  // For now, return as-is (owner responsible for private origin)
  
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  res.send(manifestText);
});
```

**Protection**: Moderate (depends on owner's origin being private).

### External Embed

**Owner Flow**:
1. Owner creates game
2. Selects "External embed" stream source
3. Provides embed URL (YouTube/Twitch/Vimeo)
4. System stores URL and provider type

**API Implementation**:
```typescript
async function configureExternalEmbed(
  gameId: string,
  embedUrl: string,
  provider: 'youtube' | 'twitch' | 'vimeo' | 'other'
): Promise<void> {
  await streamSourceRepository.create({
    gameId,
    type: 'external_embed',
    externalEmbedUrl: embedUrl,
    externalProvider: provider,
    protectionLevel: 'best_effort',
  });
}
```

**Watch Page Implementation**:
```typescript
// apps/web/app/(public)/watch/[token]/page.tsx
export default async function WatchPage({ params }: { params: { token: string } }) {
  const bootstrap = await fetchWatchBootstrap(params.token);
  
  if (bootstrap.streamSource.type === 'external_embed') {
    return (
      <div>
        <Alert variant="warning">
          <AlertTitle>Limited Protection</AlertTitle>
          <AlertDescription>
            External embeds have limited protection. Ensure your stream is private/unlisted
            on the external platform to prevent unauthorized access.
          </AlertDescription>
        </Alert>
        <EmbedPlayer embedUrl={bootstrap.streamSource.externalEmbedUrl} />
      </div>
    );
  }
  
  // ... HLS player
}
```

**Protection**: Best-effort (gate at FieldView watch page only).

## Owner Guidance & Warnings

### UI Warnings

**When configuring BYO HLS**:
```
⚠️ Protection Level: Moderate
Your HLS stream will be gated by FieldView, but if your manifest URL is publicly accessible,
unauthorized users may access it directly. We recommend using a private CDN/origin.
```

**When configuring External Embed**:
```
⚠️ Protection Level: Best-Effort
External embeds are gated at FieldView, but we cannot prevent access if the external link
is shared. Please ensure your stream is set to "unlisted" or "private" on the external platform.
```

### Admin Warnings

SuperAdmin can see protection level per game and warn owners:
- Games with `best_effort` protection flagged
- Recommendations to upgrade to Mux-managed for stronger protection

## Stream State Management

### States

- **not_started**: Game not yet started, stream not available
- **live**: Stream is live and available
- **ended**: Stream has ended
- **unavailable**: Stream error/unavailable

### Implementation

```typescript
// apps/api/src/services/StreamingService.ts
export async function getStreamState(gameId: string): Promise<StreamState> {
  const game = await gameRepository.getById(gameId);
  const streamSource = await streamSourceRepository.getByGameId(gameId);
  
  if (!streamSource) {
    return 'unavailable';
  }
  
  const now = new Date();
  
  if (now < game.startsAt) {
    return 'not_started';
  }
  
  if (game.endsAt && now > game.endsAt) {
    return 'ended';
  }
  
  // Check stream availability (Mux status, HLS availability, etc.)
  const isAvailable = await checkStreamAvailability(streamSource);
  
  return isAvailable ? 'live' : 'unavailable';
}
```

## Acceptance Criteria

- [ ] Mux-managed streams created successfully
- [ ] BYO RTMP routes to Mux
- [ ] BYO HLS manifest proxied/tokenized
- [ ] External embeds gated at watch page
- [ ] Protection levels assigned correctly
- [ ] Owner warnings displayed for moderate/best-effort
- [ ] Stream states managed correctly
- [ ] Watch bootstrap returns correct stream URL/config
- [ ] 100% test coverage

## Next Steps

- Proceed to [08-payments-and-ledger.md](./08-payments-and-ledger.md) for Square integration
