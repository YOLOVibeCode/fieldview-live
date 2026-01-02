# 🚀 Production Readiness Checklist

This document outlines what needs to be done to prepare FieldView.live for production release.

---

## ✅ Already Implemented

### Infrastructure & Deployment
- [x] Dockerfiles for API and Web services
- [x] Railway deployment configuration
- [x] Environment variable templates (production & sandbox)
- [x] Health check endpoints (basic)
- [x] CI/CD pipeline (GitHub Actions)
- [x] Database migration setup

### Code Quality
- [x] TypeScript strict mode
- [x] Error handling middleware
- [x] Structured logging (Pino)
- [x] Rate limiting (basic implementation)
- [x] Input validation (Zod schemas)

---

## 🔴 Critical - Must Fix Before Production

### 1. Security Headers (Helmet)
**Status**: ❌ Missing  
**Priority**: CRITICAL  
**Impact**: XSS, clickjacking, MIME-type sniffing vulnerabilities

**Action Required**:
```bash
pnpm add helmet
```

Add to `apps/api/src/server.ts`:
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Adjust for Square SDK
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.squareup.com", "https://mux.com"],
    },
  },
}));
```

### 2. CORS Configuration
**Status**: ❌ Missing  
**Priority**: CRITICAL  
**Impact**: API will reject requests from web app

**Action Required**:
```bash
pnpm add cors
pnpm add -D @types/cors
```

Add to `apps/api/src/server.ts`:
```typescript
import cors from 'cors';

const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4300'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
```

### 3. Enhanced Health Checks
**Status**: ⚠️ Basic only  
**Priority**: HIGH  
**Impact**: Cannot detect database/Redis failures

**Action Required**: Update `apps/api/src/routes/health.ts` to check:
- Database connectivity
- Redis connectivity
- External service status (Mux, Square, Twilio)

### 4. Redis-backed Rate Limiting
**Status**: ⚠️ In-memory only  
**Priority**: HIGH  
**Impact**: Rate limits won't work across multiple API instances

**Action Required**: Update `apps/api/src/middleware/rateLimit.ts` to use Redis store:
```typescript
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

function createRateLimiter(options: Partial<Options>) {
  return rateLimit({
    ...options,
    store: new RedisStore({
      client: redis,
      prefix: 'rl:',
    }),
  });
}
```

### 5. Error Tracking (Sentry)
**Status**: ❌ Missing  
**Priority**: HIGH  
**Impact**: No visibility into production errors

**Action Required**:
```bash
pnpm add @sentry/node @sentry/nextjs
```

Configure Sentry for both API and Web apps.

### 6. Database Backup Strategy
**Status**: ⚠️ Railway auto-backups only  
**Priority**: HIGH  
**Impact**: No documented recovery procedure

**Action Required**: Document backup/restore procedures in `docs/backup-strategy.md`

---

## 🟡 Important - Should Fix Soon

### 7. Production Build Optimizations
**Status**: ⚠️ Partial  
**Priority**: MEDIUM

**Checklist**:
- [ ] API: Minify production builds
- [ ] Web: Verify Next.js production optimizations enabled
- [ ] Web: Add bundle analyzer
- [ ] Web: Optimize images (next/image)

### 8. Monitoring & Alerting
**Status**: ❌ Missing  
**Priority**: MEDIUM

**Action Required**:
- Set up Railway alerts for:
  - CPU/Memory thresholds
  - Error rate spikes
  - Deployment failures
- Configure Sentry alerts for:
  - Error rate > 5%
  - Payment failures
  - Webhook failures

### 9. Staging Environment
**Status**: ❌ Missing  
**Priority**: MEDIUM

**Action Required**:
- Create separate Railway project for staging
- Configure staging environment variables
- Set up staging database
- Document staging deployment process

### 10. API Documentation
**Status**: ⚠️ OpenAPI exists but not deployed  
**Priority**: MEDIUM

**Action Required**:
- Deploy OpenAPI docs (Redoc/Swagger UI)
- Add to production URL: `https://api.fieldview.live/docs`
- Keep docs in sync with code

### 11. Security Audit
**Status**: ❌ Not performed  
**Priority**: MEDIUM

