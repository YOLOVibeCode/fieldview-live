# 📹 FieldView.live - RTMP Streaming Setup

Complete guide to set up RTMP streaming for your games using Mux relay.

---

## 🚀 Quick Start (3 Steps)

### 1. Get RTMP Credentials

**Easy way (using script):**
```bash
./scripts/get-rtmp-credentials.sh YOUR_GAME_ID YOUR_OWNER_TOKEN
```

**Manual way (using API):**
```bash
curl -X POST http://localhost:3001/api/owners/me/games/YOUR_GAME_ID/streams/mux \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Configure Your Streaming Platform

In your streaming platform settings (Veo, OBS, etc.):

**RTMP URL:**
```
rtmp://global-live.mux.com:443/app
```

**Stream Key:**
```
(use the streamKey from step 1)
```

### 3. Start Streaming & Watch

1. Start your broadcast
2. View at: http://localhost:3000/poc/stream-viewer
3. Paste the HLS URL when prompted

---

## 📱 Mobile-Optimized POC Viewer

The POC viewer at `/poc/stream-viewer` features:
- ✅ Full-screen video on mobile devices
- ✅ Automatic quality adjustment
- ✅ Low-latency HLS playback
- ✅ Native browser controls
- ✅ Portrait/landscape support

**Access it:**
```
http://localhost:3000/poc/stream-viewer
```

---

## 📚 Documentation

- **[Quick Start Guide](./docs/QUICK_START_RTMP.md)** - Fast setup for external platforms
- **[Detailed Setup Guide](./docs/STREAMING_SETUP_GUIDE.md)** - Complete configuration reference
- **[API Documentation](./docs/API.md)** - All streaming endpoints

---

## 🔧 API Endpoints

### Create Mux Stream
```http
POST /api/owners/me/games/:gameId/streams/mux
Authorization: Bearer {token}
```

Returns RTMP credentials for streaming.

### Get Existing Credentials
```http
GET /api/owners/me/games/:gameId/streams/credentials
Authorization: Bearer {token}
```

Retrieves credentials for an already configured stream.

### Alternative Options
- `POST /api/owners/me/games/:gameId/streams/byo-rtmp` - Bring your own RTMP
- `POST /api/owners/me/games/:gameId/streams/byo-hls` - Bring your own HLS
- `POST /api/owners/me/games/:gameId/streams/external-embed` - YouTube/Twitch embed

---

## 🎥 Supported Streaming Sources

### Hardware Encoders
- Teradek (Live:Air, VidiU, etc.)
- LiveU Solo
- Atomos Connect
- Blackmagic ATEM

### Software Encoders
- OBS Studio
- Wirecast
- vMix
- FFmpeg

### Sports Cameras
- Veo Camera
- Pixellot
- Trace
- Any camera supporting custom RTMP destinations

---

## 🧪 Testing Your Setup

### 1. Check RTMP Connection
Your streaming software should show "Connected" or "Live" status.

### 2. Verify Stream is Active
```bash
curl https://api.mux.com/video/v1/live-streams/{STREAM_ID} \
  -u {MUX_TOKEN_ID}:{MUX_TOKEN_SECRET}
```

### 3. Test Playback
Open the POC viewer and verify:
- Video is playing
- Audio is working
- No buffering issues
- Quality is acceptable

---

## 🔒 Security & Protection

Streams are protected using:
- **Signed Playback URLs** - JWT tokens required
- **Mux Content Protection** - DRM-like security
- **Access Control** - Purchase/subscription verification
- **Token Expiration** - Time-limited access

---

## ⚙️ Environment Setup

Required environment variables:

```bash
# Mux Configuration
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret

# API Configuration
PORT=3001
DATABASE_URL=your_database_url
```

Get Mux credentials from: https://dashboard.mux.com/

---

## 🐛 Troubleshooting

### Can't connect to RTMP server
- Verify URL: `rtmp://global-live.mux.com:443/app`
- Check stream key matches API response
- Ensure port 443 is not blocked by firewall

### Stream connects but viewers can't watch
- Verify playback ID is correct
- Check JWT token is valid (for signed playback)
- Ensure stream is actively broadcasting

### Poor video quality
- Increase bitrate (5-10 Mbps recommended)
- Use wired connection instead of WiFi
- Lower resolution if bandwidth limited

### High latency (>10 seconds)
- Enable low-latency mode (already enabled in POC)
- Use 2-second keyframe interval
- Reduce buffer size in encoder

---

## 📞 Support

For issues or questions:
1. Check the [Detailed Setup Guide](./docs/STREAMING_SETUP_GUIDE.md)
2. Review [Mux Live Streaming Docs](https://docs.mux.com/guides/video/stream-live)
3. Open an issue in the repository

---

## 🎯 Example: Veo Camera Setup

Based on your screenshot:

1. **Get credentials:**
   ```bash
   ./scripts/get-rtmp-credentials.sh game_123 token_abc
   ```

2. **In Veo settings:**
   - RTMP URL: `rtmp://global-live.mux.com:443/app`
   - Stream Key: `(from script output)`
   - ✅ Set as default
   - ✅ Accept terms

3. **Start recording** - Stream goes live automatically!

---

## 🚦 Status Check

Verify your setup is working:
- [ ] Mux credentials configured in `.env`
- [ ] API server running on port 3001
- [ ] Web app running on port 3000
- [ ] Game created in database
- [ ] Stream configured via API
- [ ] RTMP credentials retrieved
- [ ] Streaming platform configured
- [ ] Broadcast started
- [ ] POC viewer shows video
- [ ] Audio working
- [ ] No buffering

---

**Ready to stream? Start with:** `./scripts/get-rtmp-credentials.sh YOUR_GAME_ID YOUR_TOKEN`
