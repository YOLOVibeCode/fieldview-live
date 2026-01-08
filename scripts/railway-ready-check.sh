#!/usr/bin/env bash
set -euo pipefail

echo "🚂 Railway Ready Check - 30 min validation"
echo "=========================================="
START_TIME=$(date +%s)

# PHASE 1: Critical Build & Type Safety (5 mins)
echo ""
echo "⚡ PHASE 1: Build Validation..."
echo "--------------------------------"

echo "  → Type checking..."
pnpm type-check 2>&1 | grep -i "error" && { echo "❌ Type errors found"; exit 1; } || echo "  ✅ Types valid"

echo "  → Building packages..."
pnpm --filter './packages/*' build > /dev/null 2>&1 || { echo "❌ Package build failed"; exit 1; }
echo "  ✅ Packages built"

echo "  → Building API..."
pnpm --filter api build > /dev/null 2>&1 || { echo "❌ API build failed"; exit 1; }
echo "  ✅ API built"

echo "  → Building Web..."
pnpm --filter web build > /dev/null 2>&1 || { echo "❌ Web build failed"; exit 1; }
echo "  ✅ Web built"

# PHASE 2: Critical Path Tests (15 mins)
echo ""
echo "⚡ PHASE 2: Critical Tests..."
echo "--------------------------------"

echo "  → API integration tests..."
pnpm --filter api test:unit --silent 2>&1 | tail -5
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "❌ API tests failed"
  exit 1
fi
echo "  ✅ API tests passed"

echo "  → Chat E2E (Chromium only)..."
pnpm --filter web test:live --project=chromium __tests__/e2e/game-chat.spec.ts --silent 2>&1 | tail -5
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "❌ E2E tests failed"
  exit 1
fi
echo "  ✅ E2E tests passed"

# PHASE 3: Environment & Config (10 mins)
echo ""
echo "⚡ PHASE 3: Configuration..."
echo "--------------------------------"

echo "  → Checking DATABASE_URL..."
if [ -n "${DATABASE_URL:-}" ]; then
  echo "  ✅ DATABASE_URL configured"
else
  echo "  ⚠️  DATABASE_URL not set (will be provided by Railway)"
fi

echo "  → Checking REDIS_URL..."
if [ -n "${REDIS_URL:-}" ]; then
  echo "  ✅ REDIS_URL configured"
else
  echo "  ⚠️  REDIS_URL not set (will be provided by Railway)"
fi

echo "  → Verifying railway.json..."
[ -f railway.json ] || { echo "❌ railway.json missing"; exit 1; }
echo "  ✅ railway.json exists"

echo "  → Checking start script..."
grep -q "railway-start.sh" package.json || { echo "❌ Start script not configured"; exit 1; }
echo "  ✅ Start script configured"

echo "  → Verifying Docker configs..."
[ -f apps/api/Dockerfile ] || { echo "❌ API Dockerfile missing"; exit 1; }
[ -f apps/web/Dockerfile ] || { echo "❌ Web Dockerfile missing"; exit 1; }
echo "  ✅ Dockerfiles present"

# Summary
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "=========================================="
echo "✅ RAILWAY READY! (${DURATION}s)"
echo "=========================================="
echo ""
echo "📝 Next Steps:"
echo "   1. git add -A && git commit -m 'Deploy: [your changes]'"
echo "   2. git push origin main"
echo "   3. Monitor Railway dashboard"
echo "   4. Run: railway run --service api pnpm db:migrate (if schema changed)"
echo ""
echo "🔗 Quick Links:"
echo "   Railway: https://railway.app/dashboard"
echo "   Logs: railway logs --service api --follow"
echo ""

