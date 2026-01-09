# 🚂 Railway Logs GraphQL API - Proof of Concept

## 🎯 Objective

Test if Railway's GraphQL API can be used to fetch logs programmatically without requiring interactive CLI login.

---

## 📦 Setup

### 1. Get Railway API Token

Visit: https://railway.app/account/tokens

Click "Create Token" → Copy token

### 2. Get Railway Project ID

**Option A: From Railway Dashboard**
- Go to https://railway.app
- Select your project
- URL will be: `https://railway.app/project/{PROJECT_ID}`
- Copy the PROJECT_ID

**Option B: From Railway CLI**
```bash
railway status
# Look for "Project ID: ..."
```

### 3. Set Environment Variables

```bash
export RAILWAY_API_TOKEN='rxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
export RAILWAY_PROJECT_ID='xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
```

**For persistent setup**, add to `~/.zshrc` or `~/.bashrc`:
```bash
echo 'export RAILWAY_API_TOKEN="your_token"' >> ~/.zshrc
echo 'export RAILWAY_PROJECT_ID="your_project_id"' >> ~/.zshrc
source ~/.zshrc
```

---

## 🚀 Running the POC

### Basic Usage

```bash
# Make executable
chmod +x scripts/railway-logs-graphql.js

# Run POC
node scripts/railway-logs-graphql.js
```

### Expected Output

```
╔══════════════════════════════════════════════════════════════════════╗
║  Railway GraphQL Logs Fetcher - Proof of Concept                     ║
╚══════════════════════════════════════════════════════════════════════╝

📊 Fetching project info...
✅ Project: fieldview-live
   ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

🔧 Services:
  • api
    ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    Latest: SUCCESS
    Created: 1/9/2026, 10:30:00 AM

  • web
    ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    Latest: SUCCESS
    Created: 1/9/2026, 10:32:00 AM

📝 Attempting to fetch logs...

═══ FINDINGS ═══
Limitation: Railway GraphQL API v2 does not expose logs

Alternatives:
  ✓ Use Railway CLI: railway logs --service <name>
  ✓ Use Railway REST API (if available)
  ✓ Use Railway Dashboard: https://railway.app
```

---

## 🔍 What the POC Tests

### ✅ **Works**
1. **Authentication**: API token-based auth (no interactive login)
2. **Project Info**: Fetch project name and ID
3. **Service Listing**: List all services (api, web)
4. **Deployment Status**: Get latest deployment per service
5. **Deployment History**: Recent deployments with status
6. **Automation-Friendly**: Can run in CI/CD, cron jobs, scripts

### ❌ **Limitations Found**
1. **No Logs Query**: GraphQL API v2 doesn't expose logs
2. **Must Use CLI**: Railway CLI required for log access
3. **REST API Unknown**: No documented REST API for logs

---

## 📊 Railway GraphQL API Capabilities

### Available Queries

```graphql
# Project info
query GetProject($projectId: String!) {
  project(id: $projectId) {
    id
    name
    description
    createdAt
    services {
      edges {
        node {
          id
          name
        }
      }
    }
  }
}

# Deployments
query GetDeployments($serviceId: String!) {
  deployments(input: { serviceId: $serviceId, first: 10 }) {
    edges {
      node {
        id
        status
        createdAt
        meta
      }
    }
  }
}

# Service details
query GetService($serviceId: String!) {
  service(id: $serviceId) {
    id
    name
    createdAt
    updatedAt
  }
}
```

### NOT Available

```graphql
# ❌ No logs query exists
query GetLogs($deploymentId: String!) {
  logs(deploymentId: $deploymentId) {  # Does not exist
    lines
  }
}
```

---

## 💡 Recommendations

### **For Development/Manual Use**
✅ **Use existing `scripts/railway-logs.sh`**
- Full-featured
- Real-time streaming
- Error filtering
- Search functionality

