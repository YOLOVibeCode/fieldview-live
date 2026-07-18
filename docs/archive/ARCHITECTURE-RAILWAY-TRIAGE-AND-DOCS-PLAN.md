# Architecture: Fastest Railway Triage + Doc Consolidation Plan

**Role:** Architect (analysis and recommendations only; no implementation)  
**Date:** January 2026  
**Status:** Plan for review  

**Executed:** Obsolete docs were **removed** (not archived). Single source of truth: ERROR-INVESTIGATION-WORKFLOW + DEPLOYMENT_INDEX + canon set below.

---

## 1. Executive Summary

**Goal:** Shortest path from “something’s wrong with deployment” to “I know what’s wrong and what to do,” and one clear, small set of docs—no duplicates or stale snapshots.

**Findings:**

- There are **30+ docs** that touch Railway, deployment, or deployment monitoring. Many are point-in-time status reports, implementation summaries, or overlapping quick-starts. That slows triage.
- The **fastest triage path** is already present in pieces (MCP, real-time monitor, debug script, Browser MCP) but is split across many files. No single “start here for triage” exists.
- **DEPLOYMENT_INDEX.md** is outdated: it doesn’t mention MCP, real-time monitoring, or the current scripts and still points to old guides.

**Recommendation:** Define one “fastest triage path,” keep a **minimal canon** of ~5–7 living docs, and **archive or remove** the rest so triage runs through one entry point and one small graph.

---

## 2. Fastest Triage Path (Target State)

This is the flow that should be documented as *the* way to triage Railway deployments. Total time target: **under 2 minutes** to “I see the failure or I see it’s healthy.”

### Step 1: Is it up? (≈15 s)

- **Railway MCP (Composer):** “What’s the deployment status for API and Web?”
- **Or** Browser MCP: “Open https://api.fieldview.live/health and show the response” and “Open https://fieldview.live and confirm it loads.”
- **Or** CLI (if linked): `./scripts/check-deployment-status.sh`

### Step 2: What’s failing? (≈30 s)

- **Railway MCP:** “Show the latest API logs” / “Show the latest Web logs” / “Show errors from the last 15 minutes.”
- **Or** real-time: `./scripts/monitor-deployments-realtime.sh both` and watch build/deploy/start/health.
- **Or** recent logs + search: `./scripts/debug-railway-logs.sh api 2000 --errors-only` (or `--deployments`) and use lnav.

### Step 3: Interpret (≈30 s)

- Use **DEBUG-QUICK-REFERENCE** (or its successor) for lnav filters and SQL if you’re in log files.
- Use **MONITORING-DISTRIBUTION-FLOW** (or its successor) only if “no logs / wrong service” (e.g. linking, app dir).

### Step 4: Act or escalate

- Fix (code/config), redeploy, or open a ticket with the exact failure and logs already in hand.

**Principle:** One entry doc (“Railway deployment triage”) states this path and points to the minimal set of supporting docs. No triage doc should send the reader to more than 2–3 other docs.

---

## 3. Doc Inventory: Railway / Deployment / Monitoring / MCP

Docs are grouped by theme. Verdicts: **KEEP** (living, part of canon), **MERGE** (content folded into another), **ARCHIVE** (move to `docs/archive/...`), **REMOVE** (redundant or obsolete and not worth keeping).

### 3.1 Triage / “How do I …?” (Entry + Quick Ref)

| Doc | Role | Verdict | Note |
|-----|------|---------|------|
| **ERROR-INVESTIGATION-WORKFLOW.md** | Main “how do I get logs/status?” | **KEEP** | Make it the primary triage entry; add the 4-step path above and “fastest triage” as the recommended flow. |
| **DEBUG-QUICK-REFERENCE.md** | Commands + lnav in one place | **KEEP** | Stay as the one “cheat sheet” for scripts + lnav. Link from triage. |
| **QUICK-START-DEPLOYMENT-MONITORING.md** | One-pager for real-time monitor | **MERGE** | Fold into DEPLOYMENT-MONITORING-REALTIME or into ERROR-INVESTIGATION-WORKFLOW “Step 2: real-time.” Avoid three “quick start” docs for the same workflow. |

### 3.2 Real-Time Monitoring & Distribution

