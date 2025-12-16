# Quick Start: RTMP Streaming Setup

## For External Platforms (Veo, Pixellot, etc.)

### Step 1: Get Your RTMP Credentials

**Option A: Create New Stream**
```bash
curl -X POST http://localhost:3001/api/owners/me/games/{GAME_ID}/streams/mux \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Option B: Get Existing Credentials**
```bash
curl http://localhost:3001/api/owners/me/games/{GAME_ID}/streams/credentials \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response will include:**
```json
{
  "rtmpPublishUrl": "rtmp://global-live.mux.com:443/app/abc123xyz789",
  "streamKey": "abc123xyz789",
  "playbackId": "xyz789abc123"
}
```

---

### Step 2: Configure Your Streaming Platform

Based on your screenshot, here's what to enter:

#### **RTMP URL Field:**
```
rtmp://global-live.mux.com:443/app
```

#### **Stream Key Field:**
```
abc123xyz789
```
(Use the `streamKey` from the API response)

#### **Settings:**
- ✅ Set as default (optional)
- ✅ Accept terms and conditions
- ⚠️ Request stream key when starting live stream: **OFF** (we provide it manually)

---

### Step 3: Start Streaming

1. Start your broadcast from the camera/platform
2. The video will be relayed through Mux
3. Viewers can watch at: `http://localhost:3000/poc/stream-viewer`

---

## Alternative: One-Line RTMP URL

Some platforms accept a single RTMP URL with the stream key included:

```
rtmp://global-live.mux.com:443/app/abc123xyz789
```

Use this if your platform has a single "RTMP URL" field.

---

## Viewing the Stream

### HLS Playback URL:
```
https://stream.mux.com/{PLAYBACK_ID}.m3u8
```

### With Signed Token (for protected streams):
```
https://stream.mux.com/{PLAYBACK_ID}.m3u8?token={JWT_TOKEN}
```

---

## Testing Checklist

- [ ] RTMP URL entered correctly
- [ ] Stream key matches API response
- [ ] Terms accepted
- [ ] Stream started
- [ ] Video visible in POC viewer
- [ ] Audio working
- [ ] No buffering/lag

---

## Need Help?

See the full [Streaming Setup Guide](./STREAMING_SETUP_GUIDE.md) for troubleshooting and advanced configuration.