```bash
./scripts/railway-logs.sh tail api
./scripts/railway-logs.sh errors api
./scripts/railway-logs.sh search api "error"
```

### **For Automation/CI/CD**

**Option 1: Railway CLI in Scripts** ⭐ **RECOMMENDED**
```bash
#!/bin/bash
# Non-interactive, but requires Railway CLI login once
railway logs --service api | tail -100
```

**Option 2: Railway API Token + CLI**
```bash
# Set token as env var for CI/CD
export RAILWAY_TOKEN="$RAILWAY_API_TOKEN"
railway logs --service api
```

**Option 3: Parse Railway Webhooks**
- Set up Railway webhooks for deployment events
- Capture build logs from webhook payloads
- Store in your own log aggregation system

### **For Monitoring/Alerting**

**Option 1: Railway Built-in Observability**
- Use Railway Dashboard → Observability
- Set up alerts in Railway UI

**Option 2: Export to External Service**
```bash
# Cron job to export logs to S3/CloudWatch/etc
*/5 * * * * railway logs --service api --since 5m >> /var/log/railway-api.log
```

---

## 🔧 Extending the POC

### Add Deployment Monitoring

```javascript
// scripts/railway-logs-graphql.js

async function monitorDeployments(serviceId) {
  const query = `
    query GetRecentDeployments($serviceId: String!) {
      deployments(input: { serviceId: $serviceId, first: 5 }) {
        edges {
          node {
            id
            status
            createdAt
            meta
          }
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { serviceId });
  const failed = data.deployments.edges.filter(
    (d) => d.node.status === 'FAILED'
  );
  
  if (failed.length > 0) {
    console.error('🚨 Failed deployments detected!');
    // Send alert, trigger webhook, etc.
  }
}
```

### Add Service Health Checks

```javascript
async function checkServiceHealth(serviceId) {
  const deployment = await getLatestDeployment(serviceId);
  
  if (deployment.status !== 'SUCCESS') {
    console.error(`❌ Service unhealthy: ${deployment.status}`);
    return false;
  }
  
  // Could also check:
  // - Deployment age (is it recent?)
  // - HTTP health endpoint
  // - Custom metrics
  
  return true;
}
```

---

## 📚 Railway API Documentation

- **GraphQL API**: https://docs.railway.app/reference/public-api
- **API Tokens**: https://docs.railway.app/reference/public-api#authentication
- **GraphQL Explorer**: https://railway.app/graphql (requires login)

---

## 🎯 Conclusion

### **POC Results** ✅

| Feature | GraphQL API | Railway CLI | Dashboard |
|---------|-------------|-------------|-----------|
| **Authentication** | ✅ Token | ✅ Login | ✅ Browser |
| **Project Info** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Service List** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Deployments** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Logs** | ❌ No | ✅ Yes | ✅ Yes |
| **Real-time Streaming** | ❌ No | ✅ Yes | ✅ Yes |
| **Automation-Friendly** | ✅ Yes | ⚠️ Partial | ❌ No |

### **Final Recommendation**

**For current log access needs**:
1. ✅ Use `scripts/railway-logs.sh` (Railway CLI wrapper)
2. ✅ Use GraphQL API for deployment monitoring/status
3. ✅ Combine both for comprehensive automation

**For future enhancement**:
- Monitor Railway's API roadmap for log query support
- Consider Railway's observability features for alerting
- Investigate Railway webhooks for real-time notifications

---

## 🚀 Quick Commands

```bash
# Run POC
node scripts/railway-logs-graphql.js

# Get logs (use existing script)
./scripts/railway-logs.sh tail api

# Combine both for status + logs
node scripts/railway-logs-graphql.js && ./scripts/railway-logs.sh recent api
```

---

**POC Status**: ✅ Complete
**GraphQL API for Logs**: ❌ Not supported (yet)
**Best Alternative**: ✅ `scripts/railway-logs.sh` (Railway CLI wrapper)

