#!/bin/bash
# Setup STORMFC Paths for stormfc@darkware.net via API
# 
# This script uses the API endpoints to create the organization and channels.
# Requires: API_URL environment variable (defaults to production)
#           Owner auth token for stormfc@darkware.net

set -e

API_URL="${API_URL:-https://api.fieldview.live}"
EMAIL="stormfc@darkware.net"
PASSWORD="${PASSWORD:-}"

echo "Setting up STORMFC paths for ${EMAIL}..."
echo "API URL: ${API_URL}"
echo ""

if [ -z "$PASSWORD" ]; then
  echo "Step 1: Login to get auth token"
  echo "Please provide the password for ${EMAIL}:"
  read -s PASSWORD
else
  echo "Using password from PASSWORD environment variable"
fi
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/owners/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token.token // .token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Error: Failed to login. Response:"
  echo $LOGIN_RESPONSE | jq .
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

ORG_ID=$(echo $ORG_RESPONSE | jq -r '.id // empty')

if [ -z "$ORG_ID" ] || [ "$ORG_ID" = "null" ]; then
  # Check if org already exists
  if echo $ORG_RESPONSE | jq -e '.error.code == "CONFLICT"' > /dev/null; then
    echo "✓ Organization STORMFC already exists"
    # Try to get existing org (would need another endpoint)
    echo "  Note: Using existing organization"
  else
    echo "Error: Failed to create organization. Response:"
    echo $ORG_RESPONSE | jq .
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
  
  # Create channel without stream (will be set later)
  # Note: streamType is required, so we use a placeholder
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
  
  CHANNEL_ID=$(echo $CHANNEL_RESPONSE | jq -r '.id // empty')
  
  if [ -z "$CHANNEL_ID" ] || [ "$CHANNEL_ID" = "null" ]; then
    if echo $CHANNEL_RESPONSE | jq -e '.error.code == "CONFLICT"' > /dev/null; then
      echo "    ✓ Channel ${TEAM} already exists"
    else
      echo "    ✗ Failed to create channel ${TEAM}. Response:"
      echo $CHANNEL_RESPONSE | jq .
    fi
  else
    echo "    ✓ Created channel ${TEAM}: ${CHANNEL_ID}"
  fi
done

echo ""
echo "✅ Setup complete!"
echo ""
echo "Paths available:"
echo "  - /STORMFC/2010 (for events)"
echo "  - /STORMFC/2008 (for events)"
echo ""
echo "To create events, use:"
echo "  POST ${API_URL}/api/owners/me/orgs/STORMFC/channels/2010/events"
echo "  POST ${API_URL}/api/owners/me/orgs/STORMFC/channels/2008/events"

