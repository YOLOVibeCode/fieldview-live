# ✅ Setup Complete: RTMP Streaming & Mobile POC

## What Was Created

### 1. 📱 Mobile-Optimized POC Viewer
**Location:** `apps/web/app/poc/stream-viewer/page.tsx`

A proof-of-concept video player that:
- Uses full viewport on mobile devices (maximum viewing space)
- Supports HLS playback via Mux
- Works with RTMP stream relays
- Includes native fullscreen controls
- Optimized for touch interfaces

**Access:** http://localhost:3000/poc/stream-viewer

---

### 2. 🔧 API Endpoint for RTMP Credentials
**Added:** `GET /api/owners/me/games/:gameId/streams/credentials`

Retrieve existing RTMP credentials without creating a new stream:

```bash
curl http://localhost:3001/api/owners/me/games/GAME_ID/streams/credentials \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Returns:
- RTMP publish URL
- Stream key
- Playback ID
- Mux stream ID

---

### 3. 📚 Comprehensive Documentation

#### Main Guides
- **[README_STREAMING.md](./README_STREAMING.md)** - Quick start overview
- **[docs/STREAMING_SETUP_GUIDE.md](./docs/STREAMING_SETUP_GUIDE.md)** - Complete setup reference
- **[docs/QUICK_START_RTMP.md](./docs/QUICK_START_RTMP.md)** - Fast setup guide
- **[docs/EXAMPLE_VEO_SETUP.md](./docs/EXAMPLE_VEO_SETUP.md)** - Veo-specific instructions

#### Helper Script
- **[scripts/get-rtmp-credentials.sh](./scripts/get-rtmp-credentials.sh)** - CLI tool to fetch credentials

---

## How to Use (Quick Start)

### Step 1: Get RTMP Credentials

**Option A - Easy Script:**
```bash
./scripts/get-rtmp-credentials.sh YOUR_GAME_ID YOUR_OWNER_TOKEN
```

**Option B - Direct API Call:**
```bash
# Create new stream
curl -X POST http://localhost:3001/api/owners/me/games/GAME_ID/streams/mux \
  -H "Authorization: Bearer YOUR_TOKEN"

# Or get existing credentials
curl http://localhost:3001/api/owners/me/games/GAME_ID/streams/credentials \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📹 RTMP Streaming Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RTMP URL:
rtmp://global-live.mux.com:443/app

Stream Key:
abc123xyz789
```

---

### Step 2: Configure Your Platform (e.g., Veo)

Based on your screenshot, enter these values:

```
┌─────────────────────────────────────────┐
│ RTMP URL                                │
│ rtmp://global-live.mux.com:443/app      │
│                                         │
│ ☐ Request stream key when starting     │
│                                         │
│ Stream key                              │
│ abc123xyz789                            │
│                                         │
│ ☑ Set as default                       │
│ ☑ Accept terms and conditions          │
└─────────────────────────────────────────┘
```

**Important:** 
- ⚠️ Don't check "Request stream key when starting" - leave it unchecked
- ✅ Enter your stream key in the "Stream key" field

---

### Step 3: Start Streaming

1. Start your broadcast (camera, OBS, etc.)
2. The stream will automatically relay through Mux
3. View it at: http://localhost:3000/poc/stream-viewer

---

## Testing Checklist

- [ ] Mux credentials configured in `.env` (MUX_TOKEN_ID, MUX_TOKEN_SECRET)
- [ ] API server running (`cd apps/api && pnpm dev`)
- [ ] Web app running (`cd apps/web && pnpm dev`)
- [ ] Game created in database
- [ ] Stream credentials retrieved via script or API
- [ ] Streaming platform configured with RTMP URL and key
- [ ] Broadcast started
- [ ] POC viewer shows live video
- [ ] Audio working
- [ ] No excessive buffering
- [ ] Mobile view works correctly

---

## File Changes Summary

### New Files Created
```
apps/web/app/poc/stream-viewer/page.tsx      # POC viewer page
docs/STREAMING_SETUP_GUIDE.md                # Complete setup guide
docs/QUICK_START_RTMP.md                     # Quick reference
docs/EXAMPLE_VEO_SETUP.md                    # Veo-specific guide
scripts/get-rtmp-credentials.sh              # CLI helper script
README_STREAMING.md                          # Streaming overview
SETUP_SUMMARY.md                             # This file
```

### Modified Files
```
apps/api/src/routes/owners.streams.ts        # Added GET credentials endpoint
README.md                                     # Added streaming docs links
```

---

## API Endpoints Available

### Stream Management
```
POST   /api/owners/me/games/:gameId/streams/mux
  → Create new Mux-managed stream

GET    /api/owners/me/games/:gameId/streams/credentials
  → Get existing stream credentials

POST   /api/owners/me/games/:gameId/streams/byo-rtmp
  → Configure bring-your-own RTMP

POST   /api/owners/me/games/:gameId/streams/byo-hls
  → Configure bring-your-own HLS

POST   /api/owners/me/games/:gameId/streams/external-embed
  → Configure external embed (YouTube, Twitch)
```

All require `Authorization: Bearer {OWNER_TOKEN}` header.

---

## Architecture Overview

```
┌─────────────────┐
│  Camera/OBS     │ RTMP
│  (Broadcaster)  ├────────┐
└─────────────────┘        │
                           ▼
                  ┌────────────────┐
                  │  Mux (Relay)   │
                  │  - Ingest RTMP │
                  │  - Convert HLS │
                  │  - Sign URLs   │
                  └────────┬───────┘
                           │ HLS
                           ▼
                  ┌────────────────┐
                  │  POC Viewer    │
                  │  - HLS.js      │
                  │  - Mobile UI   │
                  │  - Fullscreen  │
                  └────────────────┘
```

---

## Troubleshooting Quick Reference

### Can't connect to RTMP
✅ Check URL: `rtmp://global-live.mux.com:443/app`
✅ Verify stream key matches API response
✅ Ensure port 443 not blocked

### Stream connects but no video
✅ Wait 10-15 seconds for initialization
✅ Refresh POC viewer page
✅ Check stream is actively broadcasting
✅ Verify playback ID is correct

### Poor quality / buffering
✅ Increase bitrate (5-10 Mbps)
✅ Use wired connection
✅ Check upload bandwidth
✅ Lower resolution if needed

---

## Next Steps

1. **Production Integration**
   - Integrate with purchase system
   - Add access control checks
   - Implement watch token generation

2. **Enhanced Features**
   - DVR/replay functionality
   - Multi-bitrate streaming
   - Picture-in-picture
   - Quality selector

3. **Admin Dashboard**
   - Stream health monitoring
   - Viewer analytics
   - Real-time metrics

4. **Mobile Apps**
   - iOS/Android native apps
   - Push notifications
   - Offline viewing

---

## Support Resources

- **Documentation:** See files listed above
- **Mux Docs:** https://docs.mux.com/guides/video/stream-live
- **HLS.js Docs:** https://github.com/video-dev/hls.js/

---

## Example Usage Flow

```bash
# 1. Get credentials
./scripts/get-rtmp-credentials.sh game_123 token_abc

# Output:
# RTMP URL: rtmp://global-live.mux.com:443/app
# Stream Key: abc123xyz789
# Playback ID: xyz789abc123

# 2. Configure Veo/OBS with above values

# 3. Start streaming

# 4. Open POC viewer
# http://localhost:3000/poc/stream-viewer

# 5. Paste HLS URL:
# https://stream.mux.com/xyz789abc123.m3u8
```

---

**Everything is ready! 🎉**

Start by running the credentials script, configure your streaming platform, and test the POC viewer.

