# Railway MCP Server Setup

**Status:** ✅ Configured for Cursor, Claude Desktop, and VS Code

---

## Overview

The Railway MCP (Model Context Protocol) Server enables natural language interaction with Railway projects and infrastructure through AI assistants. This allows you to manage deployments, view logs, check environment variables, and more directly from your IDE.

---

## Configuration Status

### ✅ Cursor
**Location:** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "railway": {
      "command": "npx",
      "args": ["-y", "@railway/mcp-server"]
    }
  }
}
```

**Status:** Configured and ready to use

---

### ✅ Claude Desktop (Standalone)
**Location:** `~/Library/Application Support/Claude/claude_desktop_config.json`

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

**Status:** Configured and ready to use

---

### ✅ VS Code
**Location:** `.vscode/settings.json` (workspace-level)

```json
{
  "chat.mcp.gallery.enabled": true,
  "chat.mcp.servers": {
    "railway": {
      "command": "npx",
      "args": ["-y", "@railway/mcp-server"]
    }
  }
}
```

**Status:** Configured at workspace level

**Note:** VS Code also supports MCP servers through the Extensions view:
1. Open Extensions (Ctrl+Shift+X / Cmd+Shift+X)
2. Search for `@mcp railway`
3. Install from the MCP Registry

---

## Prerequisites

✅ **Railway CLI installed:**
```bash
which railway
# Should return: /opt/homebrew/bin/railway
```

✅ **Railway CLI authenticated:**
```bash
railway whoami
# Should show: Logged in as Ricardo Vega (github@noctusoft.com)
```

---

## Available Railway MCP Tools

Once configured, you can use natural language commands like:

### Project Management
- `"List all my Railway projects"`
- `"Create a new Railway project called 'my-app'"`
- `"Link the current directory to Railway project"`

### Service Management
- `"List all services in the current project"`
- `"Deploy the API service"`
- `"Get the status of the web service"`

### Logs & Monitoring
- `"Get the last 50 lines of logs from the API service"`
- `"Show me errors from the web service"`
- `"Get logs from production environment"`

### Environment Variables
- `"Get the DATABASE_URL from production"`
- `"List all environment variables for the API service"`
- `"Show me the JWT_SECRET value"`

### Deployment
- `"Redeploy the API service"`
- `"Check deployment status"`
- `"Get the latest deployment logs"`

---

## Testing the Configuration

### In Cursor:
1. Restart Cursor
2. Ask: `"List my Railway projects"`
3. The AI should be able to query Railway directly

### In Claude Desktop:
1. Restart Claude Desktop
2. Ask: `"What Railway projects do I have?"`
3. Claude should connect to Railway

### In VS Code:
1. Open VS Code in this workspace
2. Open GitHub Copilot Chat
3. Ask: `"Show me Railway deployment status"`
4. Copilot should use the Railway MCP server

---

## Troubleshooting

### Railway MCP Not Working

1. **Check Railway CLI:**
   ```bash
   railway whoami
   ```
   If not logged in, run: `railway login`

2. **Check MCP Server:**
   ```bash
   npx -y @railway/mcp-server --version
   ```

3. **Restart IDE:**
   - Cursor: Quit and reopen
   - Claude Desktop: Quit and reopen
   - VS Code: Reload window (Cmd+Shift+P → "Reload Window")

4. **Check Logs:**
   - Cursor: Check `~/.cursor/logs/`
   - Claude Desktop: Check Console logs
   - VS Code: Check Output panel → "MCP" channel

### Environment-Specific Issues

**Local Development:**
- Railway MCP works with local Railway CLI
- Uses your authenticated Railway account
- Can access all projects you have access to

**Production:**
- Same Railway account access
- Can manage production deployments
- Can view production logs

---

## Security Notes

⚠️ **Important:**
- Railway MCP requires Railway CLI authentication
- It can execute Railway commands on your behalf
- Destructive actions (like deleting services) are intentionally excluded
- Always review commands before execution

---

## Next Steps

Now that Railway MCP is configured, you can:

1. **Use it to manage deployments:**
   - `"Deploy the latest code to production"`
   - `"Check if the API deployment succeeded"`

2. **Debug production issues:**
   - `"Get the last 100 lines of API logs"`
   - `"Show me errors from the last hour"`

3. **Manage environment variables:**
   - `"Get the production DATABASE_URL"`
   - `"List all environment variables"`

4. **Monitor services:**
   - `"What's the status of all services?"`
   - `"Show me recent deployments"`

---

## References

- [Railway MCP Server Documentation](https://docs.railway.com/reference/mcp-server)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [VS Code MCP Documentation](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)

---

**Last Updated:** January 22, 2026  
**Configured By:** Auto (via Cursor AI)
