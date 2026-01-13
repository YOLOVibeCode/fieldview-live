# 🚀 Production Readiness Guide - Authentication Workflows

**Date:** January 11, 2026  
**Status:** Pre-Deployment Checklist  
**Target:** Production deployment of Password Reset & Viewer Refresh

---

## ✅ Pre-Deployment Checklist

### 1. Environment Configuration

#### Required Environment Variables

```bash
# Application
NODE_ENV=production
APP_URL=https://fieldview.live
WEB_APP_URL=https://fieldview.live
API_URL=https://api.fieldview.live

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
DATABASE_PUBLIC_URL=postgresql://user:pass@public-host:5432/db

# Redis (for rate limiting & sessions)
REDIS_URL=redis://host:6379

# Email Provider (SendGrid recommended)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@fieldview.live

# Security
SESSION_SECRET=<64-char-random-string>
CORS_ORIGIN=https://fieldview.live

# Monitoring (optional but recommended)
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=info

# Feature Flags
ENABLE_RATE_LIMITING=true
ENABLE_EMAIL_VERIFICATION=true
```

#### Generate Secrets

```bash
# Generate SESSION_SECRET
openssl rand -hex 32

# Generate API keys (if needed)
openssl rand -base64 32
```

#### Validate Configuration

```bash
# Check all required env vars are set
node scripts/validate-env.js

# Test database connection
pnpm --filter api prisma migrate status

# Test Redis connection
redis-cli -u $REDIS_URL ping
```

---

### 2. Database Migrations

#### Run Migrations

```bash
# Production migration (non-interactive)
pnpm --filter data-model prisma migrate deploy

# Verify migration status
pnpm --filter data-model prisma migrate status

# Check current schema
pnpm --filter data-model prisma db pull
```

#### Verify Schema

```sql
-- Verify PasswordResetToken table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'PasswordResetToken';

-- Verify ViewerRefreshToken table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ViewerRefreshToken';

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('PasswordResetToken', 'ViewerRefreshToken');
```

#### Backup Database

```bash
# Create backup before deployment
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Upload to secure storage
aws s3 cp backup-*.sql s3://fieldview-backups/
```

---

### 3. Email Configuration

#### SendGrid Setup

1. **Create API Key:**
   - Go to SendGrid Console
   - Settings → API Keys → Create API Key
   - Full Access (or Mail Send only)
   - Copy key (only shown once)

2. **Verify Domain:**
   - Settings → Sender Authentication
   - Authenticate Your Domain
   - Add DNS records:
     ```
     CNAME: em1234.fieldview.live → u1234.wl.sendgrid.net
     CNAME: s1._domainkey.fieldview.live → s1.domainkey.u1234.wl.sendgrid.net
     CNAME: s2._domainkey.fieldview.live → s2.domainkey.u1234.wl.sendgrid.net
     ```
   - Verify DNS propagation

3. **Configure From Email:**
   - Settings → Sender Identity
   - Add Single Sender: noreply@fieldview.live
   - Verify email address

4. **Test Email:**
   ```bash
   curl -X POST https://api.sendgrid.com/v3/mail/send \
     -H "Authorization: Bearer $SENDGRID_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "personalizations": [{"to": [{"email": "test@example.com"}]}],
       "from": {"email": "noreply@fieldview.live"},
       "subject": "Test Email",
       "content": [{"type": "text/plain", "value": "Test"}]
     }'
   ```

#### Email Templates Validation

```bash
# Test password reset email rendering
pnpm --filter api test:unit authEmailService

# Test viewer refresh email rendering
pnpm --filter api test:unit authEmailService

# Manual template test
node scripts/test-email-template.js
```

---

### 4. Security Hardening

#### HTTPS Enforcement

```typescript
// middleware/security.ts
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}
```

#### Security Headers

```typescript
// Already configured in apps/api/src/index.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

#### Rate Limiting

```typescript
// Verify rate limiting is enabled
if (process.env.ENABLE_RATE_LIMITING !== 'true') {
  console.warn('⚠️  Rate limiting is DISABLED in production!');
}
```

#### Secrets Audit

```bash
# Check for hardcoded secrets
git secrets --scan

# Check for secrets in environment
grep -r "API_KEY\|SECRET\|PASSWORD" .env

