#!/bin/bash
# Test script for production password fix

API_URL="${API_URL:-https://api.fieldview.live}"

echo "🧪 Testing Production Password Fix"
echo "API URL: $API_URL"
echo ""

echo "Test 1: Uppercase password (ADMIN2026)"
RESPONSE1=$(curl -s -X POST "$API_URL/api/direct/StormFC" \
  -H "Content-Type: application/json" \
  -d '{"streamUrl":"https://test.example.com/stream.m3u8","password":"ADMIN2026"}')
echo "$RESPONSE1" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE1"
echo ""

echo "Test 2: Lowercase password (admin2026)"
RESPONSE2=$(curl -s -X POST "$API_URL/api/direct/StormFC" \
  -H "Content-Type: application/json" \
  -d '{"streamUrl":"https://test2.example.com/stream.m3u8","password":"admin2026"}')
echo "$RESPONSE2" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE2"
echo ""

echo "Test 3: Mixed case password (Admin2026)"
RESPONSE3=$(curl -s -X POST "$API_URL/api/direct/StormFC" \
  -H "Content-Type: application/json" \
  -d '{"streamUrl":"https://test3.example.com/stream.m3u8","password":"Admin2026"}')
echo "$RESPONSE3" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE3"
echo ""

echo "Test 4: Invalid password (should fail)"
RESPONSE4=$(curl -s -X POST "$API_URL/api/direct/StormFC" \
  -H "Content-Type: application/json" \
  -d '{"streamUrl":"https://test4.example.com/stream.m3u8","password":"wrongpassword"}')
echo "$RESPONSE4" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE4"
echo ""

echo "Test 5: Verify stream was saved"
RESPONSE5=$(curl -s "$API_URL/api/direct/StormFC")
echo "$RESPONSE5" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE5"
echo ""

# Check if any test succeeded
if echo "$RESPONSE1" | grep -q '"success"'; then
  echo "✅ Test 1 PASSED - Uppercase password works!"
elif echo "$RESPONSE1" | grep -q "Cannot POST"; then
  echo "⚠️  Route not deployed yet. Wait for Railway deployment to complete."
else
  echo "❌ Test 1 FAILED"
fi

