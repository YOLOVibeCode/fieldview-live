# Server Error Analysis & Remediation Plan

**Role: Architect**  
**Date: January 22, 2026**  
**Status: Analysis & Recommendations**

---

## Executive Summary

This document analyzes potential server errors in production and provides a comprehensive plan to:
1. Detect errors before deployment (preflight checks)
2. Monitor errors in production
3. Prevent common runtime failures
4. Ensure both API and WebUI work correctly after deployment

---

## Current Error Handling Architecture

### ✅ **What's Working:**

1. **Error Middleware** (`apps/api/src/middleware/errorHandler.ts`)
   - Catches all unhandled errors
   - Logs to Pino logger
   - Sends to Sentry (if configured)
   - Returns formatted error responses

2. **Health Check Endpoint** (`/health`)
   - Checks database connectivity
   - Checks Redis connectivity
   - Returns 503 if unhealthy

3. **Structured Logging**
   - Pino logger with structured JSON logs
   - Error context captured (stack, message, code)

### ⚠️ **Potential Issues Identified:**

1. **No Startup Validation**
   - Prisma Client initialized without connection test
   - Redis client initialized without connection test
   - No validation of required environment variables at startup

2. **No Preflight Runtime Checks**
   - Preflight build only checks compilation
   - Doesn't verify database connectivity
   - Doesn't verify Redis connectivity
   - Doesn't check required environment variables

3. **Silent Failures**
   - Prisma connection errors may not surface until first query
   - Redis connection errors may not surface until first operation
   - Missing env vars may cause runtime errors

4. **No API Health Verification in Preflight**
   - Can't verify API actually starts
   - Can't verify API responds to requests
   - Can't verify database migrations are applied

---

## Common Production Error Patterns

### 1. **Database Connection Errors**

**Symptoms:**
- `PrismaClientInitializationError`
- `Can't reach database server`
- `Connection timeout`

**Root Causes:**
- `DATABASE_URL` not set or invalid
- Database not accessible from Railway
- Database migrations not applied
- Connection pool exhausted

**Detection:**
- ✅ Health check endpoint tests this
- ❌ No preflight check for this
- ❌ No startup validation

### 2. **Redis Connection Errors**

**Symptoms:**
- `Redis connection failed`
- `ECONNREFUSED`
- Rate limiting not working

**Root Causes:**
- `REDIS_URL` not set or invalid
- Redis not accessible from Railway
- Redis service down

**Detection:**
- ✅ Health check endpoint tests this
- ❌ No preflight check for this
- ❌ No startup validation

### 3. **Missing Environment Variables**

**Symptoms:**
- `JWT_SECRET not configured` (logged but server continues)
- `SENTRY_DSN` missing (errors not tracked)
- `CORS_ORIGIN` defaults to localhost (CORS errors)

**Root Causes:**
- Environment variables not set in Railway
- Typos in variable names
- Required vars not documented

**Detection:**
- ⚠️ Some checks exist (JWT_SECRET logged)
- ❌ No comprehensive validation
- ❌ No preflight check

### 4. **Prisma Client Generation Issues**

**Symptoms:**
- `Module has no exported member`
- `PrismaClient is not a constructor`
- Type errors in API code

**Root Causes:**
- Prisma Client not generated before build
- Schema changes not reflected
- Build order issues

**Detection:**
- ✅ Preflight build checks this
- ✅ TypeScript compilation catches this

### 5. **Next.js Build/Runtime Errors**

**Symptoms:**
- `Export encountered errors`
- `useSearchParams without Suspense`
- SSR errors

**Root Causes:**
- Client-side code in server components
- Missing Suspense boundaries
- Environment variables not available at build time

**Detection:**
- ✅ Preflight build checks this
- ✅ Next.js build catches SSR errors

---

## Recommended Solution: Enhanced Preflight & Startup Validation

### Phase 1: Startup Validation (API)

**Add startup validation to `apps/api/src/server.ts`:**

```typescript
// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  // Optional but recommended: REDIS_URL, SENTRY_DSN
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  logger.error({ missing: missingVars }, 'Missing required environment variables');
  process.exit(1);
}

// Test database connection before starting server
try {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  logger.info('Database connection verified');
} catch (error) {
  logger.error({ error }, 'Database connection failed at startup');
  process.exit(1);
}

// Test Redis connection (if configured)
if (process.env.REDIS_URL) {
  try {
    await redisClient.ping();
    logger.info('Redis connection verified');
  } catch (error) {
    logger.warn({ error }, 'Redis connection failed (non-critical)');
  }
}
```

**Benefits:**
- Fails fast at startup (before accepting requests)
- Clear error messages
- Prevents serving requests with broken dependencies

### Phase 2: Enhanced Preflight Build

**Add to `scripts/preflight-build.sh`:**

