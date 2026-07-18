#!/bin/bash
# Add TCHS Soccer Direct Stream Links via API
# Usage: ./scripts/add-tchs-soccer-20260206-api.sh <API_BASE_URL>
# Example: ./scripts/add-tchs-soccer-20260206-api.sh https://api.fieldview.live

API_BASE_URL="${1:-http://localhost:4301}"

echo "╔════════════════════════════════════════════════════════╗"
echo "║  Adding TCHS Soccer Direct Stream Links via API      ║"
echo "║  February 6, 2026                                     ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Using API: $API_BASE_URL"
echo ""

# Streams to create
streams=(
  '{"slug":"tchs/soccer-20260206-jv2","title":"TCHS Soccer JV2 - February 6, 2026","streamUrl":null,"scheduledStartAt":"2026-02-06T19:00:00Z","paywallEnabled":false,"priceInCents":0,"paywallMessage":null,"allowSavePayment":false,"adminPassword":"tchs2026","chatEnabled":true,"scoreboardEnabled":true,"allowAnonymousView":true,"requireEmailVerification":false,"listed":true,"sendReminders":true,"reminderMinutes":5}'
  '{"slug":"tchs/soccer-20260206-jv","title":"TCHS Soccer JV - February 6, 2026","streamUrl":null,"scheduledStartAt":"2026-02-06T19:00:00Z","paywallEnabled":false,"priceInCents":0,"paywallMessage":null,"allowSavePayment":false,"adminPassword":"tchs2026","chatEnabled":true,"scoreboardEnabled":true,"allowAnonymousView":true,"requireEmailVerification":false,"listed":true,"sendReminders":true,"reminderMinutes":5}'
  '{"slug":"tchs/soccer-20260206-varsity","title":"TCHS Soccer Varsity - February 6, 2026","streamUrl":null,"scheduledStartAt":"2026-02-06T19:00:00Z","paywallEnabled":false,"priceInCents":0,"paywallMessage":null,"allowSavePayment":false,"adminPassword":"tchs2026","chatEnabled":true,"scoreboardEnabled":true,"allowAnonymousView":true,"requireEmailVerification":false,"listed":true,"sendReminders":true,"reminderMinutes":5}'
)

created=0
updated=0
skipped=0

for stream_data in "${streams[@]}"; do
  slug=$(echo "$stream_data" | grep -o '"slug":"[^"]*' | cut -d'"' -f4)
  echo "Processing: $slug"
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    "$API_BASE_URL/api/admin/direct-streams" \
    -H "Content-Type: application/json" \
    -d "$stream_data")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "201" ]; then
    echo "   ✅ Created: $slug"
    ((created++))
  elif [ "$http_code" = "409" ]; then
    echo "   🔄 Already exists: $slug"
    ((updated++))
  else
    echo "   ❌ Failed: $slug (HTTP $http_code)"
    echo "   Response: $body"
    ((skipped++))
  fi
done

echo ""
echo "✅ Complete: $created created, $updated already existed, $skipped failed"
echo ""
echo "🌐 Direct Stream URLs:"
echo "   • https://fieldview.live/direct/tchs/soccer-20260206-jv2"
echo "   • https://fieldview.live/direct/tchs/soccer-20260206-jv"
echo "   • https://fieldview.live/direct/tchs/soccer-20260206-varsity"
echo ""
