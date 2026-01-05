#!/bin/bash
# Check Square environment variables setup

echo "🔍 Checking Square Environment Variables..."
echo ""

# Check API .env
API_ENV="apps/api/.env"
if [ -f "$API_ENV" ]; then
  echo "✅ Found: $API_ENV"
  echo ""
  echo "Backend Variables:"
  
  if grep -q "SQUARE_ACCESS_TOKEN=" "$API_ENV" && ! grep -q "SQUARE_ACCESS_TOKEN=\"\"" "$API_ENV"; then
    echo "  ✅ SQUARE_ACCESS_TOKEN"
  else
    echo "  ❌ SQUARE_ACCESS_TOKEN (missing or empty)"
  fi
  
  if grep -q "SQUARE_LOCATION_ID=" "$API_ENV" && ! grep -q "SQUARE_LOCATION_ID=\"\"" "$API_ENV"; then
    echo "  ✅ SQUARE_LOCATION_ID"
  else
    echo "  ❌ SQUARE_LOCATION_ID (missing or empty)"
  fi
  
  if grep -q "SQUARE_WEBHOOK_SIGNATURE_KEY=" "$API_ENV" && ! grep -q "SQUARE_WEBHOOK_SIGNATURE_KEY=\"\"" "$API_ENV"; then
    echo "  ✅ SQUARE_WEBHOOK_SIGNATURE_KEY"
  else
    echo "  ❌ SQUARE_WEBHOOK_SIGNATURE_KEY (missing or empty)"
  fi
  
  if grep -q "SQUARE_APPLICATION_ID=" "$API_ENV" && ! grep -q "SQUARE_APPLICATION_ID=\"\"" "$API_ENV"; then
    echo "  ✅ SQUARE_APPLICATION_ID"
  else
    echo "  ❌ SQUARE_APPLICATION_ID (missing or empty)"
  fi
  
  if grep -q "SQUARE_APPLICATION_SECRET=" "$API_ENV" && ! grep -q "SQUARE_APPLICATION_SECRET=\"\"" "$API_ENV"; then
    echo "  ✅ SQUARE_APPLICATION_SECRET"
  else
    echo "  ❌ SQUARE_APPLICATION_SECRET (missing or empty)"
  fi
  
  if grep -q "SQUARE_ENVIRONMENT=" "$API_ENV"; then
    ENV_VALUE=$(grep "SQUARE_ENVIRONMENT=" "$API_ENV" | cut -d'=' -f2 | tr -d '"')
    if [ "$ENV_VALUE" = "sandbox" ]; then
      echo "  ✅ SQUARE_ENVIRONMENT=sandbox"
    else
      echo "  ⚠️  SQUARE_ENVIRONMENT=$ENV_VALUE (should be 'sandbox' for local)"
    fi
  else
    echo "  ❌ SQUARE_ENVIRONMENT (missing)"
  fi
else
  echo "❌ Not found: $API_ENV"
  echo "  Create it from: ENV_SANDBOX_TEMPLATE.txt"
fi

echo ""
echo "Frontend Variables:"

WEB_ENV="apps/web/.env.local"
if [ -f "$WEB_ENV" ]; then
  echo "✅ Found: $WEB_ENV"
  echo ""
  
  if grep -q "NEXT_PUBLIC_SQUARE_APPLICATION_ID=" "$WEB_ENV" && ! grep -q "NEXT_PUBLIC_SQUARE_APPLICATION_ID=\"\"" "$WEB_ENV"; then
    echo "  ✅ NEXT_PUBLIC_SQUARE_APPLICATION_ID"
  else
    echo "  ❌ NEXT_PUBLIC_SQUARE_APPLICATION_ID (missing or empty)"
  fi
  
  if grep -q "NEXT_PUBLIC_SQUARE_LOCATION_ID=" "$WEB_ENV" && ! grep -q "NEXT_PUBLIC_SQUARE_LOCATION_ID=\"\"" "$WEB_ENV"; then
    echo "  ✅ NEXT_PUBLIC_SQUARE_LOCATION_ID"
  else
    echo "  ❌ NEXT_PUBLIC_SQUARE_LOCATION_ID (missing or empty)"
  fi
  
  if grep -q "NEXT_PUBLIC_SQUARE_ENVIRONMENT=" "$WEB_ENV"; then
    ENV_VALUE=$(grep "NEXT_PUBLIC_SQUARE_ENVIRONMENT=" "$WEB_ENV" | cut -d'=' -f2 | tr -d '"')
    if [ "$ENV_VALUE" = "sandbox" ]; then
      echo "  ✅ NEXT_PUBLIC_SQUARE_ENVIRONMENT=sandbox"
    else
      echo "  ⚠️  NEXT_PUBLIC_SQUARE_ENVIRONMENT=$ENV_VALUE (should be 'sandbox' for local)"
    fi
  else
    echo "  ❌ NEXT_PUBLIC_SQUARE_ENVIRONMENT (missing)"
  fi
else
  echo "❌ Not found: $WEB_ENV"
  echo "  Create it from: ENV_SANDBOX_TEMPLATE.txt"
fi

echo ""
echo "📖 For detailed setup instructions, see: SQUARE-LOCAL-SETUP.md"
echo ""
echo "🔗 Get credentials from: https://developer.squareup.com/apps"

