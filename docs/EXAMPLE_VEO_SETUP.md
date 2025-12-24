# Example: Veo Camera RTMP Setup

This guide shows exactly what to enter in the Veo camera settings (or similar platforms) based on your screenshot.

---

## Step 1: Get Your Credentials

Run this command:
```bash
./scripts/get-rtmp-credentials.sh game_abc123 your_owner_token
```

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📹 RTMP Streaming Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Option 1: Separate Fields
┌─────────────────────────────────────────────────┐
│ RTMP URL:                                       │
│ rtmp://global-live.mux.com:443/app             │
│                                                 │
│ Stream Key:                                     │
│ a1b2c3d4e5f6g7h8i9j0                           │
└─────────────────────────────────────────────────┘
```

---

## Step 2: Enter in Veo Settings

### Navigate to Stream Settings
1. Open your Veo camera settings
2. Go to **"Stream Settings"** tab
3. Click **"Add streaming destination"**

### Fill in the Form

```
┌─────────────────────────────────────────────────────┐
│  Add streaming destination                          │
│                                                     │
│  Set up a destination that you want to stream to   │
│                                                     │
│  RTMP URL                                          │
│  ┌───────────────────────────────────────────────┐ │
│  │ rtmp://global-live.mux.com:443/app            │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ☐ Request stream key when starting live stream   │
│                                                     │
│  Stream key                                        │
│  ┌───────────────────────────────────────────────┐ │
│  │ a1b2c3d4e5f6g7h8i9j0                          │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ☑ Set as default                                 │
│                                                     │
│  ☑ Accept terms and conditions*                   │
│  By checking the tick box, I hereby accept Veo's  │
│  Terms of Use for RTMP Streaming and agree to     │
│  have the full responsibility for ensuring that    │
│  the external streaming platform complies with     │
│  the said terms.                                   │
│                                                     │
│  [Back]  [Create streaming destination]           │
└─────────────────────────────────────────────────────┘
```

### Field-by-Field Instructions

**RTMP URL:**
```
rtmp://global-live.mux.com:443/app
```
- Copy this EXACTLY from your script output
- Don't include the stream key here
- The `:443` port is important

**Request stream key when starting:**
```
☐ UNCHECKED
```
- Leave this **UNCHECKED**
- We're providing the stream key manually below

**Stream key:**
```
a1b2c3d4e5f6g7h8i9j0
```
- Copy this from your script output
- This is unique to your game
- Keep it secure (it's like a password)

**Set as default:**
```
☑ CHECKED (optional)
```
- Check this if you want to use FieldView.live as your primary destination

**Accept terms:**
```
☑ CHECKED (required)
```
- Must check this to proceed

---

## Step 3: Save & Test

1. Click **"Create streaming destination"**
2. Veo will save the configuration
3. Start a recording - it will automatically stream to FieldView.live!

---

## Step 4: View Your Stream

### Option A: POC Viewer (Simplest)
1. Open: http://localhost:3000/poc/stream-viewer
2. Click "Connect to Stream"
3. Enter: `https://stream.mux.com/YOUR_PLAYBACK_ID.m3u8`
   - (Get the playback ID from the script output)

### Option B: Production Viewer
1. Create a watch token via API
2. Open: http://localhost:3000/watch/YOUR_WATCH_TOKEN

---

## Common Mistakes to Avoid

❌ **Don't do this:**
```
RTMP URL: rtmp://global-live.mux.com:443/app/a1b2c3d4e5f6g7h8i9j0
Stream key: (empty)
```

✅ **Do this:**
```
RTMP URL: rtmp://global-live.mux.com:443/app
Stream key: a1b2c3d4e5f6g7h8i9j0
```

---

❌ **Don't do this:**
```
RTMP URL: rtmp://global-live.mux.com/app
```
(Missing port `:443`)

✅ **Do this:**
```
RTMP URL: rtmp://global-live.mux.com:443/app
```

---

❌ **Don't do this:**
```
☑ Request stream key when starting live stream
Stream key: (empty)
```

✅ **Do this:**
```
☐ Request stream key when starting live stream
Stream key: a1b2c3d4e5f6g7h8i9j0
```

---

## Verification Checklist

Before clicking "Create streaming destination":

- [ ] RTMP URL is exactly: `rtmp://global-live.mux.com:443/app`
- [ ] Port `:443` is included
- [ ] "Request stream key when starting" is **UNCHECKED**
- [ ] Stream key is filled in with your unique key
- [ ] Terms are accepted
- [ ] Configuration looks correct

---

## After Setup

Once saved, your Veo camera will:
1. ✅ Automatically connect to FieldView.live when recording starts
2. ✅ Stream in real-time to your viewers
3. ✅ Use the highest quality your connection supports
4. ✅ Reconnect automatically if connection drops

---

## Troubleshooting

### Veo shows "Connection failed"
- Double-check the RTMP URL has `:443/app` at the end
- Verify stream key matches exactly (no extra spaces)
- Ensure you have internet connection

### Stream connects but no video in viewer
- Wait 10-15 seconds for stream to start
- Refresh the POC viewer page
- Check that recording is actually running on Veo

### Video is laggy/buffering
- Check your upload speed (minimum 5 Mbps)
- Move closer to WiFi router or use ethernet
- Reduce video quality in Veo settings if needed

---

## Multiple Games Setup

For different games, repeat the process:
1. Get new credentials for each game ID
2. Create a new streaming destination in Veo
3. Give it a descriptive name (e.g., "FieldView - Home Games")
4. Switch between destinations as needed

---

**Need help?** See the [full streaming guide](./STREAMING_SETUP_GUIDE.md)

