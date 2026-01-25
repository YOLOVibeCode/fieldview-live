# Browser MCP Setup & Usage

**Date:** January 23, 2026  
**Status:** ✅ Standard Method for Visual Verification  
**Role:** Engineer (STRICT=false)

---

## 🎯 Overview

**Browser MCP enables visual verification and real-time status checking via browser automation.**

Use Browser MCP to:
- ✅ Check deployment status visually on Railway dashboard
- ✅ Verify production site is working
- ✅ Test UI components in real-time
- ✅ Take screenshots for documentation
- ✅ Navigate and interact with web pages

---

## 🚀 Quick Start

### Check Deployment Status

**In Cursor Composer (Cmd+I), ask:**
```
Navigate to https://railway.app and show me the deployment status for fieldview-live project
```

Or:
```
Go to https://fieldview.live and check if the site is working, then navigate to https://api.fieldview.live/health to verify the API
```

---

## 📋 Common Browser MCP Tasks

### 1. Check Railway Deployment Status

```
Navigate to Railway dashboard and show me the latest deployment status for API and Web services
```

**What Browser MCP will do:**
- Navigate to Railway dashboard
- Find your project
- Show deployment status
- Take screenshots if needed

---

### 2. Verify Production Site

```
Go to https://fieldview.live and verify the homepage loads correctly
```

**What Browser MCP will do:**
- Navigate to production site
- Check if page loads
- Verify UI elements
- Report any errors

---

### 3. Test API Health

```
Navigate to https://api.fieldview.live/health and show me the response
```

**What Browser MCP will do:**
- Navigate to health endpoint
- Show response
- Verify service is healthy

---

### 4. Check Direct Stream Page

```
Go to https://fieldview.live/direct/tchs/soccer-20260122-jv2 and verify it loads
```

**What Browser MCP will do:**
- Navigate to stream page
- Check if page loads
- Verify stream functionality
- Report any issues

---

## 🔧 Browser MCP Features

### Navigation
- Navigate to any URL
- Follow links
- Go back/forward
- Refresh page

### Inspection
- View page source
- Check console logs
- Inspect elements
- Take screenshots

### Interaction
- Click buttons
- Fill forms
- Submit forms
- Scroll pages

---

## 🎯 Standard Workflow

### For Deployment Verification

1. **Check Railway Dashboard:**
   ```
   Navigate to Railway dashboard and show deployment status
   ```

2. **Verify Production:**
   ```
   Go to https://fieldview.live and verify it's working
   ```

3. **Check API:**
   ```
   Navigate to https://api.fieldview.live/health and show response
   ```

---

## 📖 Integration with Other Tools

### Browser MCP + Railway MCP

**Best of both worlds:**
- Railway MCP for logs and infrastructure
- Browser MCP for visual verification

**Example workflow:**
1. Use Railway MCP: "Get latest API logs"
2. Use Browser MCP: "Navigate to production and verify it's working"
3. Compare results

---

## ✅ Best Practices

### 1. Use for Visual Verification

```
✅ Good: "Navigate to production and verify the page loads"
❌ Bad: "Get logs" (use Railway MCP instead)
```

### 2. Combine with Railway MCP

```
✅ Good: 
  1. Railway MCP: "Get deployment status"
  2. Browser MCP: "Verify production site"
```

### 3. Take Screenshots for Documentation

```
Navigate to the page and take a screenshot showing the current state
```

---

## 🔍 Troubleshooting

### Browser MCP Not Working

1. **Check Cursor MCP Configuration:**
   - Browser MCP should be in `~/.cursor/mcp.json`
   - Restart Cursor if needed

2. **Verify Browser MCP is Available:**
   - Open Composer (Cmd+I)
   - Ask: "Can you navigate to a website?"
   - If yes, Browser MCP is working

3. **Check for Errors:**
   - Look in Cursor logs for Browser MCP errors
   - Verify Browser MCP server is running

---

## 📖 Related Documentation

- **[Railway MCP Setup](MCP-RAILWAY-SETUP.md)** - Infrastructure MCP
- **[Error Investigation Workflow](ERROR-INVESTIGATION-WORKFLOW.md)** - Standard workflow
- **[Error Investigation Workflow](ERROR-INVESTIGATION-WORKFLOW.md)** - Triage and logs (single source of truth)

---

## 🎉 Summary

✅ **Visual verification** - See deployment status visually  
✅ **Real-time checking** - Check production site immediately  
✅ **Screenshot capability** - Document current state  
✅ **UI testing** - Verify components work  
✅ **Combined with Railway MCP** - Complete debugging solution  

**Result:** Visual verification alongside infrastructure monitoring! 🚀

---

**ROLE: engineer STRICT=false**  
**Browser MCP standard method established**
