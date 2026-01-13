# 🚀 Railway Deployment - Preflight Checklist

## ⚠️ BEFORE EVERY PUSH TO MAIN

**This checklist prevents Railway build failures by catching errors locally.**

---

## 🔴 MANDATORY: Run Preflight Build

```bash
./scripts/preflight-build.sh
```

**What it does:**
1. ✅ Cleans build artifacts (simulates fresh Railway environment)
2. ✅ Installs dependencies with frozen lockfile
3. ✅ Generates Prisma Client (most common failure point)
4. ✅ Builds data-model package
5. ✅ Builds API (strict TypeScript)
6. ✅ Builds Web

**Results:**
- ✅ **PASSES** → Safe to push. Railway will succeed.
- ❌ **FAILS** → Fix errors. Do NOT push.

---

## 📋 Pre-Push Checklist

### Before Committing

- [ ] Code compiles locally: `pnpm --filter api type-check`
- [ ] No `any` types added: `grep -r "any" apps/api/src --include="*.ts" | grep -v "node_modules"`
- [ ] Prisma schema valid: `pnpm exec prisma validate --schema=packages/data-model/prisma/schema.prisma`

### Before Pushing

- [ ] **Preflight build passes**: `./scripts/preflight-build.sh`
- [ ] All TypeScript errors fixed
- [ ] No uncommitted changes that might fix errors

### After Push (Monitor)

- [ ] Railway build starts (check https://railway.app)
- [ ] API build succeeds
- [ ] Web build succeeds
- [ ] Services deploy and become healthy

---

## 🔧 When Preflight Fails

### Step 1: Identify the Error

```bash
# See all TypeScript errors
pnpm --filter api type-check

# Or use debug workflow
./scripts/debug-railway-build.sh
```

### Step 2: Common Errors & Fixes

#### Error: `TS2305: Module has no exported member`

**Cause**: Prisma Client types not generated

**Fix**:
```bash
pnpm exec prisma generate --schema=packages/data-model/prisma/schema.prisma
```

#### Error: `TS7006: Parameter 'x' implicitly has an 'any' type`

**Cause**: Missing type annotation in function parameter

**Fix**: Add explicit type
```typescript
// ❌ Before
const items = data.map(item => item.name);

// ✅ After
const items = data.map((item: ItemType) => item.name);
```

#### Error: `TS2304: Cannot find name 'X'`

**Cause**: Missing import

**Fix**: Add the import
```typescript
import { X } from './path/to/module';
```

#### Error: `TS2322: Type 'X' is not assignable to type 'Y'`

**Cause**: Type mismatch

**Fix**: Correct the type or add type assertion
```typescript
// Option 1: Fix the type
const value: CorrectType = getData();

// Option 2: Type assertion (use sparingly)
const value = getData() as CorrectType;
```

### Step 3: Verify Fix

```bash
# Quick check
pnpm --filter api type-check

# Full preflight (recommended)
./scripts/preflight-build.sh
```

### Step 4: Push

```bash
git add -A
git commit -m "fix: TypeScript errors"
git push origin main
```

---

## 🛠️ Available Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `./scripts/preflight-build.sh` | Full Railway simulation | **Before EVERY push** |
| `./scripts/debug-railway-build.sh` | Debug failed builds | After Railway fails |
| `pnpm --filter api type-check` | Quick TypeScript check | During development |
| `railway logs --service api` | View Railway logs | Monitor deployment |

---

## 🔄 Debugging Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEBUGGING WORKFLOW                                │
└─────────────────────────────────────────────────────────────────────┘

1. Railway Build Failed
   │
   ▼
2. Run: ./scripts/debug-railway-build.sh
   │
   │ Shows Railway errors AND local errors
   │
   ▼
3. Fix each TypeScript error
   │
   ▼
4. Verify: pnpm --filter api type-check
   │
   │ Repeat until clean
   │
   ▼
5. Full check: ./scripts/preflight-build.sh
   │
   │ Must pass!
   │
   ▼
6. Push: git push origin main
   │
   ▼
7. Monitor Railway: https://railway.app
```

---

## 🚨 Emergency: Skip Pre-Push Hook

**Only use in emergencies!**

```bash
git push --no-verify
```

⚠️ **Warning**: This bypasses all safety checks. Only use when:
- Production is down
- You've manually verified the build
- You accept the risk of Railway failure

---

## 📊 Why Local Builds Differ from Railway

| Aspect | Local | Railway |
|--------|-------|---------|
| **Prisma Client** | May exist from previous builds | Must generate fresh each time |
| **node_modules** | Cached | Fresh install |
| **Build artifacts** | May exist | Always clean |
| **Environment** | macOS/Linux | Linux container |

The preflight script **simulates Railway's fresh environment** to catch these differences.

---

## ✅ Success Criteria

Your code is ready to push when:

1. ✅ `./scripts/preflight-build.sh` completes successfully
2. ✅ No TypeScript errors in output
3. ✅ All 6 steps pass:
   - Dependencies installed
   - Prisma Client generated
   - data-model built
   - API built
   - Web built
   - "SAFE TO DEPLOY" message shown

---

## 📚 Additional Resources

- **[README.md](./README.md)** - Project overview
- **[DEPLOYMENT_OPTIONS.md](./DEPLOYMENT_OPTIONS.md)** - Full deployment guide
- **[.cursorrules](./.cursorrules)** - Cursor AI rules (includes Railway section)

---

## 🎯 Quick Reference

```bash
# 🔴 ALWAYS RUN FIRST
./scripts/preflight-build.sh

# Debug if needed
./scripts/debug-railway-build.sh

# Check types quickly
pnpm --filter api type-check

# When ready
git push origin main

# Monitor
railway logs --service api
```

---

**Remember: A 3-minute preflight build saves hours of debugging Railway failures!**

