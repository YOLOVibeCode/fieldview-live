# Error Investigation Workflow

**Status:** Standard Operating Procedure  
**Priority:** CRITICAL - Quick error access is essential

---

## 🎯 Standard Method: Railway MCP (Natural Language)

**This is the PRIMARY method for error investigation.**

### Step 1: Verify Railway MCP is Ready

```bash
./scripts/test-railway-mcp.sh
```

**Expected Output:**
```
✅ Railway MCP is Ready!
```

If not ready, fix the issues shown, then proceed.

### Step 2: Open Cursor Composer

Press `Cmd+I` (or `Cmd+Shift+I`) to open Cursor Composer.

### Step 3: Ask for Logs/Errors

Use natural language to get exactly what you need:

**Quick Error Investigation:**
```
"Get the latest API logs"
"Show me errors from the web service"
"Get errors from the last hour"
"Show me deployment errors"
```

**Specific Searches:**
```
"Search API logs for 'unlock'"
"Find 'PrismaClientInitializationError' in logs"
"Show me database connection errors"
```

**Deployment Status:**
```
"Show deployment status"
"What's the latest API deployment?"
"Check if web service is running"
```

**Environment Variables:**
```
"Get the DATABASE_URL from production"
"Show me all environment variables for API"
```

---

## Why Railway MCP is the Standard

### ✅ Advantages

1. **Speed** - Instant results vs 10-30 second CLI waits
2. **Natural Language** - No command memorization
3. **Smart Filtering** - AI filters intelligently
4. **Better Formatting** - Clean, readable output
5. **Context-Aware** - Understands what you're looking for
6. **No Timeouts** - Handles errors gracefully

### ❌ Railway CLI Problems

1. **Slow** - Takes 10-30 seconds per command
2. **Timeouts** - Often hangs or fails
3. **Verbose** - Too much output, hard to filter
4. **Complex** - Requires exact command syntax
5. **Manual Filtering** - Need to pipe to grep/sed

---

## Workflow Examples

### Example 1: Production Error Investigation

**Scenario:** User reports "Stream not saving"

**Workflow:**
1. Run: `./scripts/test-railway-mcp.sh` ✅
2. Open Composer (Cmd+I)
3. Ask: `"Get errors from API service in the last 30 minutes"`
4. Review filtered error output
5. Ask: `"Search API logs for 'save' or 'settings'"`
6. Identify root cause
7. Fix and deploy

**Time:** ~2 minutes (vs 10+ minutes with CLI)

### Example 2: Deployment Verification

**Scenario:** Just deployed, want to verify it worked

**Workflow:**
1. Run: `./scripts/test-railway-mcp.sh` ✅
2. Open Composer (Cmd+I)
3. Ask: `"Show deployment status"`
4. Ask: `"Get the last 20 lines of API logs"`
5. Verify no errors

**Time:** ~30 seconds (vs 5+ minutes with CLI)

### Example 3: Debugging Database Issues

**Scenario:** Database connection errors

**Workflow:**
1. Run: `./scripts/test-railway-mcp.sh` ✅
2. Open Composer (Cmd+I)
3. Ask: `"Find database connection errors in API logs"`
4. Ask: `"Get the DATABASE_URL from production"`
5. Verify configuration

**Time:** ~1 minute (vs 10+ minutes with CLI)

---

## Fallback: Railway CLI (If MCP Not Available)

**Only use if Railway MCP test fails:**

```bash
# Get recent logs
./scripts/railway-logs.sh recent api
./scripts/railway-logs.sh recent web

# Get only errors
./scripts/railway-logs.sh errors api
./scripts/railway-logs.sh errors web

# Search logs
./scripts/railway-logs.sh search api "error"
```

**⚠️ Warning:** Railway CLI is slow and may timeout. Fix Railway MCP instead.

---

## Pre-Investigation Checklist

Before investigating errors, always:

1. ✅ **Test Railway MCP:**
   ```bash
   ./scripts/test-railway-mcp.sh
   ```

2. ✅ **Verify you're in the right environment:**
   - Production: `https://fieldview.live`
   - Local: `http://localhost:4300`

3. ✅ **Check deployment status:**
   - Ask: `"Show deployment status"` (in Composer)

4. ✅ **Get recent logs:**
   - Ask: `"Get the latest API logs"` (in Composer)

---

## Common Error Patterns

### Database Connection Errors

**Symptoms:**
- `PrismaClientInitializationError`
- `Can't reach database server`
- `Connection timeout`

**Investigation:**
```
"Find database connection errors in API logs"
"Get the DATABASE_URL from production"
"Show me startup validation errors"
```

### API Errors

**Symptoms:**
- 500 errors
- "Stream not found"
- Authentication failures

**Investigation:**
```
"Get errors from API service"
"Search API logs for 'not found'"
"Show me 500 errors from last hour"
```

### Deployment Failures

**Symptoms:**
- Build fails
- Service won't start
- TypeScript errors

**Investigation:**
```
"Show deployment status"
"Get build logs for API"
"Find TypeScript errors in build"
```

---

## Quick Reference

| Task | Railway MCP Command | Time |
|------|---------------------|------|
| Get latest logs | `"Get the latest API logs"` | ~5s |
| Find errors | `"Show me errors from API"` | ~5s |
| Search logs | `"Search API logs for 'error'"` | ~5s |
| Deployment status | `"Show deployment status"` | ~5s |
| Environment vars | `"Get DATABASE_URL from production"` | ~5s |

**vs Railway CLI:** 10-30 seconds per command, often timeouts

---

## Best Practices

1. **Always test Railway MCP first:**
   ```bash
   ./scripts/test-railway-mcp.sh
   ```

2. **Use specific queries:**
   - ✅ `"Get errors from API in last hour"`
   - ❌ `"Get logs"` (too broad)

3. **Combine queries:**
   - First: `"Show deployment status"`
   - Then: `"Get errors from failed deployment"`

4. **Document findings:**
   - Copy relevant log snippets
   - Note timestamps
   - Document root cause

---

## Troubleshooting

### Railway MCP Not Working

1. **Run test script:**
   ```bash
   ./scripts/test-railway-mcp.sh
   ```

2. **Check troubleshooting guide:**
   - [Railway MCP Troubleshooting](MCP-RAILWAY-TROUBLESHOOTING.md)

3. **Restart Cursor:**
   - Quit Cursor (Cmd+Q)
   - Wait 5 seconds
   - Reopen Cursor

4. **Use fallback:**
   ```bash
   ./scripts/railway-logs.sh errors api
   ```

---

## Summary

**Standard Workflow:**
1. `./scripts/test-railway-mcp.sh` ✅
2. Open Composer (Cmd+I)
3. Ask natural language questions
4. Get instant, filtered results

**Time Savings:**
- Railway MCP: ~5 seconds per query
- Railway CLI: 10-30 seconds per query (often fails)

**Result:** 10x faster error investigation

---

**Last Updated:** January 22, 2026  
**Status:** Standard Operating Procedure
