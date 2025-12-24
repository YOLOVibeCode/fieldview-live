# RTMP Streaming Setup Guide

This guide explains how to configure RTMP streaming to FieldView.live using Mux as the relay service.

## Overview

FieldView.live uses **Mux** to relay RTMP streams. When you set up streaming for a game:
1. Mux creates a live stream and provides RTMP ingest credentials
2. You configure your streaming source (camera, encoder, etc.) with these credentials
3. Viewers watch via HLS playback URLs (protected with signed tokens)

---

## Option 1: Mux-Managed Stream (Recommended)

This is the simplest option. Mux handles everything - you just stream to their RTMP endpoint.

### Step 1: Create a Mux Stream via API

**Endpoint:** `POST /api/owners/me/games/:gameId/streams/mux`

**Request:**
```bash
curl -X POST https://your-domain.com/api/owners/me/games/{GAME_ID}/streams/mux \
  -H "Authorization: Bearer YOUR_OWNER_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "rtmpPublishUrl": "rtmp://global-live.mux.com:443/app/YOUR_STREAM_KEY",
  "streamKey": "YOUR_STREAM_KEY",
  "playbackId": "PLAYBACK_ID",
  "muxStreamId": "STREAM_ID"
}
```

### Step 2: Configure Your Streaming Software

Using the response from Step 1, configure your streaming software:

#### **RTMP URL:** 
```
rtmp://global-live.mux.com:443/app
```

#### **Stream Key:**
```
YOUR_STREAM_KEY
```
(from the API response)

### Step 3: Configure External Platform (like Veo)

If you're using an external platform that can stream to custom RTMP destinations:

1. **Navigate to Stream Settings** in your platform (Veo, OBS, etc.)
2. **Add Streaming Destination**
3. **Enter RTMP URL:**
   ```
   rtmp://global-live.mux.com:443/app
   ```
4. **Enter Stream Key:** (from API response)
5. **Set as Default:** ✅ (optional)
6. **Accept Terms:** ✅
7. **Create Streaming Destination**

---

## Option 2: Bring Your Own RTMP Source

If you want to use a custom RTMP source (like an existing streaming server), but still relay through Mux for protection.

### Step 1: Configure BYO RTMP

**Endpoint:** `POST /api/owners/me/games/:gameId/streams/byo-rtmp`

**Request:**
```bash
curl -X POST https://your-domain.com/api/owners/me/games/{GAME_ID}/streams/byo-rtmp \
  -H "Authorization: Bearer YOUR_OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rtmpUrl": "rtmp://your-custom-server.com/live"
  }'
```

**Response:**
```json
{
  "rtmpUrl": "rtmp://global-live.mux.com:443/app/YOUR_STREAM_KEY",
  "streamKey": "YOUR_STREAM_KEY",
  "playbackId": "PLAYBACK_ID",
  "muxStreamId": "STREAM_ID"
}
```

### Step 2: Configure Your RTMP Source

Point your RTMP source to the Mux URL provided in the response.

---

## Viewing the Stream

### Option 1: Use the POC Viewer

Navigate to:
```
http://localhost:3000/poc/stream-viewer
```

1. Click **"Connect to Stream"**
2. Enter the HLS URL:
   ```
   https://stream.mux.com/{PLAYBACK_ID}.m3u8
   ```
3. For signed playback (recommended), append the JWT token:
   ```
   https://stream.mux.com/{PLAYBACK_ID}.m3u8?token={JWT_TOKEN}
   ```

### Option 2: Use the Production Watch Page

Navigate to:
```
http://localhost:3000/watch/{WATCH_TOKEN}
```

The watch token is generated via the purchase/access control system.

---

## Testing Your Setup

### 1. Start Your Stream
- Configure your streaming software with the RTMP URL and Stream Key
- Start broadcasting

### 2. Verify Stream is Live
Check the Mux dashboard or use the Mux API to verify the stream status:

```bash
curl https://api.mux.com/video/v1/live-streams/{STREAM_ID} \
  -u {MUX_TOKEN_ID}:{MUX_TOKEN_SECRET}
```

### 3. Test Playback
- Open the POC viewer or watch page
- Verify video is playing
- Check for buffering or quality issues

---

## Common RTMP URLs by Platform

### OBS Studio
- **Settings → Stream → Service:** Custom
- **Server:** `rtmp://global-live.mux.com:443/app`
- **Stream Key:** (from API)

### Wirecast
- **Output Settings → Destination:** RTMP Server
- **Address:** `rtmp://global-live.mux.com:443/app`
- **Stream:** (stream key from API)

### Hardware Encoders (Teradek, LiveU, etc.)
- **RTMP URL:** `rtmp://global-live.mux.com:443/app/{YOUR_STREAM_KEY}`
- Or split as:
  - **URL:** `rtmp://global-live.mux.com:443/app`
  - **Key:** `YOUR_STREAM_KEY`

### Veo Camera (or similar sports cameras)
- **Stream Settings → Add Streaming Destination**
- **RTMP URL:** `rtmp://global-live.mux.com:443/app`
- **Stream Key:** (from API)
- **Request stream key when starting:** OFF (we provide it manually)

---

## Troubleshooting

### Stream won't connect
- ✅ Verify RTMP URL is correct: `rtmp://global-live.mux.com:443/app`
- ✅ Verify stream key matches the one from API response
- ✅ Check firewall allows outbound RTMP (port 443/1935)
- ✅ Ensure Mux credentials are configured in your API server

### Stream connects but viewers can't watch
- ✅ Verify playback ID is correct
- ✅ For signed playback, ensure JWT token is valid
- ✅ Check browser console for HLS errors
- ✅ Verify stream is actively broadcasting

### Poor video quality
- ✅ Increase bitrate in encoder settings
- ✅ Use wired connection instead of WiFi
- ✅ Check upload bandwidth (minimum 5 Mbps recommended)
- ✅ Lower resolution if bandwidth is limited

### High latency
- ✅ Enable low-latency mode in HLS player (already enabled in POC)
- ✅ Use lower keyframe interval (2 seconds recommended)
- ✅ Reduce buffer size in encoder

---

## API Endpoints Reference

### Create Mux Stream
```
POST /api/owners/me/games/:gameId/streams/mux
Authorization: Bearer {OWNER_TOKEN}
```

### Configure BYO RTMP
```
POST /api/owners/me/games/:gameId/streams/byo-rtmp
Authorization: Bearer {OWNER_TOKEN}
Content-Type: application/json

{
  "rtmpUrl": "rtmp://your-server.com/live" (optional)
}
```

### Get Stream Source (if already created)
```
GET /api/owners/me/games/:gameId/stream-source
Authorization: Bearer {OWNER_TOKEN}
```

---

## Environment Variables Required

Ensure these are set in your API server:

```bash
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
```

Get these from [Mux Dashboard](https://dashboard.mux.com/) → Settings → Access Tokens

---

## Next Steps

1. ✅ Create a game (if not already created)
2. ✅ Set up streaming for the game using the API
3. ✅ Configure your streaming software with RTMP credentials
4. ✅ Start broadcasting
5. ✅ Test playback using the POC viewer
6. ✅ Share the watch URL with viewers

---

## Additional Resources

- [Mux Live Streaming Docs](https://docs.mux.com/guides/video/stream-live)
- [HLS.js Documentation](https://github.com/video-dev/hls.js/)
- [RTMP Streaming Best Practices](https://docs.mux.com/guides/video/stream-live#rtmp-best-practices)

