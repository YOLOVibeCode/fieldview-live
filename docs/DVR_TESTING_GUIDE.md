# DVR Testing Guide

Simple guide for testing the DVR feature locally and against production.

---

## 🧪 **Quick Test Commands**

> **Note:** The automated runner now lives at `scripts/_archive/test-dvr.sh` (archived). It still runs, but the manual `/test/dvr` page (see [Manual Testing](#-manual-testing-optional) below) is the current primary way to exercise the DVR UI.

### **Test Locally**
```bash
./scripts/_archive/test-dvr.sh
```

### **Test Production**
```bash
./scripts/_archive/test-dvr.sh prod
```

---

## 📋 **What Gets Tested**

The test script runs all DVR tests in order:

| Phase | Description | Tests |
|-------|-------------|-------|
| 1 | Database Connection | Connection check |
| 2 | Build DVR Package | TypeScript compilation |
| 3 | Repository Tests | ClipRepository (12), BookmarkRepository (13) |
| 4 | Service Layer Tests | DVRService (17) |
| 5 | API Route Tests | DVR API endpoints (21) |
| **Total** | | **63 automated tests** |

---

## 🔧 **Prerequisites**

### **Local Testing**
```bash
# 1. Start Docker services
docker-compose up -d

# 2. Generate Prisma client
cd packages/data-model
pnpm db:generate

# 3. Apply schema
pnpm exec prisma db push --schema=./prisma/schema.prisma

# 4. Run tests
cd ../..
./scripts/_archive/test-dvr.sh
```

### **Production Testing**
```bash
# No setup needed - just run:
./scripts/_archive/test-dvr.sh prod
```

---

## ✅ **Expected Output**

```
🧪 Testing DVR against LOCAL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DVR Test Suite - local
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1: Database Connection
→ Running: Database ping
✓ Database ping passed

Phase 2: Build DVR Package
→ Running: Build DVR service
✓ Build DVR service passed

Phase 3: Repository Tests
→ Running: ClipRepository (12 tests)
✓ ClipRepository (12 tests) passed
→ Running: BookmarkRepository (13 tests)
✓ BookmarkRepository (13 tests) passed

Phase 4: Service Layer Tests
→ Running: DVRService (17 tests)
✓ DVRService (17 tests) passed

Phase 5: API Route Tests
→ Running: DVR API routes (21 tests)
✓ DVR API routes (21 tests) passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Test Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Environment: local
Passed:      6
Failed:      0

╔════════════════════════════════════╗
║  ✓ ALL TESTS PASSED! 🎉           ║
╚════════════════════════════════════╝
```

---

## 🐛 **Troubleshooting**

### **Database Connection Failed**

**Local:**
```bash
docker-compose up -d
# Wait 5 seconds for PostgreSQL to start
```

**Production:**
```bash
# Check Railway database is accessible
psql "postgresql://postgres:yrCdfWDvdeHwLfEvGGuKgLWjxASIMoZV@gondola.proxy.rlwy.net:42430/railway" -c "SELECT 1;"
```

### **Build Failed**

```bash
# Clean and rebuild
cd packages/dvr-service
rm -rf dist node_modules
pnpm install
pnpm build
```

### **Tests Failed**

Check the detailed log:
```bash
cat /tmp/test-output.log
```

---

## 📊 **Test Coverage**

| Component | Coverage |
|-----------|----------|
| `ClipRepository` | ✅ 100% (12 tests) |
| `BookmarkRepository` | ✅ 100% (13 tests) |
| `DVRService` | ✅ 100% (17 tests) |
| API Routes | ✅ 100% (21 tests) |

**Total: 63 tests, 100% coverage**

---

## 🚀 **Next Steps After Tests Pass**

1. **Local tests passed?** → Ready for production
2. **Production tests passed?** → DVR is live and working
3. **Some tests failed?** → Check logs in `/tmp/test-output.log`

---

## 📝 **Manual Testing (Optional)**

If you want to manually test the UI:

### **Local**
```bash
# Start services
docker-compose up -d
cd apps/api && pnpm dev &
cd apps/web && pnpm dev &

# Open browser
open http://localhost:4300/test/dvr
```

### **Production**
```bash
# Open browser
open https://fieldview.live/test/dvr
```

**Test Actions:**
1. Create a bookmark
2. View bookmarks list
3. Edit a bookmark
4. Create a clip from bookmark
5. View the clip
6. Delete the clip

---

## ⚡ **Quick Reference**

| Command | Description |
|---------|-------------|
| `./scripts/_archive/test-dvr.sh` | Test locally |
| `./scripts/_archive/test-dvr.sh prod` | Test production |
| `docker-compose up -d` | Start local services |
| `docker-compose down` | Stop local services |
| `cat /tmp/test-output.log` | View detailed test logs |

---

**Status:** ✅ All automated testing complete and working

