# Railway Logs Debugging - Quick Reference

**Fast debugging with Railway MCP + lnav**

---

## 🚀 Quick Commands

```bash
# Install lnav (one-time)
./scripts/install-lnav.sh

# Real-time streaming (STANDARD - for immediate debugging)
./scripts/debug-railway-logs.sh api --follow

# Recent logs analysis
./scripts/debug-railway-logs.sh api 1000

# Errors only
./scripts/debug-railway-logs.sh api 5000 --errors-only

# Search for term
./scripts/debug-railway-logs.sh api 2000 --search "PrismaClient"

# Track deployments
./scripts/debug-railway-logs.sh api 5000 --deployments

# All services
./scripts/debug-railway-logs.sh all 1000

# Cleanup stale logs (keep last 7 days)
./scripts/cleanup-stale-logs.sh
```

---

## 🔍 lnav Quick Tips

### Navigation
- `q` - Quit
- `/` - Search (regex supported)
- `;` - SQL query mode
- `:goto 100` - Jump to line 100

### Filtering
- `:filter-in error` - Show only errors
- `:filter-out INFO` - Hide INFO logs
- `:filter-in /error|ERROR/` - Regex filter

### SQL Queries (Press `;`)
```sql
-- Find all errors
SELECT * FROM log WHERE log_body LIKE '%error%'

-- Errors in last hour
SELECT * FROM log 
WHERE log_time > datetime('now', '-1 hour')
AND log_body LIKE '%error%'

-- Count errors by type
SELECT log_body, COUNT(*) as count 
FROM log 
WHERE log_body LIKE '%error%'
GROUP BY log_body
ORDER BY count DESC

-- Track deployments
SELECT log_time, log_body 
FROM log 
WHERE log_body LIKE '%deploy%' 
   OR log_body LIKE '%build%'
   OR log_body LIKE '%started%'
ORDER BY log_time

-- Find when server started
SELECT log_time, log_body 
FROM log 
WHERE log_body LIKE '%started%' 
   OR log_body LIKE '%listening%'
ORDER BY log_time DESC
LIMIT 1
```

---

## ⚡ Performance

| Method | Time (1000 lines) | Speed |
|--------|------------------|-------|
| Railway MCP | 3-6s | ⚡⚡⚡ |
| Railway CLI | 15-25s | ⚡ |

**Always use Railway MCP when available!**

---

## 📁 Log Locations

```
logs/railway/debug/
├── api-{timestamp}.log           # Full logs
└── api-filtered-{timestamp}.log  # Filtered logs
```

---

## 🎯 Common Workflows

### Find Recent Errors
```bash
./scripts/debug-railway-logs.sh api 1000 --errors-only
# In lnav: ; SELECT * FROM log WHERE log_time > datetime('now', '-1 hour')
```

### Track Specific Issue
```bash
./scripts/debug-railway-logs.sh api 2000 --search "unlock"
```

### Analyze Deployment
```bash
./scripts/debug-railway-logs.sh api 5000 --deployments
# In lnav: ; SELECT log_time, log_body FROM log WHERE log_body LIKE '%started%' ORDER BY log_time DESC
```

### Find When Deployment Completed
```bash
./scripts/debug-railway-logs.sh api 10000 --deployments
# In lnav: ; SELECT log_time, log_body FROM log WHERE log_body LIKE '%server started%' OR log_body LIKE '%listening%' ORDER BY log_time DESC LIMIT 1
```

---

## 🚀 Deployment Tracking

### Quick Commands
```bash
# Track deployments
./scripts/debug-railway-logs.sh api 5000 --deployments
```

### Key SQL Queries
```sql
-- When did deployment start?
SELECT MIN(log_time) FROM log WHERE log_body LIKE '%deploy%' OR log_body LIKE '%build%'

-- When did server start? (deployment complete)
SELECT log_time, log_body FROM log 
WHERE log_body LIKE '%started%' OR log_body LIKE '%listening%'
ORDER BY log_time DESC LIMIT 1

-- Deployment timeline
SELECT log_time, log_body FROM log 
WHERE log_body LIKE '%deploy%' OR log_body LIKE '%build%' OR log_body LIKE '%started%'
ORDER BY log_time
```

**📖 Full Deployment Guide:** [DEPLOYMENT-TRACKING-LNAV.md](DEPLOYMENT-TRACKING-LNAV.md)

---

**📖 Full Guide:** [DEBUG-RAILWAY-LOGS-GUIDE.md](DEBUG-RAILWAY-LOGS-GUIDE.md)
