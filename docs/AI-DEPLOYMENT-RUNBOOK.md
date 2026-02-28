# AI Deployment Runbook

**Use this runbook when the user asks to solve deployment issues, monitor deployments, or get deployment visibility—with AI assistance.**

This is the **single source of truth for AI-driven deployment triage and monitoring**. Follow it step-by-step.

---

## 1. Intent detection

Treat the user as asking for AI-assisted deployment help when they say things like:

- "Solve deployment issues (using AI)"
- "Monitor deployment with AI"
- "Deployment is failing – help me figure it out"
- "Can we fix/monitor deployment using AI?"
- "I want visibility into deployment" / "See what’s happening with deploy"
- "Check if deploy worked" / "Why did deploy fail?"
- "Get deployment status" / "Show me deployment errors"

When you detect this, **follow the flow below**. Prefer **MCP tools first** (Railway MCP, Browser MCP); use scripts only if MCP isn’t available or the user runs commands themselves.

---

## 2. Tools available to you

| Tool | Use for | How you use it |
|------|---------|-----------------|
| **Railway MCP** | Status, logs, build/deploy info, env vars | In Composer: ask in natural language, e.g. "What’s the deployment status for API and Web?" / "Get latest API logs" / "Show errors from the last 30 minutes" |
| **Browser MCP** | Is prod up? Health response? UI ok? | In Composer: "Open https://api.fieldview.live/health and show the response" / "Open https://fieldview.live and confirm it loads" |
| **Scripts** | When user runs them, or when MCP isn’t usable | `./scripts/check-deployment-status.sh`, `./scripts/monitor-deployments-realtime.sh both`, `./scripts/debug-railway-logs.sh api 2000 --errors-only` |
| **Docs** | Exact commands, flows, troubleshooting | [ERROR-INVESTIGATION-WORKFLOW.md](ERROR-INVESTIGATION-WORKFLOW.md), [DEPLOYMENT_INDEX.md](DEPLOYMENT_INDEX.md), [DEPLOY-WITH-VISIBILITY.md](DEPLOY-WITH-VISIBILITY.md) |

---

## 3. Triage flow (follow in order)

### Step A – Clarify if needed

- **“Something’s wrong”** → Go to Step B.
- **“I want to deploy and watch it”** → Give them [DEPLOY-WITH-VISIBILITY.md](DEPLOY-WITH-VISIBILITY.md): preflight → start `./scripts/monitor-deployments-realtime.sh both` in another terminal → then push. Optionally run preflight for them.
- **“I only want to monitor”** → Tell them to run `./scripts/monitor-deployments-realtime.sh both` and/or use Railway MCP: "Show deployment status for API and Web."

### Step B – Get current status

**You (AI) should:**

1. **Railway MCP (preferred)**  
   Ask (in Composer, as the user or as you instructing them):  
   *"What’s the current deployment status for API and Web services on Railway?"*  
   or: *"Show me the latest deployments for API and Web."*

2. **Browser MCP (health)**  
   Ask:  
   *"Open https://api.fieldview.live/health and show the JSON response."*  
   *"Open https://fieldview.live and say if the page loads."*

3. **If no MCP**  
   Tell the user to run:  
   `./scripts/check-deployment-status.sh`  
   (requires `apps/api` and `apps/web` linked; if not, point them to Railway MCP or to `cd apps/api && railway link` / `cd apps/web && railway link`.)

**Output to the user:**  
- One-line status: e.g. "API: last deploy SUCCESS / FAILED / BUILDING; Web: …"  
- Health: "API health returns …" / "Site loads: yes/no."

### Step C – Get logs/errors (if something is wrong or unclear)

**You (AI) should:**

1. **Railway MCP (preferred)**  
   Ask:  
   *"Get the latest API logs"* / *"Get the latest Web logs"*  
   *"Show me errors from the API service in the last 30 minutes"*  
   *"Show build logs for the last failed deployment"*