**Checklist**:
- [ ] Dependency vulnerability scan (`pnpm audit`)
- [ ] OWASP Top 10 review
- [ ] Secrets audit (no hardcoded secrets)
- [ ] SQL injection review (Prisma should prevent, but verify)
- [ ] XSS review (React auto-escapes, but verify)
- [ ] CSRF protection (Next.js built-in, verify)

### 12. Performance Testing
**Status**: ❌ Not performed  
**Priority**: MEDIUM

**Action Required**:
- Load testing for:
  - Payment checkout flow
  - Watch page (concurrent viewers)
  - SMS webhook handling
- Set performance baselines
- Document performance targets

### 13. Logging Improvements
**Status**: ⚠️ Basic logging exists  
**Priority**: LOW

**Action Required**:
- Add structured logging for:
  - Payment lifecycle events
  - Viewer access events
  - Admin actions (audit log)
- Configure log aggregation (Railway or external)
- Set log retention policy

### 14. Documentation Updates
**Status**: ⚠️ Partial  
**Priority**: LOW

**Action Required**:
- [ ] Production runbook
- [ ] Incident response procedure
- [ ] Rollback procedure
- [ ] Database migration runbook
- [ ] Monitoring dashboard setup

---

## 📋 Pre-Launch Checklist

### Environment Setup
- [ ] Production Railway project created
- [ ] All environment variables configured
- [ ] Secrets rotated and secure
- [ ] Custom domains configured (if applicable)
- [ ] SSL certificates verified

### External Services
- [ ] Mux account configured (production)
- [ ] Square account configured (production)
- [ ] Twilio account configured (production)
- [ ] Webhooks configured and tested
- [ ] Square OAuth redirect URIs configured

### Database
- [ ] Production database created
- [ ] Migrations run successfully
- [ ] Backup strategy configured
- [ ] Connection pooling configured
- [ ] Database credentials secure

### Testing
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Manual smoke tests completed
- [ ] Payment flow tested end-to-end
- [ ] Streaming flow tested end-to-end
- [ ] SMS flow tested end-to-end

### Security
- [ ] Security headers configured (Helmet)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled (Redis-backed)
- [ ] Authentication tested
- [ ] Authorization tested
- [ ] Webhook signature verification tested
- [ ] No secrets in code/logs

### Monitoring
- [ ] Error tracking configured (Sentry)
- [ ] Health checks working
- [ ] Logging configured
- [ ] Alerts configured
- [ ] Monitoring dashboards set up

### Documentation
- [ ] API documentation deployed
- [ ] Deployment guide updated
- [ ] Runbook created
- [ ] Incident response procedure documented

---

## 🚨 Post-Launch Monitoring

### First 24 Hours
- [ ] Monitor error rates
- [ ] Monitor payment success rate
- [ ] Monitor API response times
- [ ] Monitor database performance
- [ ] Monitor external service health
- [ ] Check logs for anomalies

### First Week
- [ ] Review error patterns
- [ ] Review performance metrics
- [ ] Gather user feedback
- [ ] Review security logs
- [ ] Optimize based on real usage

---

## 📊 Success Metrics

### Reliability
- **Target**: 99.9% uptime
- **Monitor**: Railway uptime metrics
- **Alert**: If < 99% uptime

### Performance
- **SMS Response**: < 2s p95
- **Payment Page LCP**: < 2.5s p75
- **Watch Start Latency**: < 5s p95
- **Dashboard Load**: < 2s p95

### Security
- **Zero**: Critical vulnerabilities
- **Monitor**: Security alerts
- **Review**: Weekly security audit

### Business
- **Payment Success Rate**: > 85%
- **Refund Rate**: < 10%
- **Webhook Success Rate**: > 95%

---

## 🔧 Quick Wins (Can Do Now)

1. **Add Helmet** (15 min) - Critical security
2. **Add CORS** (10 min) - Required for web app
3. **Enhanced Health Checks** (30 min) - Better monitoring
4. **Redis Rate Limiting** (20 min) - Production-ready
5. **Sentry Setup** (30 min) - Error tracking

**Total Time**: ~2 hours for critical fixes

---

## 📚 Resources

- [Railway Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Environment Setup](./ENV_SETUP_GUIDE.md)
- [Design Document](./docs/09-design-document.md)
- [Security Considerations](./docs/06-nonfunctional-and-compliance.md)

---

**Last Updated**: 2024-12-20  
**Status**: Pre-Production  
**Next Review**: After critical fixes implemented

