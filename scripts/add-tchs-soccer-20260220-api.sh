#!/bin/bash
# Add TCHS Soccer Feb 20 direct links. Uses admin password (env ADMIN_PASSWORD or prompt).
# Stream admin password for these links: tchs2026 (STREAM_ADMIN_PASSWORD).
# Local:   ./scripts/add-tchs-soccer-20260220-api.sh
# Production: ./scripts/add-tchs-soccer-20260220-api.sh https://api.fieldview.live

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export STREAM_ADMIN_PASSWORD="${STREAM_ADMIN_PASSWORD:-tchs2026}"
if [ -n "$1" ] && [[ "$1" == http* ]]; then
  "$SCRIPT_DIR/add-direct-links-api.sh" "$1" tchs/soccer-20260220-jv2 tchs/soccer-20260220-jv tchs/soccer-20260220-varsity
else
  "$SCRIPT_DIR/add-direct-links-api.sh" tchs/soccer-20260220-jv2 tchs/soccer-20260220-jv tchs/soccer-20260220-varsity
fi