2. **If user will run scripts**  
   - Recent errors:  
     `./scripts/debug-railway-logs.sh api 2000 --errors-only`  
   - Deploy-related lines:  
     `./scripts/debug-railway-logs.sh api 5000 --deployments`  
   - Live tail:  
     `./scripts/monitor-deployments-realtime.sh both`  
   (From repo root; Railway must be linked from `apps/api` / `apps/web` per [MONITORING-DISTRIBUTION-FLOW.md](MONITORING-DISTRIBUTION-FLOW.md).)

**Output to the user:**  
- Short summary: e.g. "Last 30 minutes: build failed at …" / "API logs show …"  
- If you saw raw logs, quote the 1–3 most relevant lines.

### Step D – Interpret and propose next step

Use this only as a pattern guide; base your answer on what you actually saw in B and C.

| What you saw | Suggest |
|--------------|---------|
| Build failed (e.g. TypeScript, missing dep) | "Preflight catches this. Run `./scripts/preflight-build.sh` locally, fix the reported errors, then push again." Point to [DEPLOY-WITH-VISIBILITY](DEPLOY-WITH-VISIBILITY.md). |
| Deploy “success” but 502 / timeout | "App may be crashing after start. Use Railway MCP: 'Get the latest API (or Web) logs after the last deploy' and look for stack traces or exit codes." Or run `./scripts/debug-railway-logs.sh api 3000 --errors-only`. |
| Health returns non-200 or error body | "API/Web may be unhealthy. Check logs for the service (Railway MCP or `debug-railway-logs.sh ... --errors-only`)." Mention [ERROR-INVESTIGATION-WORKFLOW](ERROR-INVESTIGATION-WORKFLOW.md). |
| “No linked project” or no logs | "CLI needs to be run from the app that’s linked. Run `cd apps/api && railway link` and `cd apps/web && railway link` once, then rerun the script." Or use Railway MCP, which doesn’t depend on local link. |
| User wants to “see it live” | "In a separate terminal run `./scripts/monitor-deployments-realtime.sh both` and keep it open. Then push; you’ll see build and deploy logs in that terminal." |

Always end with a single **concrete next action** (one command or one MCP request).

---

## 4. Phrases you can suggest the user ask you (or use in Composer)

Copy-paste style so the user can use them with an AI or MCP:

- *"What’s the deployment status for API and Web on Railway?"*
- *"Get the latest API logs and any errors from the last 30 minutes."*
- *"Open https://api.fieldview.live/health and show the response."*
- *"Open https://fieldview.live and confirm it loads."*
- *"Show me the last failed build logs for the API service."*

---

## 5. Where to read more (canonical docs)

- **[ERROR-INVESTIGATION-WORKFLOW.md](ERROR-INVESTIGATION-WORKFLOW.md)** – Full triage flow, MCP vs CLI, when to use what.
- **[DEPLOYMENT_INDEX.md](DEPLOYMENT_INDEX.md)** – Index of all deployment/triage docs.
- **[DEPLOY-WITH-VISIBILITY.md](DEPLOY-WITH-VISIBILITY.md)** – Preflight → start monitor → push sequence.
- **[DEPLOYMENT-MONITORING-REALTIME.md](DEPLOYMENT-MONITORING-REALTIME.md)** – How `monitor-deployments-realtime.sh` works and what you’ll see.
- **[MONITORING-DISTRIBUTION-FLOW.md](MONITORING-DISTRIBUTION-FLOW.md)** – How logs/status get from Railway to the user (and why “run from app dir” matters).

---

## 6. Summary for AI

When the user wants to **solve deployment issues** or **monitor deployments** with AI:

1. **Detect intent** (Section 1).
2. **Get status** via Railway MCP and/or Browser MCP (Section 3, Step B).
3. **Get logs/errors** via Railway MCP or scripts (Section 3, Step C).
4. **Interpret and recommend one next action** (Section 3, Step D).
5. Point to **ERROR-INVESTIGATION-WORKFLOW** or **DEPLOY-WITH-VISIBILITY** when they need the full human-facing flow.

Use this runbook as the single place you look when helping with deployment and monitoring.
