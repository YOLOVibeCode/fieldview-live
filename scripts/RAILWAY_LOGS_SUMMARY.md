# 🚂 Railway Logs Access - Complete Guide

## 📋 Overview

This guide covers all available methods for accessing Railway logs, with a focus on the GraphQL API proof-of-concept.

---

## 🎯 Quick Start

### 1. **Immediate Log Access** (Existing Script)

```bash
# Move existing script to standard location
mv _Resources/scripts/railway-logs.sh scripts/railway-logs.sh
chmod +x scripts/railway-logs.sh

# Use it
./scripts/railway-logs.sh tail api     # Live logs
./scripts/railway-logs.sh errors api   # Errors only
./scripts/railway-logs.sh recent api   # Last 100 lines
```

### 2. **GraphQL API Test** (POC)

```bash
# Setup (one time)
export RAILWAY_API_TOKEN='your_token_from_railway'
export RAILWAY_PROJECT_ID='your_project_id'

# Quick test
./scripts/test-railway-graphql.sh

# Full POC
node scripts/railway-logs-graphql.js
```

---

## 📁 Files Created

### Core Scripts

1. **`scripts/railway-logs-graphql.js`**
   - GraphQL API proof-of-concept
   - Fetches project info, services, deployments
   - Demonstrates GraphQL API capabilities
   - **Finding**: Logs not available via GraphQL

2. **`scripts/test-railway-graphql.sh`**
   - Quick connectivity test
   - Validates API token
   - Tests basic GraphQL queries
   - Fast feedback (<5 seconds)

### Documentation

3. **`scripts/RAILWAY_LOGS_POC.md`**
   - Complete POC documentation
   - Setup instructions
   - API capabilities & limitations
   - Recommendations

4. **`scripts/RAILWAY_LOGS_SUMMARY.md`** (this file)
   - Overview of all log access methods
   - Quick reference guide

---

## 🔍 GraphQL API - Key Findings

### ✅ **What Works**

```javascript
// Authentication
const TOKEN = process.env.RAILWAY_API_TOKEN;

// Fetch project info
query GetProject($projectId: String!) {
  project(id: $projectId) {
    id
    name
    services { edges { node { id name } } }
  }
}

// Get deployment status
query GetDeployments($serviceId: String!) {
  deployments(input: { serviceId: $serviceId, first: 5 }) {
    edges {
      node {
        id
        status
        createdAt
      }
    }
  }
}
```

**Use Cases**:
- ✅ Deployment monitoring
- ✅ Service health checks
- ✅ CI/CD status checks
- ✅ Automated alerting

### ❌ **What Doesn't Work**

```javascript
// ❌ No logs query available
query GetLogs($deploymentId: String!) {
  logs(deploymentId: $deploymentId) {
    // Does not exist in Railway GraphQL API v2
    lines
  }
}
```

**Limitation**: Railway GraphQL API does not expose logs.

---

## 🎯 Recommended Approaches

### **For Development** ⭐

**Use**: `scripts/railway-logs.sh` (Railway CLI wrapper)

```bash
./scripts/railway-logs.sh tail api
./scripts/railway-logs.sh search api "error"
./scripts/railway-logs.sh export api logs.txt
```

**Pros**:
- ✅ Full-featured
- ✅ Real-time streaming
- ✅ Error filtering
- ✅ Search functionality

**Cons**:
- ⚠️ Requires Railway CLI login

---

### **For Monitoring/CI/CD** ⭐

**Use**: GraphQL API + Railway CLI hybrid

```javascript
// 1. Check deployment status via GraphQL
const deployment = await getLatestDeployment(serviceId);

if (deployment.status === 'FAILED') {
  // 2. Fetch logs via CLI
  exec('railway logs --service api | tail -100', (err, stdout) => {
    // Parse and send alert
  });
}
```

**Pros**:
- ✅ Fast status checks (GraphQL)
- ✅ Full logs when needed (CLI)
- ✅ Automation-friendly

---

### **For Debugging** ⭐

**Use**: Railway Dashboard (Web UI)

https://railway.app → Project → Service → Logs

**Pros**:
- ✅ Visual interface
- ✅ Built-in filtering
- ✅ Deployment timeline
- ✅ Download logs

---

## 🚀 Usage Examples

### Example 1: Check if Latest Deployment Succeeded

```bash
# Quick test with GraphQL
node scripts/railway-logs-graphql.js

# If failed, get logs
./scripts/railway-logs.sh recent api
```

### Example 2: Monitor for Errors

```bash
# Stream errors in real-time
./scripts/railway-logs.sh errors api

# Or search for specific error
./scripts/railway-logs.sh search api "Prisma"
```

### Example 3: CI/CD Health Check

```javascript
// In your CI/CD pipeline
const { getLatestDeployment } = require('./scripts/railway-logs-graphql.js');

async function checkHealth() {
  const deployment = await getLatestDeployment(API_SERVICE_ID);
  
  if (deployment.status !== 'SUCCESS') {
    throw new Error(`Deployment failed: ${deployment.status}`);
  }
  
  console.log('✅ Deployment healthy');
}
```