| Doc | Role | Verdict | Note |
|-----|------|---------|------|
| **DEPLOYMENT-MONITORING-REALTIME.md** | How to run and use the real-time monitor | **KEEP** | Canon. Include (or cross-link) the “distribution” note (run from app dirs) or keep a single link to MONITORING-DISTRIBUTION-FLOW. |
| **MONITORING-DISTRIBUTION-FLOW.md** | How logs/status get from Railway to you; app-dir requirement | **KEEP** | Canon. Referenced when “no logs” or “wrong service.” |
| **DEPLOYMENT-TRACKING-LNAV.md** | lnav SQL/queries for deployments | **KEEP** | Canon for “analyze logs in lnav.” Can be “See also” from DEBUG-QUICK-REFERENCE. |

### 3.3 Log Download / Debug Scripts

| Doc | Role | Verdict | Note |
|-----|------|---------|------|
| **DEBUG-RAILWAY-LOGS-GUIDE.md** | Full guide for debug-railway-logs.sh + lnav | **KEEP** | Canon for “I need to pull and search logs.” |
| **REAL-TIME-LOGS-STANDARD.md** | Standard for real-time logs (--follow, etc.) | **MERGE** | Fold “what’s standard” into DEBUG-RAILWAY-LOGS-GUIDE or DEPLOYMENT-MONITORING-REALTIME; avoid a separate “standard” doc that only restates one script. |
| **RAILWAY-LOGS-DOWNLOAD-STANDARD.md** | MCP-first download + CLI fallback | **MERGE** | Rationale for “use MCP first” can live in ERROR-INVESTIGATION-WORKFLOW or MCP-FIRST-ENFORCEMENT; actual commands are in DEBUG-QUICK-REFERENCE. Merge or archive. |
| **RAILWAY-LOGS-IMPLEMENTATION-SUMMARY.md** | Implementation notes + timings | **ARCHIVE** | Point-in-time; move to `docs/archive/railway-logs-2026-01/`. |

### 3.4 MCP (Railway + Browser)

| Doc | Role | Verdict | Note |
|-----|------|---------|------|
| **MCP-RAILWAY-SETUP.md** | How to set up Railway MCP | **KEEP** | Canon for setup. |
| **RAILWAY-MCP-STATUS.md** | “Is it running?” + tools | **KEEP** | Short, operational. Keep or merge into MCP-RAILWAY-TROUBLESHOOTING as a “Status check” section. |
| **RAILWAY-MCP-VS-CLI.md** | Why use MCP instead of CLI | **KEEP** | Good justification; link from triage and from MCP-RAILWAY-SETUP. |
| **MCP-RAILWAY-TROUBLESHOOTING.md** | Fixing Railway MCP issues | **KEEP** | Canon for “MCP not working.” |
| **MCP-FIRST-ENFORCEMENT.md** | Policy: use MCP before CLI | **KEEP** | Canon. Triage doc should state “MCP first” and link here. |
| **MCP-FIRST-IMPLEMENTATION-SUMMARY.md** | How enforcement was implemented | **ARCHIVE** | Move to `docs/archive/mcp-first-2026-01/` unless you need it for audits. |
| **BROWSER-MCP-SETUP.md** | Browser MCP setup/usage | **KEEP** | Canon for “see production / Railway UI.” |
| **BROWSER-MCP-DEPLOYMENT-CHECK.md** | “Check deployment status with Browser MCP” | **MERGE** | Fold into BROWSER-MCP-SETUP as a “Deployment checks” section to avoid two Browser MCP “how-tos.” |
| **CURRENT-DEPLOYMENT-STATUS-BROWSER-MCP.md** | Snapshot of one Browser MCP run | **ARCHIVE** | Point-in-time; move to `docs/archive/deployment-status-snapshots/` or delete. |
| **BROWSER-MCP-TEST-RESULTS.md** | Past test results | **ARCHIVE** | `docs/archive/browser-mcp-tests/` if you want to keep history. |
| **CHAT_UX_BROWSER_MCP_TEST_REPORT.md** | Chat UX + Browser MCP | **KEEP only if** chat UX is still relevant; else **ARCHIVE**. |

### 3.5 Deployment “How to Deploy” (Not Triage)