```bash
###############################################################################
# Step 8: Runtime Validation (NEW)
###############################################################################
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔍 Step 8/8: Runtime validation...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check required environment variables
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Missing environment variables (will be set in Railway):${NC}"
  for var in "${MISSING_VARS[@]}"; do
    echo -e "   ${YELLOW}- $var${NC}"
  done
  echo -e "${YELLOW}   (This is OK for local preflight - Railway will have these)${NC}"
else
  echo -e "${GREEN}✅ Required environment variables present${NC}"
fi

# Test API can start (if DATABASE_URL is available)
if [ -n "$DATABASE_URL" ]; then
  echo -e "${CYAN}Testing API startup...${NC}"
  timeout 10s node apps/api/dist/server.js > /tmp/api-startup.log 2>&1 &
  API_PID=$!
  sleep 3
  
  # Check if API started successfully
  if ps -p $API_PID > /dev/null; then
    # Test health endpoint
    if curl -s http://localhost:4301/health > /dev/null 2>&1; then
      echo -e "${GREEN}✅ API started and health check passed${NC}"
      kill $API_PID 2>/dev/null || true
    else
      echo -e "${YELLOW}⚠️  API started but health check failed (check logs)${NC}"
      kill $API_PID 2>/dev/null || true
    fi
  else
    echo -e "${YELLOW}⚠️  API startup test skipped (no DATABASE_URL in local env)${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  API startup test skipped (DATABASE_URL not set locally)${NC}"
fi
```

**Benefits:**
- Validates API can actually start
- Tests health endpoint
- Catches runtime errors before deployment

### Phase 3: Enhanced Deployment Script

**Update `scripts/deploy-to-production.sh`:**

Add after preflight build:

```bash
echo ""
echo "🔍 Running post-build validation..."
echo ""

# Verify build artifacts are valid
if ! node -e "require('./apps/api/dist/server.js')" 2>/dev/null; then
  echo "❌ API build artifact is invalid"
  exit 1
fi

echo "✅ Build artifacts validated"
```

**Benefits:**
- Ensures built code is actually executable
- Catches issues with build output

---

## Implementation Plan

### Priority 1: Critical (Do First)

1. **Add startup validation to API** ⚠️ **HIGH IMPACT**
   - Prevents serving requests with broken dependencies
   - Fails fast with clear error messages
   - **File:** `apps/api/src/server.ts`

2. **Add environment variable validation** ⚠️ **HIGH IMPACT**
   - Prevents runtime errors from missing config
   - **File:** `apps/api/src/server.ts`

### Priority 2: Important (Do Next)

3. **Enhance preflight build with runtime checks** ⚠️ **MEDIUM IMPACT**
   - Validates API can start before deployment
   - **File:** `scripts/preflight-build.sh`

4. **Add post-build validation to deploy script** ⚠️ **MEDIUM IMPACT**
   - Ensures build artifacts are valid
   - **File:** `scripts/deploy-to-production.sh`

### Priority 3: Nice to Have

5. **Add health check to preflight** (if DATABASE_URL available)
6. **Add monitoring/alerting for production errors**
7. **Add error rate tracking**

---

## Testing Strategy

### Before Implementation:

1. **Test startup validation:**
   - Remove `DATABASE_URL` → Should fail at startup
   - Remove `JWT_SECRET` → Should fail at startup
   - Invalid `DATABASE_URL` → Should fail at startup

2. **Test preflight enhancements:**
   - Run preflight with/without `DATABASE_URL`
   - Verify API startup test works
   - Verify health check test works

3. **Test deployment script:**
   - Run full deployment flow
   - Verify all checks pass

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Startup validation | Low | Only validates what's already required |
| Preflight runtime checks | Low | Optional (skips if DATABASE_URL not set) |
| Post-build validation | Low | Simple require() check |

---

## Success Criteria

✅ **API startup validation:**
- Server fails fast if database unavailable
- Server fails fast if required env vars missing
- Clear error messages in logs

✅ **Enhanced preflight:**
- Validates API can start (if DATABASE_URL available)
- Validates health endpoint responds
- Doesn't block deployment if DATABASE_URL not set locally

✅ **Enhanced deployment:**
- Validates build artifacts are executable
- All checks pass before pushing to Railway

---

## Next Steps

1. **Review this plan** - Confirm approach
2. **Implement Priority 1** - Startup validation
3. **Test locally** - Verify behavior
4. **Implement Priority 2** - Preflight enhancements
5. **Deploy and monitor** - Verify in production

---

## Questions to Answer

1. Should startup validation be **strict** (exit on Redis failure) or **lenient** (warn only)?
   - **Recommendation:** Strict for DATABASE_URL, lenient for REDIS_URL

2. Should preflight runtime checks be **mandatory** or **optional**?
   - **Recommendation:** Optional (skip if DATABASE_URL not set locally)

3. What environment variables are **truly required** vs **optional**?
   - **Required:** DATABASE_URL, JWT_SECRET
   - **Recommended:** REDIS_URL, SENTRY_DSN, CORS_ORIGIN

---

**ROLE: architect**
