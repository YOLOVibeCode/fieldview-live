# Deployment Documentation Index

**Single source of truth for deployment and triage.**

**Triage & Logs (start here when something’s wrong):**
- ✅ [ERROR-INVESTIGATION-WORKFLOW.md](ERROR-INVESTIGATION-WORKFLOW.md) – **START HERE** for deployment/error triage (MCP, Browser MCP, scripts)
- ✅ [DEBUG-QUICK-REFERENCE.md](DEBUG-QUICK-REFERENCE.md) – Commands and lnav cheat sheet
- ✅ [DEPLOYMENT-MONITORING-REALTIME.md](DEPLOYMENT-MONITORING-REALTIME.md) – Real-time API/Web monitoring
- ✅ [MONITORING-DISTRIBUTION-FLOW.md](MONITORING-DISTRIBUTION-FLOW.md) – How logs/status reach you
- ✅ [DEBUG-RAILWAY-LOGS-GUIDE.md](DEBUG-RAILWAY-LOGS-GUIDE.md) – Log download and analysis

**Deploy (how to ship):**
- ✅ [DEPLOYMENT_OPTIONS.md](DEPLOYMENT_OPTIONS.md) – **SOURCE OF TRUTH** for all deployment methods
- ✅ [DEPLOY_TO_RAILWAY.md](DEPLOY_TO_RAILWAY.md) – First-time Railway setup
- ✅ [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md) – Environment variables
- ✅ [RAILWAY_DEPLOYMENT_CHECKLIST.md](RAILWAY_DEPLOYMENT_CHECKLIST.md) – Pre/post deploy checklist
- ✅ [RAILWAY_CONFIG_SOURCE_OF_TRUTH.md](RAILWAY_CONFIG_SOURCE_OF_TRUTH.md) – Config reference
- ✅ [RAILWAY-DEPLOYMENT-INSTRUCTIONS.md](RAILWAY-DEPLOYMENT-INSTRUCTIONS.md) – Marketplace-specific

**Other:**
- ✅ [READY-TO-RUN.md](READY-TO-RUN.md) – Local development readiness

---

## Quick Reference

**Deploy Now:**
```bash
# Full validation (30 min)
./scripts/railway-ready-check.sh

# Quick deploy (2 min)  
./scripts/yolo-deploy.sh api

# Read deployment options
cat DEPLOYMENT_OPTIONS.md
```

**First Time Setup:**
```bash
# Read Railway setup guide
cat DEPLOY_TO_RAILWAY.md
```