# Verify no secrets in code
grep -r "sk_live\|SG\.\|postgres://" apps/
```

---

### 5. Testing

#### Run Full Test Suite

```bash
# Unit tests (API)
pnpm --filter api test:unit

# Unit tests (Web)
pnpm --filter web test:unit

# E2E tests (requires running app)
pnpm --filter web test:live

# All tests
pnpm test
```

#### Manual Smoke Tests

**Password Reset - Owner:**
1. Navigate to https://fieldview.live/forgot-password
2. Select "Team Owner / Staff"
3. Enter valid email
4. Submit form
5. ✓ Verify success message
6. ✓ Check inbox for email
7. Click reset link in email
8. ✓ Verify reset page loads
9. Enter strong password
10. Confirm password
11. Submit
12. ✓ Verify success animation
13. ✓ Verify redirect to login
14. Login with new password
15. ✓ Verify login successful

**Password Reset - Admin:**
1. Follow same flow as owner
2. Select "🔒 Super Admin"
3. ✓ Check email for MFA warning
4. Complete reset
5. ✓ Verify MFA reset required on next login

**Viewer Refresh:**
1. Navigate to stream page (not registered)
2. ✓ Access denied overlay appears
3. Enter email
4. Submit
5. ✓ Verify success message
6. Check inbox for email
7. Click verify link
8. ✓ Verify access restored
9. ✓ Verify countdown starts
10. ✓ Verify redirect to stream

**Error Scenarios:**
1. Try expired token (> 15 minutes old)
2. Try used token (click link twice)
3. Try invalid token (modify URL)
4. Try rate limiting (4 requests in 1 hour)
5. Try weak password
6. Try password mismatch

---

### 6. Performance Optimization

#### Database Indexes

```sql
-- Verify indexes exist
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('PasswordResetToken', 'ViewerRefreshToken');

-- Expected indexes:
-- PasswordResetToken_tokenHash_key (UNIQUE)
-- PasswordResetToken_email_idx
-- PasswordResetToken_expiresAt_idx
-- ViewerRefreshToken_tokenHash_key (UNIQUE)
-- ViewerRefreshToken_viewerIdentityId_idx
-- ViewerRefreshToken_expiresAt_idx
```

#### Query Performance

```bash
# Enable query logging (temporarily)
export LOG_LEVEL=debug

# Check slow queries
psql $DATABASE_URL -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  WHERE query LIKE '%ResetToken%'
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"
```

#### API Response Times

```bash
# Test API endpoints
curl -w "@curl-format.txt" -o /dev/null -s \
  https://api.fieldview.live/api/auth/password-reset/request

# Expected: < 500ms
```

#### Frontend Load Times

```bash
# Lighthouse CI
npm install -g @lhci/cli

lhci autorun \
  --collect.url=https://fieldview.live/forgot-password \
  --collect.url=https://fieldview.live/reset-password \
  --collect.url=https://fieldview.live/verify-access