| Doc | Role | Verdict | Note |
|-----|------|---------|------|
| **DEPLOYMENT_INDEX.md** | Index of deployment docs | **UPDATE** | Outdated. Should list: triage entry (ERROR-INVESTIGATION-WORKFLOW), DEPLOY_TO_RAILWAY, DEPLOYMENT_OPTIONS, preflight, and the 2–3 canon triage/monitoring docs. Remove references to retired docs. |
| **DEPLOYMENT_OPTIONS.md** | Source of truth for deploy methods | **KEEP** | Already framed as source of truth; triage doc should link “to deploy,” not duplicate. |
| **DEPLOY_TO_RAILWAY.md** | First-time Railway setup | **KEEP** | Referenced from DEPLOYMENT_INDEX and README. |
| **RAILWAY_DEPLOYMENT_CHECKLIST.md** | Pre/post deploy checklist | **KEEP** | Operational checklist; distinct from triage. |
| **RAILWAY_CONFIG_SOURCE_OF_TRUTH.md** | Env and config | **KEEP** | Referenced when debugging config. |
| **RAILWAY-DEPLOYMENT-INSTRUCTIONS.md** | Marketplace-specific deploy | **KEEP** if still used; else **ARCHIVE** under a marketplace/archive path. |

### 3.6 Stale / Point-in-Time / Superseded (Archive or Remove)

| Doc | Verdict | Reason |
|-----|---------|--------|
| **DEPLOYMENT-TEST-PLAN.md** | **ARCHIVE** | Test run plan; keep in `docs/archive/deployment-test-2026-01/` if you want a template for future test runs. |
| **DEPLOYMENT-TEST-EXECUTION.md** | **ARCHIVE** | Snapshot of one execution. |
| **DEPLOYMENT-FAILURE-ANALYSIS.md** | **ARCHIVE** | Valuable root-cause analysis; move to `docs/archive/deployment-failures-2026-01/` and add a one-line pointer from the triage doc (“Past failure analysis: …”) if useful. |
| **DEPLOYMENT-FIXES-IMPLEMENTED.md** | **ARCHIVE** | Implementation summary; `docs/archive/deployment-fixes-2026-01/`. |
| **ROOT-CAUSE-ANALYSIS.md** | **ARCHIVE** | Likely same incident as DEPLOYMENT-FAILURE-ANALYSIS; archive together. |
| **FINAL-DEPLOYMENT-STATUS.md** | **ARCHIVE** | Point-in-time status. |
| **PRODUCTION-DEPLOYMENT-STATUS.md** | **ARCHIVE** | Point-in-time (e.g. “Deploying”, “502”). |
| **PRODUCTION-DEPLOYMENT-COMPLETE.md** | **ARCHIVE** | “Deployment complete” snapshot. |
| **DEPLOYMENT-VERIFICATION-COMPLETE.md** | **ARCHIVE** | One-off verification. |
| **DEPLOYMENT-STREAM-DECOUPLING.md** | **ARCHIVE** | Feature-specific deploy summary. |
| **DEPLOYMENT-COMPLETE-ADMIN-STREAMURL-FIX.md** | **ARCHIVE** | Fix-specific summary. |
| **PRODUCTION-DEPLOYMENT-SUCCESS.md** | **ARCHIVE** | Snapshot. |
| **DEPLOYMENT_STATUS_JAN17_2026.md** | **ARCHIVE** | Dated snapshot. |
| **DEPLOYMENT_SUCCESS_JAN16_2026.md** | **ARCHIVE** | Dated snapshot. |
| **DEPLOYMENT_SUMMARY_20260111.md** | **ARCHIVE** | Dated snapshot. |
| **RAILWAY_BUILD_FIX_SUCCESS.md** | **ARCHIVE** | One-off fix report. |
| **RAILWAY_BUILD_FIXED.md** | **ARCHIVE** | One-off fix. |
| **RAILWAY_DEPLOYMENT_SUMMARY.md** | **ARCHIVE** | Phase summary. |
| **REAL-TIME-LOGS-IMPLEMENTATION.md** | **ARCHIVE** | Implementation summary. |
| **REAL-TIME-AUTO-START.md** | **MERGE or ARCHIVE** | “Auto-start” is a small behavior detail; fold into REAL-TIME-LOGS-STANDARD if you keep it, or into DEBUG-RAILWAY-LOGS-GUIDE / DEPLOYMENT-MONITORING-REALTIME, then archive. |
| **TRAP-SIGNAL-HANDLING.md** | **ARCHIVE** | Script implementation detail; `docs/archive/scripts/` or leave only linked from script header. |

