#!/bin/bash
# Update Varsity Stream URL via Admin API
# 
# This uses the admin panel API endpoint to update the stream URL

set -e

ADMIN_PASSWORD="tchs2026"
NEW_STREAM_URL="https://stream.mux.com/Be02yA6vRJb8fQ01U4yuj01C9KKPC02gHCdBX71J02McpZb4.m3u8"

echo "🔧 Updating Varsity stream URL via Admin API..."
echo ""

# Get the event ID first
echo "📡 Fetching event data..."
EVENT_DATA=$(curl -s "https://api.fieldview.live/api/public/direct/tchs/events/soccer-20260116-varsity/bootstrap")
EVENT_ID=$(echo "$EVENT_DATA" | jq -r '.gameId // empty')

if [ -z "$EVENT_ID" ]; then
  echo "⚠️  No gameId in bootstrap, trying to find event ID directly..."
  
  # Try to update via direct stream event endpoint
  echo "📝 Updating stream URL..."
  
  curl -X PATCH \
    "https://api.fieldview.live/api/admin/direct-streams/tchs/events/soccer-20260116-varsity" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_PASSWORD" \
    -d "{\"streamUrl\": \"$NEW_STREAM_URL\"}" \
    -v
else
  echo "✓ Found event ID: $EVENT_ID"
  echo "📝 Updating stream URL..."
  
  curl -X PATCH \
    "https://api.fieldview.live/api/admin/direct-streams/tchs/events/soccer-20260116-varsity" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_PASSWORD" \
    -d "{\"streamUrl\": \"$NEW_STREAM_URL\"}"
fi

echo ""
echo "✅ Update complete!"
echo ""
echo "🔍 Verifying..."
curl -s "https://api.fieldview.live/api/public/direct/tchs/events/soccer-20260116-varsity/bootstrap" | jq '{streamUrl}'