```

---

### 7. Monitoring Setup

#### Error Tracking (Sentry)

```typescript
// apps/api/src/index.ts
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1
  });
}
```

#### Logging Configuration

```typescript
// apps/api/src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined
});
```

#### Health Checks

```typescript
// apps/api/src/routes/health.ts
router.get('/health', async (req, res) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis
    await redis.ping();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      redis: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

#### Uptime Monitoring

```yaml
# UptimeRobot or similar
endpoints:
  - https://api.fieldview.live/health (every 5 minutes)
  - https://fieldview.live/forgot-password (every 15 minutes)
  - https://fieldview.live/reset-password (every 15 minutes)

alerts:
  - email: devops@fieldview.live
  - slack: #alerts
  - sms: +1-xxx-xxx-xxxx (critical only)
```

---

### 8. Deployment Process

#### Railway Deployment

```bash
# Step 1: Run preflight build (MANDATORY)
./scripts/preflight-build.sh

# Step 2: If preflight passes, commit and push
git add -A
git commit -m "feat: password reset & viewer refresh workflows"
git push origin main

# Step 3: Monitor Railway deployment
railway logs --service api --follow

# Step 4: Verify deployment health
curl https://api.fieldview.live/health
```

#### Post-Deployment Verification

```bash
# 1. Check API health
curl https://api.fieldview.live/health

# 2. Test password reset flow
curl -X POST https://api.fieldview.live/api/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "userType": "owner_user"}'

# 3. Check Railway logs
railway logs --service api | grep "Password reset"

# 4. Monitor Sentry for errors
open https://sentry.io/organizations/fieldview/issues/

# 5. Check email delivery
open https://app.sendgrid.com/statistics/overview
```

---

### 9. Rollback Plan

#### If Deployment Fails

```bash
# Option 1: Revert to previous commit
git revert HEAD
git push origin main

# Option 2: Railway rollback
railway rollback --service api

# Option 3: Database rollback (if needed)
psql $DATABASE_URL < backup-YYYYMMDD-HHMMSS.sql
```

#### If Email Delivery Fails

```bash
# 1. Check SendGrid status
curl https://status.sendgrid.com/api/v2/status.json

# 2. Verify API key
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@fieldview.live"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'

# 3. Fallback to Mailpit (local testing only)
export EMAIL_PROVIDER=mailpit
railway restart --service api
```

---

### 10. Documentation

#### Update User Documentation

- [ ] Add "Forgot Password" to help center
- [ ] Add "Access Expired" to viewer guide
- [ ] Update FAQ with common issues
- [ ] Add password requirements to signup
- [ ] Document email delivery times

#### Update Internal Documentation

- [ ] Update API documentation
- [ ] Update deployment guide
- [ ] Update runbook with troubleshooting
- [ ] Update security policy
- [ ] Document monitoring alerts

---

## 📊 Success Metrics

### Launch Metrics (Week 1)

| Metric | Target | Tracking |
|--------|--------|----------|
| **Password Reset Requests** | Track baseline | Sentry |
| **Success Rate** | > 95% | Logs |
| **Email Delivery Rate** | > 98% | SendGrid |
| **API Response Time** | < 500ms | Sentry |
| **Error Rate** | < 2% | Sentry |
| **User Satisfaction** | > 4.5/5 | Feedback |

### Long-Term Metrics (Monthly)

| Metric | Target | Action |
|--------|--------|--------|
| **Token Expiry Rate** | < 30% | Consider longer expiry |
| **Rate Limit Hit Rate** | < 5% | Review limits |
| **Email Bounce Rate** | < 2% | Clean email list |
| **Support Tickets** | < 10/month | Improve UX |

---

## 🚨 Incident Response

### Severity Levels

**P0 (Critical):**
- Complete service outage
- Data breach or security incident
- Response time: 15 minutes
- Escalation: CTO immediately

**P1 (High):**
- Password reset not working
- Email delivery failed
- Response time: 1 hour
- Escalation: Lead developer

**P2 (Medium):**
- Slow API responses
- Increased error rate
- Response time: 4 hours
- Escalation: On-call engineer

**P3 (Low):**
- UI issues
- Non-critical bugs
- Response time: Next business day
- Escalation: Via ticket system

### Incident Checklist

1. [ ] Acknowledge incident (< 15 min)
2. [ ] Assess severity (P0-P3)
3. [ ] Notify stakeholders
4. [ ] Check monitoring dashboards
5. [ ] Review recent changes (git log)
6. [ ] Check third-party status (SendGrid, Railway)
7. [ ] Implement fix or rollback
8. [ ] Verify resolution
9. [ ] Post-mortem (for P0/P1)
10. [ ] Update documentation

---

## 📞 Support Contacts

### Internal Team

- **Engineering Lead:** lead@fieldview.live
- **DevOps:** devops@fieldview.live
- **Security:** security@fieldview.live

### Third-Party Services

- **Railway Support:** support@railway.app
- **SendGrid Support:** https://support.sendgrid.com
- **Sentry Support:** support@sentry.io

### Emergency Contacts

- **On-Call:** [PagerDuty / phone number]
- **CTO:** [phone number]

---

## ✅ Final Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Email provider configured and tested
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] All tests passing (unit + E2E)
- [ ] Manual smoke tests completed
- [ ] Performance benchmarks met
- [ ] Monitoring configured
- [ ] Error tracking configured
- [ ] Health checks working
- [ ] Backup created
- [ ] Rollback plan documented
- [ ] Documentation updated
- [ ] Team trained
- [ ] Stakeholders notified

---

**Production deployment requires careful planning and testing!** 🚀

**When all checks are green, you're ready to deploy with confidence!** ✅