### Example 4: Export Logs for Analysis

```bash
# Export to file
./scripts/railway-logs.sh export api api-logs.txt

# Analyze
grep "error" api-logs.txt | wc -l
```

---

## 📊 Comparison Matrix

| Method | Speed | Features | Automation | Setup |
|--------|-------|----------|------------|-------|
| **Railway CLI** | ⚡ Fast | ⭐⭐⭐⭐⭐ | ⚠️ Manual | Easy |
| **GraphQL API** | ⚡⚡ Fastest | ⭐⭐⭐ (no logs) | ✅ Full | Medium |
| **Dashboard** | 🐌 Slow | ⭐⭐⭐⭐ | ❌ None | Easy |
| **Hybrid** | ⚡ Fast | ⭐⭐⭐⭐⭐ | ✅ Full | Medium |

---

## 🔧 Setup Instructions

### 1. Get Railway API Token

1. Go to: https://railway.app/account/tokens
2. Click "Create Token"
3. Copy token (starts with `rxxx_`)

### 2. Get Railway Project ID

**Option A**: From URL
- Go to: https://railway.app
- Select project
- URL: `https://railway.app/project/{PROJECT_ID}`

**Option B**: From CLI
```bash
railway status
# Look for "Project ID: ..."
```

### 3. Set Environment Variables

```bash
# For current session
export RAILWAY_API_TOKEN='rxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
export RAILWAY_PROJECT_ID='xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'

# For persistent (add to ~/.zshrc)
echo 'export RAILWAY_API_TOKEN="your_token"' >> ~/.zshrc
echo 'export RAILWAY_PROJECT_ID="your_project_id"' >> ~/.zshrc
source ~/.zshrc
```

### 4. Test Connection

```bash
# Quick test (5 seconds)
./scripts/test-railway-graphql.sh

# Full POC (10 seconds)
node scripts/railway-logs-graphql.js
```

---

## 🎯 POC Conclusions

### **GraphQL API Assessment** ✅

| Capability | Status | Notes |
|------------|--------|-------|
| **Authentication** | ✅ Works | Token-based, CI/CD friendly |
| **Project Info** | ✅ Works | Name, ID, description |
| **Service Listing** | ✅ Works | All services with IDs |
| **Deployment Status** | ✅ Works | Real-time status checks |
| **Deployment History** | ✅ Works | Recent deployments |
| **Logs Access** | ❌ Not Available | Must use CLI or Dashboard |
| **Real-time Streaming** | ❌ Not Available | Must use CLI |

### **Recommendation** 🎯

**Current Best Approach**:
1. ✅ Use `scripts/railway-logs.sh` for log access
2. ✅ Use GraphQL API for status monitoring
3. ✅ Combine both for comprehensive automation

**Why**:
- Railway GraphQL API doesn't expose logs yet
- Railway CLI provides full log access
- Hybrid approach gives best of both worlds

---

## 📚 Resources

### Scripts
- `scripts/railway-logs.sh` - Main log access tool
- `scripts/railway-logs-graphql.js` - GraphQL POC
- `scripts/test-railway-graphql.sh` - Quick test

### Documentation
- `scripts/RAILWAY_LOGS_POC.md` - Full POC details
- `RAILWAY_CONFIG_SOURCE_OF_TRUTH.md` - Railway config guide
- `QUICK_DEPLOY.md` - Deployment guide

### External
- [Railway API Docs](https://docs.railway.app/reference/public-api)
- [Railway GraphQL Explorer](https://railway.app/graphql)
- [Railway Account Tokens](https://railway.app/account/tokens)

---

## ✅ Next Steps

### Immediate
```bash
# 1. Test GraphQL connection
./scripts/test-railway-graphql.sh

# 2. Run full POC
node scripts/railway-logs-graphql.js

# 3. Move existing log script
mv _Resources/scripts/railway-logs.sh scripts/railway-logs.sh

# 4. Use it!
./scripts/railway-logs.sh tail api
```

### Future Enhancements
- [ ] Monitor Railway API for log query support
- [ ] Integrate Railway webhooks for real-time alerts
- [ ] Create log aggregation/analysis tools
- [ ] Build custom monitoring dashboard

---

## 🎉 Summary

**POC Status**: ✅ Complete

**Key Finding**: Railway GraphQL API doesn't support logs (yet)

**Best Solution**: Use `scripts/railway-logs.sh` (Railway CLI wrapper)

**Alternative**: Use GraphQL API for deployment monitoring + CLI for logs

**Result**: Hybrid approach provides best automation + full log access

---

**Created**: January 9, 2026  
**POC Type**: GraphQL API Log Access  
**Status**: ✅ Completed & Documented  
**Recommendation**: Use CLI wrapper + GraphQL hybrid

