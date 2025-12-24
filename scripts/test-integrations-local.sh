#!/usr/bin/env bash
set -euo pipefail

# Loads env vars from common local files, then tests external integrations.
#
# Supported env files (first found wins, you can pass your own path too):
# - apps/api/.env
# - apps/web/.env.local
# - .env
# - ENV_SANDBOX_TEMPLATE.txt
#
# Usage:
#   ./scripts/test-integrations-local.sh
#   ./scripts/test-integrations-local.sh --env-file ENV_SANDBOX_TEMPLATE.txt

ENV_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    -*)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
    *)
      echo "Unexpected argument: $1" >&2
      exit 2
      ;;
  esac
done

pick_env_file() {
  if [[ -n "${ENV_FILE}" ]]; then
    echo "${ENV_FILE}"
    return 0
  fi
  if [[ -f "apps/api/.env" ]]; then echo "apps/api/.env"; return 0; fi
  if [[ -f "apps/web/.env.local" ]]; then echo "apps/web/.env.local"; return 0; fi
  if [[ -f ".env" ]]; then echo ".env"; return 0; fi
  if [[ -f "ENV_SANDBOX_TEMPLATE.txt" ]]; then echo "ENV_SANDBOX_TEMPLATE.txt"; return 0; fi
  echo ""
  return 0
}

SOURCE_FILE="$(pick_env_file)"
if [[ -z "${SOURCE_FILE}" ]]; then
  echo "No env file found. Create one of:" >&2
  echo "  - apps/api/.env" >&2
  echo "  - apps/web/.env.local" >&2
  echo "  - .env" >&2
  echo "  - ENV_SANDBOX_TEMPLATE.txt" >&2
  exit 1
fi

if [[ ! -f "${SOURCE_FILE}" ]]; then
  echo "Env file not found: ${SOURCE_FILE}" >&2
  exit 1
fi

echo "Loading env from: ${SOURCE_FILE}"

# shellcheck disable=SC1090
set -a
source "${SOURCE_FILE}"
set +a

missing=()
require_var() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "${value}" ]]; then
    missing+=("${name}")
  fi
}

http_code() {
  # Prints HTTP status code (or 000 on failure)
  curl -sS -o /dev/null -w "%{http_code}" "$@"
}

ok()   { echo "✅ $*"; }
warn() { echo "⚠️  $*"; }
fail() { echo "❌ $*"; }

echo
echo "== Checking required vars (non-empty) =="

# Mux
require_var MUX_TOKEN_ID
require_var MUX_TOKEN_SECRET

# Square (server-side)
require_var SQUARE_ENVIRONMENT
require_var SQUARE_ACCESS_TOKEN
require_var SQUARE_LOCATION_ID
require_var SQUARE_WEBHOOK_SIGNATURE_KEY

# Twilio
require_var TWILIO_ACCOUNT_SID
require_var TWILIO_AUTH_TOKEN
require_var TWILIO_PHONE_NUMBER

if [[ ${#missing[@]} -gt 0 ]]; then
  fail "Missing required env vars:"
  for v in "${missing[@]}"; do
    echo "  - ${v}"
  done
  echo
  echo "Fill them in and rerun."
  exit 1
fi

echo
echo "== Testing integrations =="

echo
echo "-- Mux --"
mux_status="$(http_code -u "${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}" "https://api.mux.com/video/v1/assets?limit=1")" || mux_status="000"
if [[ "${mux_status}" == "200" ]]; then
  ok "Mux credentials OK (assets list: HTTP 200)"
else
  fail "Mux credentials failed (assets list: HTTP ${mux_status})"
fi

echo
echo "-- Square --"
square_env="${SQUARE_ENVIRONMENT,,}"
square_base="https://connect.squareupsandbox.com"
if [[ "${square_env}" == "production" ]]; then
  square_base="https://connect.squareup.com"
fi
square_status="$(http_code \
  -H "Authorization: Bearer ${SQUARE_ACCESS_TOKEN}" \
  -H "Square-Version: 2024-01-18" \
  "${square_base}/v2/locations")" || square_status="000"
if [[ "${square_status}" == "200" ]]; then
  ok "Square access token OK (locations: HTTP 200)"
else
  fail "Square access token failed (locations: HTTP ${square_status})"
  warn "Check SQUARE_ENVIRONMENT matches the token type (sandbox vs production)."
fi

echo
echo "-- Twilio --"
twilio_status="$(http_code -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}" \
  "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}.json")" || twilio_status="000"
if [[ "${twilio_status}" == "200" ]]; then
  ok "Twilio credentials OK (account fetch: HTTP 200)"
else
  fail "Twilio credentials failed (account fetch: HTTP ${twilio_status})"
fi

echo
echo "== Optional sanity checks =="

if [[ -n "${NEXT_PUBLIC_API_URL:-}" ]]; then
  echo "NEXT_PUBLIC_API_URL is set (web -> api): OK"
else
  warn "NEXT_PUBLIC_API_URL is not set (web may default to localhost)."
fi

echo
echo "Done."
