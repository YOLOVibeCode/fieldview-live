#!/bin/bash
# End-to-end test for paywall workflow with Mailpit
# This script tests the full flow: visit watch link -> see paywall -> checkout -> payment -> access stream

set -e

API_URL="${API_URL:-http://localhost:4301}"
WEB_URL="${WEB_URL:-http://localhost:4300}"
MAILPIT_URL="${MAILPIT_URL:-http://localhost:4304}"
ORG_SHORTNAME="${ORG_SHORTNAME:-STORMFC}"
TEAM_SLUG="${TEAM_SLUG:-2010}"
TEST_EMAIL="${TEST_EMAIL:-test-viewer-$(date +%s)@test.fieldview.live}"
OWNER_EMAIL="${OWNER_EMAIL:-stormfc@darkware.net}"
OWNER_PASSWORD="${OWNER_PASSWORD:-${PASSWORD:-}}"
PRICE_CENTS="${PRICE_CENTS:-500}"

echo "🧪 End-to-End Paywall Test"
echo "=========================="
echo "API URL: ${API_URL}"
echo "Web URL: ${WEB_URL}"
echo "Mailpit URL: ${MAILPIT_URL}"
echo "Test Email: ${TEST_EMAIL}"
echo ""

# Check if Mailpit is running
echo "📧 Checking Mailpit..."
if ! curl -s "${MAILPIT_URL}/api/v1/messages" > /dev/null 2>&1; then
  echo "⚠️  Mailpit is not running at ${MAILPIT_URL}"
  echo "   Start it with: docker-compose up -d mailpit"
  echo "   Or visit: ${MAILPIT_URL}"
  exit 1
fi
echo "✓ Mailpit is running"

# Check if API is running
echo "🔌 Checking API server..."
if ! curl -s "${API_URL}/health" > /dev/null 2>&1; then
  echo "⚠️  API server is not running at ${API_URL}"
  echo "   Start it with: pnpm --filter=api dev"
  exit 1
fi
echo "✓ API server is running"

# Step 1: Get watch link bootstrap (should show paywall)
echo ""
echo "Step 1: Fetching watch link bootstrap..."
BOOTSTRAP_RESPONSE=$(curl -s "${API_URL}/api/public/watch-links/${ORG_SHORTNAME}/${TEAM_SLUG}")
echo "Response: ${BOOTSTRAP_RESPONSE}"

# Check if accessMode is pay_per_view
if echo "${BOOTSTRAP_RESPONSE}" | grep -q '"accessMode":"pay_per_view"'; then
  echo "✓ Channel requires payment (pay_per_view)"
else
  echo "⚠️  Channel is not set to pay_per_view. Setting it now..."
  if [ -z "${OWNER_PASSWORD}" ]; then
    echo "✗ OWNER_PASSWORD is required to set paywall automatically"
    echo "  Usage: OWNER_PASSWORD=\"...\" ./scripts/test-paywall-e2e.sh"
    exit 1
  fi

  echo "  Logging in owner to update channel settings..."
  LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/owners/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${OWNER_EMAIL}\",\"password\":\"${OWNER_PASSWORD}\"}")

  OWNER_TOKEN=$(echo "${LOGIN_RESPONSE}" | python3 - <<'PY' 2>/dev/null || echo ""
import sys, json
data=json.load(sys.stdin)
token=data.get("token")
if isinstance(token, dict):
  print(token.get("token",""))
elif isinstance(token, str):
  print(token)
else:
  print("")
PY
)

  if [ -z "${OWNER_TOKEN}" ] || [ "${OWNER_TOKEN}" = "null" ]; then
    echo "✗ Failed to login owner. Response:"
    echo "${LOGIN_RESPONSE}"
    exit 1
  fi

  echo "  Updating channel settings to pay_per_view..."
  SETTINGS_RESPONSE=$(curl -s -X PATCH "${API_URL}/api/owners/me/watch-links/orgs/${ORG_SHORTNAME}/channels/${TEAM_SLUG}/settings" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -d "{\"accessMode\":\"pay_per_view\",\"priceCents\":${PRICE_CENTS},\"currency\":\"USD\"}")

  if echo "${SETTINGS_RESPONSE}" | grep -q '"accessMode":"pay_per_view"'; then
    echo "✓ Channel updated to pay_per_view (${PRICE_CENTS} cents)"
  else
    echo "✗ Failed to update channel settings. Response:"
    echo "${SETTINGS_RESPONSE}"
    exit 1
  fi

  # Refresh bootstrap
  BOOTSTRAP_RESPONSE=$(curl -s "${API_URL}/api/public/watch-links/${ORG_SHORTNAME}/${TEAM_SLUG}")
fi

# Step 2: Create checkout
echo ""
echo "Step 2: Creating checkout..."
CHECKOUT_RESPONSE=$(curl -s -X POST "${API_URL}/api/public/watch-links/${ORG_SHORTNAME}/${TEAM_SLUG}/checkout" \
  -H "Content-Type: application/json" \
  -d "{\"viewerEmail\":\"${TEST_EMAIL}\"}")

PURCHASE_ID=$(echo "${CHECKOUT_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('purchaseId', ''))" 2>/dev/null || echo "")

if [ -z "${PURCHASE_ID}" ]; then
  echo "✗ Failed to create checkout"
  echo "Response: ${CHECKOUT_RESPONSE}"
  exit 1
fi

echo "✓ Checkout created: ${PURCHASE_ID}"

# Step 3: Trigger an email (subscription confirm) and check Mailpit
echo ""
echo "Step 3: Triggering email and checking Mailpit..."
sleep 2 # Wait for email to be sent

CHANNEL_ID=$(echo "${BOOTSTRAP_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('channelId', ''))" 2>/dev/null || echo "")

if [ -n "${CHANNEL_ID}" ]; then
  echo "  Triggering subscription confirmation email..."
  curl -s -X POST "${API_URL}/api/public/subscriptions" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"channelId\":\"${CHANNEL_ID}\",\"preference\":\"email\"}" > /dev/null || true
  sleep 2
fi

EMAILS=$(curl -s "${MAILPIT_URL}/api/v1/messages" | python3 -c "import sys, json; msgs = json.load(sys.stdin).get('messages', []); print(len(msgs))" 2>/dev/null || echo "0")

if [ "${EMAILS}" -gt "0" ]; then
  echo "✓ Found ${EMAILS} email(s) in Mailpit"
  echo "  View emails at: ${MAILPIT_URL}"
else
  echo "✗ No emails found in Mailpit"
  exit 1
fi

# Step 4: Get purchase details
echo ""
echo "Step 4: Fetching purchase details..."
PURCHASE_RESPONSE=$(curl -s "${API_URL}/api/public/purchases/${PURCHASE_ID}")
echo "Purchase: ${PURCHASE_RESPONSE}"

echo ""
echo "Step 5: Checking saved payment methods endpoint (purchase-scoped)..."
SAVED_PM_RESPONSE=$(curl -s "${API_URL}/api/public/saved-payments?purchaseId=${PURCHASE_ID}")
echo "Saved methods: ${SAVED_PM_RESPONSE}"

echo ""
echo "✅ Test completed!"
echo ""
echo "Next steps:"
echo "1. Visit payment page: ${WEB_URL}/checkout/${PURCHASE_ID}/payment"
echo "2. View emails in Mailpit: ${MAILPIT_URL}"
echo "3. Complete payment flow manually (Square sandbox)"
echo "4. Verify stream access after payment"


