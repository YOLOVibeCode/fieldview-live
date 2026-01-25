# Real-Time Deployment Monitoring

**Date:** January 23, 2026  
**Status:** ✅ Complete  
**Role:** Engineer (STRICT=false)

---

## 🎯 Overview

**Monitor API and Web deployments in real-time during installation/startup.**

**Use Railway MCP + Browser MCP for complete visibility.**

Track both services simultaneously to see:
- ✅ When deployment starts
- ✅ Build progress
- ✅ Server startup
- ✅ Health checks
- ✅ Success/failure events

### Combined Approach

**Railway MCP** - Get logs and infrastructure status  
**Browser MCP** - Visual verification of production site  
**Real-time streaming** - Monitor logs as they happen

### Distribution (how logs reach you)

The monitor runs `railway logs` **from each app directory** (`apps/api`, `apps/web`) so the CLI has the correct project context. If you see "No linked project", run `cd apps/api && railway link` and `cd apps/web && railway link` once.

**📖 [Monitoring distribution flow](MONITORING-DISTRIBUTION-FLOW.md)** – full data flow and script behavior.

---

## 🚀 Quick Start

### Monitor Both Services

```bash
# Monitor API and Web simultaneously
./scripts/monitor-deployments-realtime.sh both
```

### Monitor Single Service

```bash
# Monitor API only
./scripts/monitor-deployments-realtime.sh api

# Monitor Web only
./scripts/monitor-deployments-realtime.sh web
```

---

## 📋 What You'll See

### Deployment Event Indicators

The script highlights key events with colors:

- **🟢 Green** - Build/Deploy/Start/Success events
- **🔵 Blue** - Deployment events
- **🔴 Red** - Errors/Failures
- **🟡 Yellow** - Warnings

### Example Output

```
[API] Building with NIXPACKS...
[API] Build time: 112.64 seconds
[API] Deploying container...
[API] [STARTUP] server.ts loading...
[API] [STARTUP] ✅ Server listening on port 4301
[API] Health check passed

[WEB] Building with NIXPACKS...
[WEB] Build time: 45.23 seconds
[WEB] Deploying container...
[WEB] Server started
[WEB] Health check passed
```

---

## 🔍 Features

### 1. Combined Monitoring

**Monitor both services in one lnav window:**
- See API and Web logs side-by-side
- Filter by service
- SQL queries across both services
- Real-time updates

### 2. Deployment Status Check

**Before monitoring, shows current status:**
- Latest deployment status
- Recent deployment history
- Service health

### 3. Real-Time Updates

**Continuous streaming:**
- New logs appear automatically
- No manual refresh needed
- See events as they happen

---

## 🎯 Usage Scenarios

### Scenario 1: Monitor Deployment After Push

```bash
# 1. Push to production
git push origin main

# 2. Immediately start monitoring
./scripts/monitor-deployments-realtime.sh both

# 3. Watch deployment progress in real-time
# 4. See when both services are healthy
```

---

### Scenario 2: Debug Failed Deployment

```bash
# 1. Start monitoring
./scripts/monitor-deployments-realtime.sh api

# 2. In lnav, filter for errors
:filter-in error|ERROR|fail|FAIL

# 3. See errors as they occur
# 4. Identify failure point
```

---

### Scenario 3: Track Startup Sequence

```bash
# 1. Start monitoring
./scripts/monitor-deployments-realtime.sh both

# 2. In lnav, use SQL to track startup
; SELECT log_time, log_body 
  FROM log 
  WHERE log_body LIKE '%started%' 
     OR log_body LIKE '%listening%'
  ORDER BY log_time
```

---

## 🔧 lnav Features for Deployment Tracking

### SQL Queries

**Track deployment timeline:**
```sql
-- See all deployment events
SELECT log_time, log_body 
FROM log 
WHERE log_body LIKE '%deploy%' 
   OR log_body LIKE '%build%'
   OR log_body LIKE '%started%'
ORDER BY log_time
```

**Find when services started:**
```sql
-- API and Web startup times
SELECT 
  CASE 
    WHEN log_body LIKE '%[API]%' THEN 'API'
    WHEN log_body LIKE '%[WEB]%' THEN 'Web'
    ELSE 'Unknown'
  END as service,
  log_time,
  log_body
FROM log 
WHERE log_body LIKE '%started%' 
   OR log_body LIKE '%listening%'
ORDER BY log_time
```

---

### Filtering

**Filter by service:**
```
:filter-in [API]
:filter-in [WEB]
```

**Filter for deployment events:**
```
:filter-in deploy|build|started|health
```

**Filter for errors:**
```
:filter-in error|ERROR|fail|FAIL
```

---

## 📊 Deployment Tracking Workflow

### Step 1: Check Current Status

```bash
# See what's currently deployed
railway deployment list --service api
railway deployment list --service web
```

---

### Step 2: Start Monitoring

```bash
# Monitor both services
./scripts/monitor-deployments-realtime.sh both
```

---

### Step 3: Watch for Key Events

**Look for:**
1. **Build start** - "Building with NIXPACKS"
2. **Build complete** - "Build time: X seconds"
3. **Deploy start** - "Deploying container"
4. **Server start** - "[STARTUP] ✅ Server listening"
5. **Health check** - "Health check passed"

---

### Step 4: Verify Success

**In lnav, check:**
```sql
-- Verify both services started
SELECT 
  CASE 
    WHEN log_body LIKE '%[API]%' AND log_body LIKE '%started%' THEN 'API Started'
    WHEN log_body LIKE '%[WEB]%' AND log_body LIKE '%started%' THEN 'Web Started'
  END as event,
  log_time
FROM log 
WHERE log_body LIKE '%started%' 
   OR log_body LIKE '%listening%'
ORDER BY log_time DESC
LIMIT 10
```

---

## 🎯 Key Events to Watch

### API Service

**Startup sequence:**
1. `[STARTUP] server.ts loading...`
2. `[STARTUP] All imports loaded`
3. `[STARTUP] Starting HTTP server...`
4. `[STARTUP] ✅ Server listening on port 4301`
5. `Database connection verified at startup`
6. `Health check passed`

---

### Web Service

**Startup sequence:**
1. `Building Next.js application`
2. `Build completed`
3. `Server started`
4. `Ready on http://localhost:3000`
5. `Health check passed`

---

## 🔍 Troubleshooting

### No Logs Appearing

**Check:**
1. Railway CLI authenticated: `railway whoami`
2. Service names correct: `api` and `web`
3. Services exist: `railway status`

---

### lnav Not Opening

**Fallback:**
- Script automatically falls back to simple stream
- Or install lnav: `./scripts/install-lnav.sh`

---

### One Service Not Streaming

**Try:**
```bash
# Monitor individually
./scripts/monitor-deployments-realtime.sh api
./scripts/monitor-deployments-realtime.sh web
```

---

## 🌐 Browser MCP for Visual Verification

**Check deployment status visually:**

**In Cursor Composer (Cmd+I), ask:**
```
Navigate to https://railway.app and show me the deployment status for API and Web services
```

**Verify production:**
```
Go to https://fieldview.live and verify it's working, then check https://api.fieldview.live/health
```

**What Browser MCP provides:**
- ✅ Visual deployment status from Railway dashboard
- ✅ Production site verification
- ✅ API health check visualization
- ✅ Screenshots for documentation

**📖 [Browser MCP Setup](BROWSER-MCP-SETUP.md)** - Complete Browser MCP guide

---

## 📖 Related Documentation

- **[Debug Railway Logs Guide](DEBUG-RAILWAY-LOGS-GUIDE.md)** - Log download and real-time streaming
- **[Deployment Tracking](DEPLOYMENT-TRACKING-LNAV.md)** - SQL queries for deployments
- **[Debug Railway Logs Guide](DEBUG-RAILWAY-LOGS-GUIDE.md)** - Complete debugging guide
- **[Browser MCP Setup](BROWSER-MCP-SETUP.md)** - Visual verification guide

---

## ✅ Summary

✅ **Monitor both services** - API and Web simultaneously  
✅ **Real-time updates** - See events as they happen  
✅ **Deployment tracking** - Track build, deploy, start events  
✅ **Error detection** - See failures immediately  
✅ **SQL queries** - Analyze deployment timeline  

**Result:** Complete visibility into deployment process in real-time! 🚀

---

**ROLE: engineer STRICT=false**  
**Real-time deployment monitoring complete**
