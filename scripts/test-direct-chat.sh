#!/bin/bash
# Test Direct Stream Chat Integration
# Verifies all APIs are working end-to-end

set -e

API_URL="${API_URL:-http://localhost:4301}"
SLUG="${SLUG:-tchs}"

echo "🧪 Testing Direct Stream Chat Integration"
echo "API: $API_URL"
echo "Slug: $SLUG"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Bootstrap endpoint
echo "1️⃣  Testing bootstrap endpoint..."
BOOTSTRAP=$(curl -s "$API_URL/api/direct/$SLUG/bootstrap")
GAME_ID=$(echo "$BOOTSTRAP" | python3 -c "import sys, json; print(json.load(sys.stdin).get('gameId', ''))" 2>/dev/null || echo "")

if [ -z "$GAME_ID" ]; then
  echo -e "${RED}✗ Bootstrap failed or no gameId${NC}"
  echo "Response: $BOOTSTRAP"
  exit 1
else
  echo -e "${GREEN}✓ Bootstrap successful${NC}"
  echo "  gameId: $GAME_ID"
fi

# Test 2: Viewer unlock
echo ""
echo "2️⃣  Testing viewer unlock..."
UNLOCK_RESPONSE=$(curl -s -X POST "$API_URL/api/public/games/$GAME_ID/viewer/unlock" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","firstName":"Test","lastName":"User"}')

VIEWER_TOKEN=$(echo "$UNLOCK_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('viewerToken', ''))" 2>/dev/null || echo "")

if [ -z "$VIEWER_TOKEN" ]; then
  echo -e "${RED}✗ Viewer unlock failed${NC}"
  echo "Response: $UNLOCK_RESPONSE"
  exit 1
else
  echo -e "${GREEN}✓ Viewer unlock successful${NC}"
  echo "  Token: ${VIEWER_TOKEN:0:20}..."
fi

# Test 3: Chat message send
echo ""
echo "3️⃣  Testing chat message send..."
MESSAGE_RESPONSE=$(curl -s -X POST "$API_URL/api/public/games/$GAME_ID/chat/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -d '{"message":"Test message from script"}')

MESSAGE_ID=$(echo "$MESSAGE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")

if [ -z "$MESSAGE_ID" ]; then
  echo -e "${RED}✗ Chat message send failed${NC}"
  echo "Response: $MESSAGE_RESPONSE"
  exit 1
else
  echo -e "${GREEN}✓ Chat message sent${NC}"
  echo "  messageId: $MESSAGE_ID"
fi

# Test 4: SSE stream (just check it connects)
echo ""
echo "4️⃣  Testing SSE stream connection..."
timeout 3s curl -N -s "$API_URL/api/public/games/$GAME_ID/chat/stream?token=$VIEWER_TOKEN" > /tmp/sse_test.txt 2>&1 || true

if grep -q "chat_snapshot" /tmp/sse_test.txt; then
  echo -e "${GREEN}✓ SSE stream connected${NC}"
  echo "  Received chat_snapshot event"
else
  echo -e "${RED}✗ SSE stream failed${NC}"
  cat /tmp/sse_test.txt
  exit 1
fi

echo ""
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "Chat is working end-to-end for gameId: $GAME_ID"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:4300/direct/$SLUG in two browsers"
echo "2. Unlock in both with different names"
echo "3. Send messages and verify real-time delivery"

