#!/bin/bash
# Ensure super admin (admin@fieldview.live) exists locally and in production.
# Prompts for password once and calls POST /api/admin/setup/super-admin for each environment.
#
# Usage: ./scripts/ensure-super-admin.sh
# (Optional) Override URLs: LOCAL_API_URL=... PRODUCTION_API_URL=... ./scripts/ensure-super-admin.sh

set -e

LOCAL_API="${LOCAL_API_URL:-http://localhost:4301}"
PRODUCTION_API="${PRODUCTION_API_URL:-https://api.fieldview.live}"
ADMIN_EMAIL="admin@fieldview.live"

echo "Ensure super admin ($ADMIN_EMAIL) exists locally and remotely."
echo ""
echo -n "Admin password (min 8 chars): "
read -s PASSWORD
echo ""
echo ""

if [ -z "$PASSWORD" ] || [ ${#PASSWORD} -lt 8 ]; then
  echo "Password must be at least 8 characters."
  exit 1
fi

PAYLOAD=$(printf '{"email":"%s","password":"%s"}' "$ADMIN_EMAIL" "$PASSWORD")

# Local
echo "Local ($LOCAL_API)..."
RESP=$(curl -s -w "\n%{http_code}" -X POST "$LOCAL_API/api/admin/setup/super-admin" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")
CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')
if [ "$CODE" = "201" ]; then
  echo "   ✅ Super admin created"
elif [ "$CODE" = "200" ]; then
  echo "   ✅ Super admin already exists"
else
  echo "   ❌ Failed (HTTP $CODE): $BODY"
fi
echo ""

# Production
echo "Production ($PRODUCTION_API)..."
RESP=$(curl -s -w "\n%{http_code}" -X POST "$PRODUCTION_API/api/admin/setup/super-admin" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")
CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')
if [ "$CODE" = "201" ]; then
  echo "   ✅ Super admin created"
elif [ "$CODE" = "200" ]; then
  echo "   ✅ Super admin already exists"
else
  echo "   ❌ Failed (HTTP $CODE): $BODY"
fi
echo ""
echo "Done. Use the same password with add-direct-links-api.sh (it will prompt)."
echo ""
