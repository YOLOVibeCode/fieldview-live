#!/bin/bash
# Create Mux test streams via API (requires MUX_TOKEN_ID and MUX_TOKEN_SECRET)

API_URL="${API_URL:-http://localhost:4301}"

echo "🎬 Creating Mux Test Streams..."
echo ""

# Check if API is running
if ! curl -s "${API_URL}/health" > /dev/null 2>&1; then
  echo "❌ API server not running at ${API_URL}"
  echo "   Start it with: cd apps/api && pnpm dev"
  exit 1
fi

# Create Default stream
echo "📹 Creating Default stream (baseline)..."
DEFAULT=$(curl -s -X POST "${API_URL}/api/test/streams" \
  -H "Content-Type: application/json" \
  -d '{"profile":"default"}')

if echo "$DEFAULT" | grep -q "playbackId"; then
  echo "✅ Default stream created"
  echo "$DEFAULT" | jq -r '.rtmpPublishUrl, .streamKey, .playbackId' | paste - - -
else
  echo "❌ Failed: $DEFAULT"
fi

echo ""

# Create Smart stream
echo "📹 Creating Smart stream (Option A)..."
SMART=$(curl -s -X POST "${API_URL}/api/test/streams" \
  -H "Content-Type: application/json" \
  -d '{"profile":"smart"}')

if echo "$SMART" | grep -q "playbackId"; then
  echo "✅ Smart stream created"
  echo "$SMART" | jq -r '.rtmpPublishUrl, .streamKey, .playbackId' | paste - - -
else
  echo "❌ Failed: $SMART"
fi

echo ""

# Create Smart + 4K stream
echo "📹 Creating Smart + 4K stream (Option B)..."
SMART4K=$(curl -s -X POST "${API_URL}/api/test/streams" \
  -H "Content-Type: application/json" \
  -d '{"profile":"smart_4k"}')

if echo "$SMART4K" | grep -q "playbackId"; then
  echo "✅ Smart + 4K stream created"
  echo "$SMART4K" | jq -r '.rtmpPublishUrl, .streamKey, .playbackId' | paste - - -
else
  echo "❌ Failed: $SMART4K"
fi

echo ""
echo "🎯 Next steps:"
echo "   1. Copy RTMP URL and Stream Key for each profile"
echo "   2. Configure your Veo camera to stream to one at a time"
echo "   3. View at: https://stream.mux.com/[PLAYBACK_ID].m3u8"



