#!/bin/bash
# Test STORMFC Setup Locally (Non-interactive)
# 
# Usage: PASSWORD="your_password" ./scripts/test-stormfc-setup-local-auto.sh

set -e

API_URL="${API_URL:-http://localhost:4301}"
EMAIL="stormfc@darkware.net"
PASSWORD="${PASSWORD:-}"

if [ -z "$PASSWORD" ]; then
  echo "❌ Error: PASSWORD environment variable is required"
  echo "   Usage: PASSWORD=\"your_password\" ./scripts/test-stormfc-setup-local-auto.sh"
  exit 1
fi

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

# Step 1: Try to login (or register if user doesn't exist)
echo ""
echo "Step 1: Checking if user ${EMAIL} exists..."

LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/owners/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$TOKEN" ]; then
  # Try alternative JSON format (nested token)
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":{[^}]*"token":"[^"]*"' | grep -o '"token":"[^"]*"' | tail -1 | cut -d'"' -f4 || echo "")
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "  User doesn't exist. Creating user..."
  
  REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/api/owners/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"${EMAIL}\",
      \"password\": \"${PASSWORD}\",
      \"name\": \"Storm FC\",
      \"type\": \"association\"
    }")
  
  TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")
  
  if [ -z "$TOKEN" ]; then
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":{[^}]*"token":"[^"]*"' | grep -o '"token":"[^"]*"' | tail -1 | cut -d'"' -f4 || echo "")
  fi
  
  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Error: Failed to register user. Response:"
    echo "$REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"
    exit 1
  fi
  
  echo "✓ User created and logged in"
else
  echo "✓ User exists and logged in"
fi

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


