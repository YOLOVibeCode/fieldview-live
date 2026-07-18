# 🚂 Railway Logs Access - START HERE

> Quick guide to accessing Railway deployment logs

---

## 🎯 TL;DR

**Need logs NOW?**
```bash
./scripts/railway-logs.sh tail api
```

**Want to test GraphQL POC?**
```bash
./scripts/test-railway-graphql.sh
```

---

## 📚 Documentation

| File | Purpose | Read Time |
|------|---------|-----------|
| **[RAILWAY_LOGS_DELIVERABLES.md](./RAILWAY_LOGS_DELIVERABLES.md)** | What was delivered | 5 min |
| **[RAILWAY_LOGS_POC.md](./RAILWAY_LOGS_POC.md)** | Full POC details | 10 min |
| **[RAILWAY_LOGS_SUMMARY.md](./RAILWAY_LOGS_SUMMARY.md)** | Complete guide | 8 min |
| **[RAILWAY_LOGS_ARCHITECTURE.txt](./RAILWAY_LOGS_ARCHITECTURE.txt)** | Visual diagrams | 5 min |

---

## 🛠️ Scripts

### 1. Railway CLI Wrapper (Logs Access) ⭐
```bash
./scripts/railway-logs.sh tail api      # Live logs
./scripts/railway-logs.sh errors api    # Errors only
./scripts/railway-logs.sh search api "prisma"  # Search
./scripts/railway-logs.sh export api    # Save to file
```

### 2. GraphQL API POC (Status Checks)
```bash
# Setup (one time)
export RAILWAY_API_TOKEN='your_token'
export RAILWAY_PROJECT_ID='your_project_id'

# Quick test
./scripts/test-railway-graphql.sh

# Full POC
node scripts/railway-logs-graphql.js
```

---

## 🎓 What We Learned

### ✅ GraphQL API CAN:
- Authenticate with API tokens
- Fetch project information
- List services
- Check deployment status
- Monitor deployment history

### ❌ GraphQL API CANNOT:
- Fetch log lines
- Stream logs in real-time
- Replace Railway CLI for log access

### 💡 Recommendation:
Use **hybrid approach**:
1. GraphQL API for fast status checks
2. Railway CLI for full log access
3. Combine both for comprehensive automation

---

## 🚀 Quick Start

### For Log Access
```bash
# Install Railway CLI (one time)
npm install -g @railway/cli

# Login (one time)
railway login

# Get logs
./scripts/railway-logs.sh tail api
```

### For GraphQL Testing
```bash
# Get token: https://railway.app/account/tokens
export RAILWAY_API_TOKEN='rxxx_...'

# Get project ID from: https://railway.app
export RAILWAY_PROJECT_ID='xxxxxxxx-...'

# Test
./scripts/test-railway-graphql.sh
```

---

## 📊 Comparison

| Need | Best Tool | Command |
|------|-----------|---------|
| **Live logs** | Railway CLI | `./scripts/railway-logs.sh tail api` |
| **Check status** | GraphQL API | `node scripts/railway-logs-graphql.js` |
| **Find errors** | Railway CLI | `./scripts/railway-logs.sh errors api` |
| **Search logs** | Railway CLI | `./scripts/railway-logs.sh search api "keyword"` |
| **Export logs** | Railway CLI | `./scripts/railway-logs.sh export api file.txt` |
| **Automation** | Both | Hybrid approach |

---

## 🎯 POC Results

**Question**: Can Railway GraphQL API fetch logs?  
**Answer**: ❌ No  
**Solution**: ✅ Use Railway CLI wrapper  
**Bonus**: ✅ GraphQL great for status monitoring

---

## 📞 Need Help?

1. **Setup issues**: See [RAILWAY_LOGS_POC.md](./RAILWAY_LOGS_POC.md) setup section
2. **Usage examples**: See [RAILWAY_LOGS_SUMMARY.md](./RAILWAY_LOGS_SUMMARY.md)
3. **Visual guide**: See [RAILWAY_LOGS_ARCHITECTURE.txt](./RAILWAY_LOGS_ARCHITECTURE.txt)

---

## ✅ Files in This POC

```
scripts/
├── README_RAILWAY_LOGS.md            ← You are here
├── railway-logs-graphql.js           ← GraphQL POC implementation
├── test-railway-graphql.sh           ← Quick connectivity test
├── RAILWAY_LOGS_POC.md               ← Full POC documentation
├── RAILWAY_LOGS_SUMMARY.md           ← Complete guide
├── RAILWAY_LOGS_ARCHITECTURE.txt     ← Visual diagrams
└── RAILWAY_LOGS_DELIVERABLES.md      ← What was delivered
```

---

**POC Status**: ✅ Complete  
**Created**: January 9, 2026  
**Recommendation**: Use Railway CLI wrapper + GraphQL for monitoring

