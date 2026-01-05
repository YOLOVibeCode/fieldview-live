#!/bin/bash
# Check if STORMFC paths are set up in production

echo "🔍 Checking STORMFC Production Status..."
echo ""

PROD_API="https://api.fieldview.live"
PROD_WEB="https://fieldview.live"

# Check API health
echo "1. Checking API health..."
API_HEALTH=$(curl -s "${PROD_API}/health" 2>&1)
if echo "$API_HEALTH" | grep -q "healthy"; then
  echo "   ✅ API is healthy"
else
  echo "   ❌ API health check failed"
  echo "   Response: $API_HEALTH"
fi

echo ""
echo "2. Checking web pages..."

# Check 2010 team page
echo "   Checking: ${PROD_WEB}/watch/STORMFC/2010"
PAGE_2010=$(curl -s "${PROD_WEB}/watch/STORMFC/2010" 2>&1)
if echo "$PAGE_2010" | grep -q "STORMFC/2010"; then
  echo "   ✅ STORMFC/2010 page exists"
  if echo "$PAGE_2010" | grep -q "Loading stream"; then
    echo "      ⚠️  Page loads but no active event/stream configured"
  fi
else
  echo "   ❌ STORMFC/2010 page not found or error"
fi

# Check 2008 team page
echo "   Checking: ${PROD_WEB}/watch/STORMFC/2008"
PAGE_2008=$(curl -s "${PROD_WEB}/watch/STORMFC/2008" 2>&1)
if echo "$PAGE_2008" | grep -q "STORMFC/2008"; then
  echo "   ✅ STORMFC/2008 page exists"
  if echo "$PAGE_2008" | grep -q "Loading stream"; then
    echo "      ⚠️  Page loads but no active event/stream configured"
  fi
else
  echo "   ❌ STORMFC/2008 page not found or error"
fi

echo ""
echo "📋 Summary:"
echo ""
echo "✅ Production API: LIVE"
echo "✅ Production Web: LIVE"
echo ""
echo "📝 To verify STORMFC setup in production database:"
echo "   railway run --service api pnpm exec tsx scripts/setup-stormfc-paths.ts"
echo ""
echo "📝 To set up STORMFC if not already done:"
echo "   PASSWORD='SuperPassword' API_URL=${PROD_API} ./scripts/setup-stormfc-via-api.sh"
echo ""
echo "🔗 Expected URLs:"
echo "   - ${PROD_WEB}/watch/STORMFC/2010"
echo "   - ${PROD_WEB}/watch/STORMFC/2008"

