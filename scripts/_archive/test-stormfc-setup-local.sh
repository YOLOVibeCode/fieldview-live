#!/bin/bash
# Test STORMFC Setup Locally
# 
# This script tests the setup process locally before running in production.
# It uses the API endpoints to create the organization and channels.

set -e

API_URL="${API_URL:-http://localhost:4301}"
EMAIL="stormfc@darkware.net"

echo "🧪 Testing STORMFC setup locally..."
echo "API URL: ${API_URL}"
echo ""

# Check if API is running
if ! curl -s "${API_URL}/health" > /dev/null 2>&1; then
  echo "❌ Error: API server is not running at ${API_URL}"
  echo "   Start it with: pnpm --filter api dev"
  exit 1
fi

echo "✓ API server is running"

# Check if user exists (try to login first)
echo ""
echo "Step 1: Checking if user ${EMAIL} exists..."
echo "Please provide the password for ${EMAIL}:"
read -s PASSWORD

LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/owners/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$TOKEN" ]; then
  # Try alternative JSON format
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":{[^}]*"token":"[^"]*"' | grep -o '"token":"[^"]*"' | tail -1 | cut -d'"' -f4 || echo "")
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Error: Failed to login. Response:"
  echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"
  echo ""
  echo "Possible issues:"
  echo "  - User doesn't exist. Create it first via: POST /api/owners/register"
  echo "  - Wrong password"
  exit 1
fi

echo "✓ Logged in successfully"

# Step 2: Create organization
echo ""
echo "Step 2: Creating organization STORMFC..."

ORG_RESPONSE=$(curl -s -X POST "${API_URL}/api/owners/me/watch-links/orgs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "shortName": "STORMFC",
    "name": "Storm FC"
  }')

ORG_ID=$(echo "$ORG_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$ORG_ID" ] || [ "$ORG_ID" = "null" ]; then
  # Check if org already exists (CONFLICT error)
  if echo "$ORG_RESPONSE" | grep -q "CONFLICT\|already exists"; then
    echo "✓ Organization STORMFC already exists"
  else
    echo "❌ Error: Failed to create organization. Response:"
    echo "$ORG_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ORG_RESPONSE"
    exit 1
  fi
else
  echo "✓ Created organization: ${ORG_ID}"
fi

# Step 3: Create channels
echo ""
echo "Step 3: Creating channels..."

for TEAM in "2010" "2008"; do
  echo "  Creating channel ${TEAM}..."
  
  CHANNEL_RESPONSE=$(curl -s -X POST "${API_URL}/api/owners/me/watch-links/orgs/STORMFC/channels" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"teamSlug\": \"${TEAM}\",
      \"displayName\": \"${TEAM} Team\",
      \"streamType\": \"byo_hls\",
      \"hlsManifestUrl\": \"https://placeholder.m3u8\",
      \"requireEventCode\": false
    }")
  
  CHANNEL_ID=$(echo "$CHANNEL_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 || echo "")
  
  if [ -z "$CHANNEL_ID" ] || [ "$CHANNEL_ID" = "null" ]; then
    if echo "$CHANNEL_RESPONSE" | grep -q "CONFLICT\|already exists"; then
      echo "    ✓ Channel ${TEAM} already exists"
    else
      echo "    ❌ Failed to create channel ${TEAM}. Response:"
      echo "$CHANNEL_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CHANNEL_RESPONSE"
    fi
  else
    echo "    ✓ Created channel ${TEAM}: ${CHANNEL_ID}"
  fi
done

echo ""
echo "✅ Local test complete!"
echo ""
echo "Paths available:"
echo "  - /STORMFC/2010 (for events)"
echo "  - /STORMFC/2008 (for events)"
echo ""
echo "To create events, use:"
echo "  POST ${API_URL}/api/owners/me/orgs/STORMFC/channels/2010/events"
echo "  POST ${API_URL}/api/owners/me/orgs/STORMFC/channels/2008/events"


