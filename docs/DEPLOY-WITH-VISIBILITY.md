# Deploy with Visibility

**Single source:** use this sequence to deploy and watch the process.

---

## 1. Preflight (required)

```bash
./scripts/preflight-build.sh
```

If it fails, fix errors before deploying. If it passes, continue.

---

## 2. Start visibility (do this first)

In a **separate terminal**, start the real-time monitor and leave it running:

```bash
./scripts/monitor-deployments-realtime.sh both
```

You’ll see API and Web logs stream; with lnav you get filters and SQL. Keep this running.

---

## 3. Deploy

In your **main terminal**:

```bash
git add -A
git commit -m "your message"
git push origin main
```

Railway will build and deploy. Watch the **monitor terminal** for:

- `Building with NIXPACKS...`
- `Deploying container...`
- `[STARTUP] ✅ Server listening on port …`
- Health / success or failure

---

## 4. Optional checks after deploy

- **Status:** `./scripts/check-deployment-status.sh` or Railway MCP: “What’s the deployment status for API and Web?”
- **Production:** Browser MCP: “Open https://fieldview.live and https://api.fieldview.live/health”

---

**Canon:** [ERROR-INVESTIGATION-WORKFLOW.md](ERROR-INVESTIGATION-WORKFLOW.md) · [DEPLOYMENT_INDEX.md](DEPLOYMENT_INDEX.md) · [DEPLOYMENT-MONITORING-REALTIME.md](DEPLOYMENT-MONITORING-REALTIME.md)
