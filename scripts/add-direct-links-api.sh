#!/bin/bash
# Add direct stream links via API. Log in as admin, get token, then create streams.
#
# One-time setup: ensure super admin exists locally and in production:
#   ./scripts/ensure-super-admin.sh
# (Prompts for password, then creates admin@fieldview.live on both APIs if missing.)
#
# Usage:
#   ./scripts/add-direct-links-api.sh [API_BASE_URL] slug1 [slug2 ...]
#   Local:      ./scripts/add-direct-links-api.sh http://localhost:4301 slug1 slug2
#   Production: ./scripts/add-direct-links-api.sh https://api.fieldview.live slug1 slug2
#
# Script will prompt for admin password, then log in with admin@fieldview.live and add the links.

set -e

API_BASE_URL="${1:-http://localhost:4301}"
# If first arg looks like a URL, use it and shift; rest are slugs
if [[ "$1" == http* ]]; then
  shift
else
  API_BASE_URL="http://localhost:4301"
fi

ADMIN_EMAIL="admin@fieldview.live"

if [ $# -eq 0 ]; then
  echo "Usage: $0 [API_BASE_URL] slug1 [slug2 ...]"
  echo "Example: $0 https://api.fieldview.live tchs/soccer-20260213-jv2 tchs/soccer-20260213-jv"
  exit 0
fi

# Stream admin password for created links (default admin2026)
STREAM_PW="${STREAM_ADMIN_PASSWORD:-admin2026}"

echo "API: $API_BASE_URL"
if [ -z "$ADMIN_PASSWORD" ]; then
  echo -n "Admin password: "
  read -s ADMIN_PASSWORD
  echo ""
fi

# Login and get session token
LOGIN_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
LOGIN_CODE=$(echo "$LOGIN_RESP" | tail -n1)
LOGIN_BODY=$(echo "$LOGIN_RESP" | sed '$d')

if [ "$LOGIN_CODE" != "200" ]; then
  echo "Login failed (HTTP $LOGIN_CODE). Check email/password and that super admin exists."
  echo "Create admin: curl -X POST $API_BASE_URL/api/admin/setup/super-admin -H 'Content-Type: application/json' -d '{\"email\":\"$ADMIN_EMAIL\",\"password\":\"YOUR_PASSWORD\"}'"
  exit 1
fi

TOKEN=$(echo "$LOGIN_BODY" | sed -n 's/.*"sessionToken":"\([^"]*\)".*/\1/p')
if [ -z "$TOKEN" ]; then
  echo "Login response missing sessionToken. MFA may be required."
  echo "$LOGIN_BODY"
  exit 1
fi

echo "Logged in as $ADMIN_EMAIL"
echo ""

created=0
exists=0
failed=0

for slug in "$@"; do
  title="Direct: $slug"
  stream_data="{\"slug\":\"$slug\",\"title\":\"$title\",\"adminPassword\":\"$STREAM_PW\",\"chatEnabled\":true,\"scoreboardEnabled\":true,\"allowAnonymousView\":true,\"requireEmailVerification\":false,\"listed\":true,\"sendReminders\":true,\"reminderMinutes\":5,\"paywallEnabled\":false,\"priceInCents\":0}"

  echo "Processing: $slug"
  response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/api/admin/direct-streams" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$stream_data")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "201" ]; then
    echo "   ✅ Created: $slug"
    ((created++))
  elif [ "$http_code" = "409" ]; then
    echo "   🔄 Already exists: $slug"
    ((exists++))
  else
    echo "   ❌ Failed (HTTP $http_code): $body"
    ((failed++))
  fi
done

echo ""
echo "Done: $created created, $exists already existed, $failed failed"
echo "Links:"
for slug in "$@"; do echo "   https://fieldview.live/direct/$slug"; done
echo ""
