#!/usr/bin/env bash
# Railway Deploy via MCP – convenience wrapper.
# Runs prep (preflight + version + commit); deployment is done via Railway MCP in Cursor.
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
pnpm exec tsx scripts/deploy-railway-mcp.ts "$@"
echo ""
echo "Next: In Cursor, trigger Railway MCP deploy for services 'api' and 'web', then verify with list-deployments."
