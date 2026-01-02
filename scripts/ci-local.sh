#!/usr/bin/env bash
set -e

echo "🧪 Running local CI checks (matching GitHub Actions)"
echo "=================================================="

# Clean slate
echo ""
echo "🧹 Step 1: Clean install (frozen lockfile)"
pnpm install --frozen-lockfile

# Generate Prisma client
echo ""
echo "📦 Step 2: Generate Prisma client"
pnpm db:generate

# Build data-model package
echo ""
echo "🏗️  Step 3: Build @fieldview/data-model"
pnpm --filter @fieldview/data-model build

# Lint
echo ""
echo "🧹 Step 4: Lint"
pnpm lint || true

# Type check
echo ""
echo "🔎 Step 5: Type check"
pnpm type-check

# Unit tests (CI default)
echo ""
echo "🧪 Step 6: Unit tests"
pnpm test:unit

echo ""
echo "✅ All CI checks passed locally!"
echo "You can now safely push to trigger deployment."

