#!/bin/bash
# Get RTMP Credentials for a Game
# Usage: ./scripts/get-rtmp-credentials.sh <GAME_ID> [OWNER_TOKEN]

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3001}"
GAME_ID="$1"
OWNER_TOKEN="${2:-${OWNER_TOKEN}}"

if [ -z "$GAME_ID" ]; then
  echo "Usage: $0 <GAME_ID> [OWNER_TOKEN]"
  echo ""
  echo "Example:"
  echo "  $0 game_123 your_token_here"
  echo "  or"
  echo "  export OWNER_TOKEN=your_token_here"
  echo "  $0 game_123"
  exit 1
fi

if [ -z "$OWNER_TOKEN" ]; then
  echo "Error: OWNER_TOKEN is required"
  echo "Set it via environment variable or pass as second argument"
  exit 1
fi

echo "Fetching RTMP credentials for game: $GAME_ID"
echo ""

# Try to get existing credentials first
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  "$API_BASE_URL/api/owners/me/games/$GAME_ID/streams/credentials")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "404" ]; then
  echo -e "${YELLOW}No stream configured yet. Creating new Mux stream...${NC}"
  echo ""
  
  # Create new stream
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    "$API_BASE_URL/api/owners/me/games/$GAME_ID/streams/mux")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" != "201" ]; then
    echo "Error creating stream (HTTP $HTTP_CODE):"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 1
  fi
fi

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo -e "${GREEN}✓ Stream credentials retrieved successfully${NC}"
  echo ""
  
  # Parse JSON response
  RTMP_URL=$(echo "$BODY" | jq -r '.rtmpPublishUrl // empty')
  STREAM_KEY=$(echo "$BODY" | jq -r '.streamKey // empty')
  PLAYBACK_ID=$(echo "$BODY" | jq -r '.playbackId // empty')
  
  if [ -n "$RTMP_URL" ] && [ -n "$STREAM_KEY" ]; then
    # Extract base URL (without stream key)
    RTMP_BASE_URL=$(echo "$RTMP_URL" | sed 's|/[^/]*$||')
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}📹 RTMP Streaming Configuration${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${GREEN}Option 1: Separate Fields${NC}"
    echo "┌─────────────────────────────────────────────────┐"
    echo "│ RTMP URL:                                       │"
    echo -e "│ ${BLUE}$RTMP_BASE_URL${NC}"
    echo "│                                                 │"
    echo "│ Stream Key:                                     │"
    echo -e "│ ${BLUE}$STREAM_KEY${NC}"
    echo "└─────────────────────────────────────────────────┘"
    echo ""
    echo -e "${GREEN}Option 2: Combined URL${NC}"
    echo "┌─────────────────────────────────────────────────┐"
    echo "│ RTMP URL (with key):                            │"
    echo -e "│ ${BLUE}$RTMP_URL${NC}"
    echo "└─────────────────────────────────────────────────┘"
    echo ""
    
    if [ -n "$PLAYBACK_ID" ]; then
      echo -e "${GREEN}🎬 Playback URL for Viewers${NC}"
      echo "┌─────────────────────────────────────────────────┐"
      echo "│ HLS Manifest:                                   │"
      echo -e "│ ${BLUE}https://stream.mux.com/$PLAYBACK_ID.m3u8${NC}"
      echo "│                                                 │"
      echo "│ POC Viewer:                                     │"
      echo -e "│ ${BLUE}http://localhost:3000/poc/stream-viewer${NC}"
      echo "└─────────────────────────────────────────────────┘"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
  else
    echo "Stream configured but not RTMP type:"
    echo "$BODY" | jq '.'
  fi
else
  echo "Error fetching credentials (HTTP $HTTP_CODE):"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi
