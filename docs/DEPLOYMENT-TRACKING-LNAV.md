# Deployment Tracking with lnav

**Date:** January 23, 2026  
**Status:** ✅ Complete  
**Role:** Engineer (STRICT=false)

---

## 🎯 Overview

**Track deployments using Railway logs + lnav SQL queries.**

Find exactly when:
- ✅ Deployment started
- ✅ Build completed
- ✅ Server started
- ✅ Health checks passed
- ✅ Deployment succeeded/failed

---

## 🚀 Quick Start

### Download Deployment Logs

```bash
# Get logs focused on deployments
./scripts/debug-railway-logs.sh api 5000 --deployments

# Or get all logs and filter in lnav
./scripts/debug-railway-logs.sh api 10000
```

---

## 🔍 Deployment Tracking SQL Queries

### Find All Deployment Events

```sql
SELECT log_time, log_body 
FROM log 
WHERE log_body LIKE '%deploy%' 
   OR log_body LIKE '%build%'
   OR log_body LIKE '%railway%'
   OR log_body LIKE '%nixpacks%'
ORDER BY log_time
```

**Shows:** All deployment-related events in chronological order

---

### Find When Deployment Started

```sql
SELECT log_time, log_body 
FROM log 
WHERE log_body LIKE '%build%' 
   OR log_body LIKE '%deploy%'
   OR log_body LIKE '%starting%'
ORDER BY log_time
LIMIT 20
```

**Shows:** First deployment events (when it started)

---

### Find When Server Started

```sql
SELECT log_time, log_body 
FROM log 
WHERE log_body LIKE '%started%' 
   OR log_body LIKE '%listening%'
   OR log_body LIKE '%server started%'
   OR log_body LIKE '%API server started%'
ORDER BY log_time
```

**Shows:** When the server actually started accepting requests

---

### Find Deployment Success/Failure

```sql
SELECT log_time, log_body 
FROM log 
WHERE log_body LIKE '%success%' 
   OR log_body LIKE '%fail%'
   OR log_body LIKE '%error%'
   OR log_body LIKE '%health%'
ORDER BY log_time DESC
LIMIT 50
```

**Shows:** Success/failure indicators

---

### Get Deployment Timeline

```sql
SELECT 
  MIN(log_time) as deployment_started,
  MAX(log_time) as last_event,
  COUNT(*) as total_events
FROM log 
WHERE log_body LIKE '%deploy%' 
   OR log_body LIKE '%build%'
   OR log_body LIKE '%started%'
```

**Shows:** Deployment start time, end time, and total events

---

### Find Latest Deployment

```sql
SELECT log_time, log_body 
FROM log 
WHERE log_body LIKE '%deploy%' 
   OR log_body LIKE '%build%'
   OR log_body LIKE '%started%'
ORDER BY log_time DESC
LIMIT 30
```

**Shows:** Most recent deployment events

---

### Track Health Checks

```sql
SELECT log_time, log_body 
FROM log 
WHERE log_body LIKE '%health%' 
   OR log_body LIKE '%healthcheck%'
   OR log_body LIKE '%healthy%'
ORDER BY log_time DESC
LIMIT 50
```

**Shows:** Health check events (indicates when service became healthy)

---

## 📊 Advanced Deployment Analysis

### Deployment Duration

```sql
SELECT 
  log_time as event_time,
  log_body,
  CASE 
    WHEN log_body LIKE '%started%' THEN 'Server Started'
    WHEN log_body LIKE '%build%' THEN 'Build'
    WHEN log_body LIKE '%deploy%' THEN 'Deploy'
    WHEN log_body LIKE '%health%' THEN 'Health Check'
    ELSE 'Other'
  END as event_type
FROM log 
WHERE log_body LIKE '%deploy%' 
   OR log_body LIKE '%build%'
   OR log_body LIKE '%started%'
   OR log_body LIKE '%health%'
ORDER BY log_time
```

**Shows:** Deployment timeline with event types

---

### Find Deployment Failures

```sql
SELECT log_time, log_body 
FROM log 
WHERE (log_body LIKE '%fail%' OR log_body LIKE '%error%')
  AND (log_body LIKE '%deploy%' OR log_body LIKE '%build%')
ORDER BY log_time DESC
```

**Shows:** Deployment failures and errors

---

### Count Events by Type

```sql
SELECT 
  CASE 
    WHEN log_body LIKE '%started%' THEN 'Server Started'
    WHEN log_body LIKE '%build%' THEN 'Build'
    WHEN log_body LIKE '%deploy%' THEN 'Deploy'
    WHEN log_body LIKE '%health%' THEN 'Health Check'
    WHEN log_body LIKE '%error%' THEN 'Error'
    ELSE 'Other'
  END as event_type,
  COUNT(*) as count,
  MIN(log_time) as first_seen,
  MAX(log_time) as last_seen
FROM log 
WHERE log_body LIKE '%deploy%' 
   OR log_body LIKE '%build%'
   OR log_body LIKE '%started%'
   OR log_body LIKE '%health%'
   OR log_body LIKE '%error%'
GROUP BY event_type
ORDER BY first_seen
```

**Shows:** Summary of deployment events

---

## 🎯 Common Deployment Tracking Workflows

### Workflow 1: When Did Last Deployment Complete?

```bash
# 1. Download logs
./scripts/debug-railway-logs.sh api 5000 --deployments

# 2. In lnav, press ; and run:
SELECT log_time, log_body 
FROM log 
WHERE log_body LIKE '%started%' 
   OR log_body LIKE '%listening%'
ORDER BY log_time DESC
LIMIT 1
```

**Result:** Shows exact timestamp when server started (deployment complete)

---

### Workflow 2: Track Deployment Timeline

```bash
# 1. Download logs
./scripts/debug-railway-logs.sh api 10000

# 2. In lnav, press ; and run:
SELECT 
  log_time,
  CASE 
    WHEN log_body LIKE '%build%' THEN '🔨 Build'
    WHEN log_body LIKE '%deploy%' THEN '🚀 Deploy'
    WHEN log_body LIKE '%started%' THEN '✅ Started'
    WHEN log_body LIKE '%health%' THEN '💚 Health'
    WHEN log_body LIKE '%fail%' THEN '❌ Failed'
    ELSE '📝 Other'
  END as event,
  log_body
FROM log 
WHERE log_body LIKE '%deploy%' 
   OR log_body LIKE '%build%'
   OR log_body LIKE '%started%'
   OR log_body LIKE '%health%'
   OR log_body LIKE '%fail%'
ORDER BY log_time
```

**Result:** Complete deployment timeline with emojis for easy scanning

---

### Workflow 3: Find Failed Deployments

```bash
# 1. Download logs
./scripts/debug-railway-logs.sh api 10000 --errors-only

# 2. In lnav, press ; and run:
SELECT log_time, log_body 
FROM log 
WHERE log_body LIKE '%fail%' 
  AND (log_body LIKE '%deploy%' OR log_body LIKE '%build%')
ORDER BY log_time DESC
```

**Result:** All deployment failures with timestamps

---

### Workflow 4: Deployment Health Check Timeline

```bash
# 1. Download logs
./scripts/debug-railway-logs.sh api 5000

# 2. In lnav, press ; and run:
SELECT 
  log_time,
  CASE 
    WHEN log_body LIKE '%healthy%' THEN '✅ Healthy'
    WHEN log_body LIKE '%unhealthy%' THEN '❌ Unhealthy'
    WHEN log_body LIKE '%healthcheck%' THEN '🔍 Checking'
    ELSE '📊 ' || log_body
  END as status
FROM log 
WHERE log_body LIKE '%health%'
ORDER BY log_time DESC
LIMIT 100
```

**Result:** Health check timeline showing when service became healthy

---

## 🔧 lnav Filtering for Deployments

### Quick Filters

```
:filter-in deploy|build|started|health
```

**Shows:** Only deployment-related lines

---

### Filter Out Noise

```
:filter-out INFO|DEBUG
:filter-in deploy|build|started
```

**Shows:** Deployment events without INFO/DEBUG noise

---

### Regex Search

Press `/` and search:

```
/deploy|build|started|health|fail/
```

**Finds:** All deployment-related events

---

## 📊 Deployment Event Patterns

### Railway Deployment Events

Look for these patterns in logs:

1. **Build Start:**
   ```
   Building with NIXPACKS
   Build started
   ```

2. **Build Complete:**
   ```
   Build time: X seconds
   Build completed
   ```

3. **Deploy Start:**
   ```
   Deploying
   Starting container
   ```

4. **Server Start:**
   ```
   API server started
   Server listening on port
   [STARTUP] ✅ Server listening
   ```

5. **Health Check:**
   ```
   Health check passed
   /health endpoint
   ```

6. **Deploy Success:**
   ```
   Deployment successful
   Service healthy
   ```

---

## 🎯 Example: Complete Deployment Analysis

```bash
# Download comprehensive logs
./scripts/debug-railway-logs.sh api 20000

# In lnav, run this comprehensive query:
SELECT 
  log_time,
  CASE 
    WHEN log_body LIKE '%build%' AND log_body LIKE '%start%' THEN '🔨 Build Started'
    WHEN log_body LIKE '%build%' AND log_body LIKE '%complete%' THEN '✅ Build Complete'
    WHEN log_body LIKE '%build%' AND log_body LIKE '%time%' THEN '⏱️  Build Time'
    WHEN log_body LIKE '%deploy%' AND log_body LIKE '%start%' THEN '🚀 Deploy Started'
    WHEN log_body LIKE '%started%' AND log_body LIKE '%server%' THEN '✅ Server Started'
    WHEN log_body LIKE '%listening%' THEN '👂 Listening'
    WHEN log_body LIKE '%health%' AND log_body LIKE '%ok%' THEN '💚 Health OK'
    WHEN log_body LIKE '%health%' AND log_body LIKE '%fail%' THEN '❌ Health Failed'
    WHEN log_body LIKE '%fail%' THEN '❌ Failed'
    WHEN log_body LIKE '%error%' THEN '⚠️  Error'
    ELSE '📝 ' || SUBSTR(log_body, 1, 50)
  END as event,
  log_body
FROM log 
WHERE log_body LIKE '%deploy%' 
   OR log_body LIKE '%build%'
   OR log_body LIKE '%started%'
   OR log_body LIKE '%listening%'
   OR log_body LIKE '%health%'
   OR log_body LIKE '%fail%'
   OR log_body LIKE '%error%'
ORDER BY log_time
```

**Result:** Complete deployment timeline with visual indicators

---

## 💡 Pro Tips

### 1. Use Timestamps

```sql
-- Find deployments in last hour
SELECT * FROM log 
WHERE log_time > datetime('now', '-1 hour')
  AND (log_body LIKE '%deploy%' OR log_body LIKE '%started%')
```

### 2. Calculate Duration

```sql
-- Time between build start and server start
SELECT 
  (SELECT log_time FROM log WHERE log_body LIKE '%build%start%' ORDER BY log_time LIMIT 1) as build_start,
  (SELECT log_time FROM log WHERE log_body LIKE '%server started%' ORDER BY log_time DESC LIMIT 1) as server_start
```

### 3. Find Patterns

```sql
-- Count deployments per hour
SELECT 
  strftime('%Y-%m-%d %H:00', log_time) as hour,
  COUNT(*) as deployments
FROM log 
WHERE log_body LIKE '%deploy%'
GROUP BY hour
ORDER BY hour DESC
```

---

## 📖 Related Documentation

- **[Debug Railway Logs Guide](DEBUG-RAILWAY-LOGS-GUIDE.md)** - Complete debugging guide
- **[Debug Quick Reference](DEBUG-QUICK-REFERENCE.md)** - Quick commands
- **[Railway MCP Setup](MCP-RAILWAY-SETUP.md)** - Configure Railway MCP

---

## ✅ Summary

✅ **Track deployments** - Find exact start/end times  
✅ **SQL queries** - Powerful analysis in lnav  
✅ **Timeline view** - Chronological deployment events  
✅ **Health tracking** - When service became healthy  
✅ **Failure detection** - Find deployment failures quickly  

**Result:** Know exactly when deployments started and completed! 🚀

---

**ROLE: engineer STRICT=false**  
**Deployment tracking with lnav complete**