### 3.7 Claude Desktop / Other MCP Clients

| Doc | Role | Verdict | Note |
|-----|------|---------|------|
| **CLAUDE-DESKTOP-RAILWAY-GUIDE.md** | Railway + Claude Desktop | **KEEP** | Canon for that client. |

---

## 4. Recommended Doc Structure (After Cleanup)

### 4.1 Single Triage Entry Point

**Option A (recommended):** Keep **ERROR-INVESTIGATION-WORKFLOW.md** as the triage entry, and add at the top a short “Fastest Railway deployment triage” section (the 4 steps in §2). Title could be refined to: “Error & deployment triage” or “Railway deployment triage.”

**Option B:** Add a new **RAILWAY-DEPLOYMENT-TRIAGE.md** that is only the 4-step path + links; ERROR-INVESTIGATION-WORKFLOW becomes “Detailed error investigation.” README and DEPLOYMENT_INDEX both point to the triage doc first.

### 4.2 Canon Set (5–7 Living Docs for Triage/Monitoring)

1. **Triage entry:** ERROR-INVESTIGATION-WORKFLOW (or new RAILWAY-DEPLOYMENT-TRIAGE).
2. **Quick ref:** DEBUG-QUICK-REFERENCE.
3. **Real-time monitoring:** DEPLOYMENT-MONITORING-REALTIME.
4. **Distribution / “no logs”:** MONITORING-DISTRIBUTION-FLOW.
5. **Logs in depth:** DEBUG-RAILWAY-LOGS-GUIDE (+ DEPLOYMENT-TRACKING-LNAV as “lnav deployment queries”).
6. **MCP:** MCP-RAILWAY-SETUP, RAILWAY-MCP-VS-CLI, MCP-RAILWAY-TROUBLESHOOTING, MCP-FIRST-ENFORCEMENT, BROWSER-MCP-SETUP (optional: merge BROWSER-MCP-DEPLOYMENT-CHECK into BROWSER-MCP-SETUP).

Deploy-side (how to ship, not how to triage): DEPLOYMENT_OPTIONS, DEPLOY_TO_RAILWAY, RAILWAY_DEPLOYMENT_CHECKLIST, RAILWAY_CONFIG_SOURCE_OF_TRUTH stay as they are, but DEPLOYMENT_INDEX is updated to list them and the triage entry.

### 4.3 Archive Layout

- `docs/archive/railway-triage-and-logs-2026-01/`  
  - RAILWAY-LOGS-IMPLEMENTATION-SUMMARY, REAL-TIME-LOGS-IMPLEMENTATION, REAL-TIME-AUTO-START (if merged), TRAP-SIGNAL-HANDLING.
- `docs/archive/deployment-status-snapshots-2026/`  
  - All “DEPLOYMENT-* complete/status/success” and “PRODUCTION-DEPLOYMENT-*” snapshots, FINAL-DEPLOYMENT-STATUS, CURRENT-DEPLOYMENT-STATUS-BROWSER-MCP, DEPLOYMENT_TEST_*.
- `docs/archive/deployment-failures-and-fixes-2026-01/`  
  - DEPLOYMENT-FAILURE-ANALYSIS, DEPLOYMENT-FIXES-IMPLEMENTED, ROOT-CAUSE-ANALYSIS.
- `docs/archive/mcp-first-2026-01/`  
  - MCP-FIRST-IMPLEMENTATION-SUMMARY.
- `docs/archive/browser-mcp-tests/`  
  - BROWSER-MCP-TEST-RESULTS, CURRENT-DEPLOYMENT-STATUS-BROWSER-MCP (if you want to keep that run).
