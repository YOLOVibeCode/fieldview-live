# Using Railway with Claude Desktop (Claude Code)

**Date:** January 23, 2026  
**Status:** ✅ Complete Guide  
**Role:** Engineer (STRICT=false)

---

## 🎯 Overview

**Claude Desktop can use Railway in two ways:**

1. **Railway MCP (Recommended)** - Natural language via Railway MCP server
2. **CLI Commands** - Claude can help you create/run CLI commands (but can't execute them directly)

---

## ✅ Method 1: Railway MCP (Best Option)

### Setup Status

✅ **Railway MCP is already configured for Claude Desktop!**

**Config Location:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "railway": {
      "command": "/opt/homebrew/bin/npx",
      "args": ["-y", "@railway/mcp-server"]
    }
  }
}
```

### How to Use Railway MCP in Claude Desktop

1. **Open Claude Desktop**
2. **Ask naturally** - Claude will use Railway MCP automatically:

**Examples:**

```
Get the latest 500 lines of API logs from Railway
```

```
Show me errors from the web service in the last hour
```

```
What's the deployment status for the API service?
```

```
Get the DATABASE_URL from production
```

```
List all my Railway projects
```

### What Claude Can Do via Railway MCP

✅ **Logs & Monitoring:**
- Get service logs
- Filter for errors
- Check deployment status
- Monitor service health

✅ **Project Management:**
- List projects
- List services
- Check service status

✅ **Environment Variables:**
- Get environment variables
- List all variables for a service

✅ **Deployments:**
- Check deployment status
- Get deployment logs
- View recent deployments

---

## ⚠️ Method 2: CLI Commands (Limited)

### Can Claude Execute CLI Commands Directly?

**No** - Claude Desktop cannot execute CLI commands directly in your terminal.

**However, Claude can:**
- ✅ Help you write CLI commands
- ✅ Explain what commands do
- ✅ Create scripts for you to run
- ✅ Use Railway MCP (which executes Railway CLI commands on your behalf)

### What You Can Do

**1. Ask Claude to create a script:**
```
Create a bash script that downloads Railway API logs with timing information
```

**2. Ask Claude to explain commands:**
```
What does 'railway logs --service api --lines 500' do?
```

**3. Ask Claude to help with Railway via MCP:**
```
Get the latest API logs from Railway
```
*(Claude uses Railway MCP, which executes Railway CLI commands)*

---

## 🚀 Practical Examples

### Example 1: Get Logs via Railway MCP

**In Claude Desktop, ask:**
```
Get the latest 1000 lines of API logs from Railway, filter for errors, and show me the results
```

**Claude will:**
1. Use Railway MCP to fetch logs
2. Filter for errors automatically
3. Format the output nicely
4. Show you the results

**Time:** ~3-5 seconds ⚡

---

### Example 2: Check Deployment Status

**In Claude Desktop, ask:**
```
What's the status of the latest API deployment on Railway?
```

**Claude will:**
1. Use Railway MCP to check deployments
2. Get the latest deployment info
3. Show you the status (SUCCESS/FAILED/BUILDING)
4. Provide details if failed

---

### Example 3: Get Environment Variables

**In Claude Desktop, ask:**
```
Get the DATABASE_URL from the production API service on Railway
```

**Claude will:**
1. Use Railway MCP to fetch environment variables
2. Find DATABASE_URL
3. Show you the value (masked if sensitive)

---

### Example 4: Create a Script (CLI Alternative)

**In Claude Desktop, ask:**
```
Create a bash script that uses Railway CLI to download logs with timing. Save it to scripts/download-railway-logs-claude.sh
```

**Claude will:**
1. Create the script
2. Include timing information
3. Add error handling
4. Save it to the file

**Then you run it:**
```bash
./scripts/download-railway-logs-claude.sh api 500
```

---

## 📊 Comparison: Railway MCP vs CLI in Claude Desktop

| Feature | Railway MCP | CLI Commands |
|---------|------------|--------------|
| **Execution** | ✅ Claude executes via MCP | ❌ You execute manually |
| **Speed** | ⚡ 3-5 seconds | 🐌 10-30 seconds |
| **Natural Language** | ✅ Just ask | ❌ Need exact syntax |
| **Filtering** | ✅ AI-powered | ❌ Manual grep |
| **Error Detection** | ✅ Automatic | ❌ Manual scanning |
| **Formatting** | ✅ Clean output | ❌ Raw output |

**Recommendation:** Always use Railway MCP in Claude Desktop! 🎯

---

## 🔧 Troubleshooting

### Railway MCP Not Working in Claude Desktop?

**1. Check Configuration:**
```bash
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Should show:**
```json
{
  "mcpServers": {
    "railway": {
      "command": "/opt/homebrew/bin/npx",
      "args": ["-y", "@railway/mcp-server"]
    }
  }
}
```

