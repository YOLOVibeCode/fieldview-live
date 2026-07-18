# Railway MCP Troubleshooting Guide

**Status:** Configuration updated - requires Cursor restart

---

## Current Configuration

**Location:** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "railway": {
      "command": "/opt/homebrew/bin/npx",
      "args": ["-y", "@railway/mcp-server"],
      "env": {
        "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
      }
    }
  }
}
```

**Changes Made:**
- ✅ Updated to use full path: `/opt/homebrew/bin/npx`
- ✅ Added explicit PATH environment variable
- ✅ Matches Claude Desktop configuration pattern

---

## Verification Steps

### 1. Check Prerequisites

```bash
# Node.js version (needs v20+)
node --version
# Should show: v25.2.1 ✅

# NPX available
which npx
# Should show: /opt/homebrew/bin/npx ✅

# Railway CLI installed and authenticated
railway whoami
# Should show: Logged in as Ricardo Vega ✅
```

### 2. Test Railway MCP Server Manually

```bash
# Test if the MCP server can start
/opt/homebrew/bin/npx -y @railway/mcp-server

# This should start the MCP server (will wait for input)
# Press Ctrl+C to stop
```

### 3. Check Cursor MCP Logs

**Location:** `~/Library/Application Support/Cursor/logs/[DATE]/`

Look for:
- `mcp*.log` files
- Errors containing "railway" or "mcp"
- "Starting new stdio process" messages

**To view logs:**
```bash
# Find latest log directory
LATEST=$(ls -t ~/Library/Application\ Support/Cursor/logs/ | head -1)
echo "Latest logs: ~/Library/Application Support/Cursor/logs/$LATEST"

# Search for MCP errors
grep -i "mcp\|railway" ~/Library/Application\ Support/Cursor/logs/$LATEST/*.log
```

---

## Common Issues & Solutions

### Issue 1: MCP Server Not Appearing

**Symptoms:**
- Railway MCP doesn't show up in `list_mcp_resources`
- No errors in logs

**Solutions:**
1. **Restart Cursor completely:**
   - Quit Cursor (Cmd+Q)
   - Wait 5 seconds
   - Reopen Cursor

2. **Check configuration syntax:**
   ```bash
   cat ~/.cursor/mcp.json | python3 -m json.tool
   # Should show valid JSON without errors
   ```

3. **Verify Railway CLI is in PATH:**
   ```bash
   echo $PATH | grep -i railway
   # If empty, Railway CLI might not be in PATH
   ```

### Issue 2: "Command not found" Errors

**Symptoms:**
- MCP logs show "command not found"
- npx or railway not found

**Solutions:**
1. **Use full paths in mcp.json:**
   ```json
   {
     "command": "/opt/homebrew/bin/npx",
     "args": ["-y", "@railway/mcp-server"]
   }
   ```

2. **Add PATH environment variable:**
   ```json
   {
     "env": {
       "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
     }
   }
   ```

### Issue 3: Railway CLI Not Authenticated

**Symptoms:**
- MCP server starts but can't access Railway
- Authentication errors

**Solutions:**
1. **Re-authenticate Railway CLI:**
   ```bash
   railway login
   railway whoami
   ```

2. **Check Railway token:**
   ```bash
   cat ~/.railway/config.json
   # Should contain authentication token
   ```

### Issue 4: Node.js Version Too Old

**Symptoms:**
- MCP server fails to start
- "Unsupported Node version" errors

**Solutions:**
1. **Check Node version:**
   ```bash
   node --version
   # Needs v20+ (you have v25.2.1 ✅)
   ```

2. **Update Node if needed:**
   ```bash
   brew upgrade node
   ```

### Issue 5: MCP Server Timeout

**Symptoms:**
- "Request timed out" errors
- MCP server starts but doesn't respond

**Solutions:**
1. **Check if Railway CLI is working:**
   ```bash
   railway status
   railway projects
   ```

2. **Test MCP server manually:**
   ```bash
   /opt/homebrew/bin/npx -y @railway/mcp-server
   # Should start without errors
   ```

---

## Debugging Steps

### Step 1: Verify Configuration

```bash
# Check mcp.json syntax
cat ~/.cursor/mcp.json | python3 -m json.tool

# Compare with working Claude Desktop config
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool
```

### Step 2: Test Components Individually

```bash
# Test npx
/opt/homebrew/bin/npx --version

# Test Railway CLI
railway --version
railway whoami

# Test Railway MCP package
npm view @railway/mcp-server version
```

### Step 3: Check Cursor Logs

```bash
# Find latest log directory
LATEST=$(ls -t ~/Library/Application\ Support/Cursor/logs/ | head -1)

# Search for MCP-related errors
grep -i "mcp\|railway\|error" ~/Library/Application\ Support/Cursor/logs/$LATEST/*.log | tail -20
```

### Step 4: Manual MCP Server Test

```bash
# Start MCP server manually
/opt/homebrew/bin/npx -y @railway/mcp-server

# In another terminal, test Railway CLI
railway projects
railway status
```

---

## Alternative: Use Railway CLI Directly

If MCP continues to have issues, you can use Railway CLI directly:

```bash
# Get API logs
railway logs --service api

# Get Web logs  
railway logs --service web

# Check deployment status
railway status

# List projects
railway projects
```

Or use the helper script:
```bash
./scripts/railway-logs.sh recent api
./scripts/railway-logs.sh recent web
```

---

## Next Steps

1. **Restart Cursor completely** (Cmd+Q, wait 5 seconds, reopen)
2. **Check Cursor MCP logs** for any errors
3. **Test manually** with the commands above
4. **If still not working**, check Railway MCP server documentation:
   - https://docs.railway.com/reference/mcp-server
   - https://www.npmjs.com/package/@railway/mcp-server

---

## Configuration Files

- **Cursor:** `~/.cursor/mcp.json`
- **Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **VS Code:** `.vscode/settings.json` (workspace-level)

All three are now configured with Railway MCP.

---

**Last Updated:** January 22, 2026  
**Node Version:** v25.2.1 ✅  
**Railway CLI:** v4.12.0 ✅  
**Railway MCP:** v0.1.8 ✅