- Keep **docs/archive/deployment-v1/** as-is for “first deployment story.”

---

## 5. Changes to Key Docs (Content Only – No Edits Here)

These are the updates that would make triage “fastest” and the set consistent. Do not implement in this pass; treat as spec.

### ERROR-INVESTIGATION-WORKFLOW (or new triage doc)

- Add a “Fastest Railway deployment triage (under 2 min)” block at the top with the 4 steps from §2.
- For each step, one primary action (MCP or script) plus one fallback (e.g. CLI / Browser MCP).
- Links: DEBUG-QUICK-REFERENCE, DEPLOYMENT-MONITORING-REALTIME, MONITORING-DISTRIBUTION-FLOW, MCP-FIRST-ENFORCEMENT, BROWSER-MCP-SETUP.

### DEPLOYMENT_INDEX

- Add “Railway deployment triage” as the first section, pointing at ERROR-INVESTIGATION-WORKFLOW (or RAILWAY-DEPLOYMENT-TRIAGE).
- List canon triage/monitoring docs (DEBUG-QUICK-REFERENCE, DEPLOYMENT-MONITORING-REALTIME, DEBUG-RAILWAY-LOGS-GUIDE, MONITORING-DISTRIBUTION-FLOW).
- Remove or correct any reference to superseded/archived deployment guides.
- Keep “Deploy now” and “First time setup” but point at DEPLOYMENT_OPTIONS and DEPLOY_TO_RAILWAY.

### README

- Under “Error Investigation & Logs,” add one line: “Fastest path: see [Railway deployment triage](docs/ERROR-INVESTIGATION-WORKFLOW.md#fastest-railway-deployment-triage)” (or the new doc’s anchor).
- Ensure the “Standard methods” bullets and links only reference the canon docs (no broken or redundant links after archive).

### DEBUG-QUICK-REFERENCE

- Add one line: “For the full triage path, see [Error & deployment triage](docs/ERROR-INVESTIGATION-WORKFLOW.md).”
- Optionally add `./scripts/check-deployment-status.sh` and `./scripts/monitor-deployments-realtime.sh both` in a “Deployment triage” subsection.

### DEPLOYMENT-MONITORING-REALTIME

- Ensure “Distribution” points to MONITORING-DISTRIBUTION-FLOW.
- If QUICK-START-DEPLOYMENT-MONITORING is merged here, add a “Quick start” subsection at the top that replicates that one-pager.

### Merges to Do (When Implementing)

- **QUICK-START-DEPLOYMENT-MONITORING** → DEPLOYMENT-MONITORING-REALTIME (or triage doc “Step 2”).
- **BROWSER-MCP-DEPLOYMENT-CHECK** → BROWSER-MCP-SETUP (“Deployment checks”).
- **REAL-TIME-LOGS-STANDARD** and **RAILWAY-LOGS-DOWNLOAD-STANDARD** → absorb rationale/standard into ERROR-INVESTIGATION-WORKFLOW + DEBUG-QUICK-REFERENCE / DEBUG-RAILWAY-LOGS-GUIDE; then archive originals.

---

## 6. Implementation Order (When You Do Implement)

1. **Create archive dirs** under `docs/archive/` and move the “Archive” list from §3.6 (and the merges above) into them.
2. **Update ERROR-INVESTIGATION-WORKFLOW** (or add RAILWAY-DEPLOYMENT-TRIAGE) with the 4-step “fastest triage” and links.
3. **Merge** QUICK-START-DEPLOYMENT-MONITORING, BROWSER-MCP-DEPLOYMENT-CHECK, and (as chosen) REAL-TIME-LOGS-STANDARD / RAILWAY-LOGS-DOWNLOAD-STANDARD; delete or archive originals.
4. **Update DEPLOYMENT_INDEX** and **README** so the only “start here” for deployment issues is the triage doc and the canon set.
5. **Run a quick pass** over DEBUG-RAILWAY-LOGS-GUIDE, DEPLOYMENT-MONITORING-REALTIME, MONITORING-DISTRIBUTION-FLOW, and MCP docs: fix cross-links and remove links to archived files (or add “(archived)” and path).
6. **Regenerate or adjust docs/INDEX.md** if it’s auto-generated from a crawl, so it doesn’t list archived docs as primary.

---

## 7. Summary

- **Fastest triage:** One entry doc with a 4-step path (status → logs → interpret → act), always starting with MCP when available, and falling back to scripts/Browser MCP in a defined order.
- **Stale removal:** ~25 deployment/status/summary docs archived under `docs/archive/...` by theme; no deletion of unique content without a conscious “destroy” decision.
- **Updates:** ERROR-INVESTIGATION-WORKFLOW (or new triage doc), DEPLOYMENT_INDEX, README, DEBUG-QUICK-REFERENCE, and DEPLOYMENT-MONITORING-REALTIME updated so triage is one path and one small doc set.
- **Canon:** 5–7 living triage/monitoring docs + existing deploy docs; everything else either merged in or archived.

This plan is analysis and recommendation only. No edits to repo content have been made.