**2. Restart Claude Desktop:**
- Quit completely (Cmd+Q)
- Wait 5 seconds
- Reopen Claude Desktop

**3. Check Railway CLI:**
```bash
railway whoami
# Should show: Logged in as Ricardo Vega
```

**4. Test Railway MCP:**
```bash
npx -y @railway/mcp-server --version
```

---

### Claude Can't Execute CLI Commands?

**This is expected!** Claude Desktop doesn't have direct terminal access.

**Solutions:**

1. **Use Railway MCP instead** (recommended):
   ```
   Get Railway API logs
   ```

2. **Ask Claude to create a script:**
   ```
   Create a script to download Railway logs
   ```
   Then run the script yourself.

3. **Use terminal directly:**
   ```bash
   railway logs --service api
   ```

---

## 📋 Quick Reference

### Railway MCP Commands (Natural Language)

**Logs:**
- `"Get the latest API logs"`
- `"Show me errors from web service"`
- `"Get logs from the last hour"`

**Deployments:**
- `"What's the deployment status?"`
- `"Show me recent deployments"`
- `"Check if API deployment succeeded"`

**Environment:**
- `"Get DATABASE_URL from production"`
- `"List all environment variables for API"`

**Projects:**
- `"List my Railway projects"`
- `"What services are in this project?"`

---

### CLI Commands (Manual Execution)

**If you need to run CLI commands yourself:**

```bash
# Get logs
railway logs --service api --lines 500

# Check status
railway status

# List deployments
railway deployment list --service api

# Get environment variables
railway variables
```

**Or use our scripts:**
```bash
./scripts/download-railway-logs-mcp.sh api 500
./scripts/download-railway-logs.sh api
```

---

## 🎯 Best Practices

### ✅ DO THIS:

1. **Use Railway MCP in Claude Desktop:**
   ```
   Get Railway API logs
   ```

2. **Ask Claude to create scripts:**
   ```
   Create a script to download Railway logs with timing
   ```

3. **Use natural language:**
   ```
   Show me errors from the last hour
   ```

### ❌ DON'T DO THIS:

1. **Don't ask Claude to execute CLI directly:**
   ```
   ❌ "Run 'railway logs --service api'"
   ```
   *(Claude can't execute terminal commands)*

2. **Don't expect terminal access:**
   ```
   ❌ "Open a terminal and run..."
   ```
   *(Claude Desktop doesn't have terminal access)*

---

## 📖 Related Documentation

- **[Railway MCP Setup](MCP-RAILWAY-SETUP.md)** - Complete setup guide
- **[Railway MCP vs CLI](RAILWAY-MCP-VS-CLI.md)** - Why MCP is better
- **[Error Investigation Workflow](ERROR-INVESTIGATION-WORKFLOW.md)** - Log and deployment triage
- **[Error Investigation Workflow](ERROR-INVESTIGATION-WORKFLOW.md)** - Standard workflow

---

## 🎉 Summary

**Claude Desktop + Railway:**

✅ **Railway MCP** - Fully configured, use natural language  
✅ **CLI Scripts** - Claude can create them, you run them  
❌ **Direct CLI** - Claude can't execute terminal commands  

**Best Approach:**
1. Use Railway MCP for everything (fastest, easiest)
2. Ask Claude to create scripts if needed
3. Run scripts yourself in terminal

**Example:**
```
You: "Get the latest 500 lines of API logs from Railway"
Claude: [Uses Railway MCP, fetches logs, shows you results]
Time: ~3-5 seconds ⚡
```

---

**ROLE: engineer STRICT=false**  
**Complete guide for using Railway with Claude Desktop**
