#!/bin/bash
# Add TCHS Soccer March 13, 2026 direct stream events (JV2, JV, Varsity).
# Uses POST /api/admin/seed/tchs-mar13 (idempotent). No auth required.
#
# Local:   ./scripts/add-tchs-soccer-20260313-api.sh
# Production: ./scripts/add-tchs-soccer-20260313-api.sh https://api.fieldview.live

API_BASE_URL="${1:-http://localhost:4301}"

echo "Seeding TCHS March 13 events via $API_BASE_URL ..."
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/api/admin/seed/tchs-mar13" -H "Content-Type: application/json")
CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$CODE" = "200" ]; then
  echo "$BODY" | head -20
  echo ""
  echo "URLs:"
  echo "  https://fieldview.live/direct/tchs/soccer-20260313-jv2"
  echo "  https://fieldview.live/direct/tchs/soccer-20260313-jv"
  echo "  https://fieldview.live/direct/tchs/soccer-20260313-varsity"
  echo "Admin password: tchs2026"
else
  echo "Seed failed (HTTP $CODE)"
  echo "$BODY"
  exit 1
fi
