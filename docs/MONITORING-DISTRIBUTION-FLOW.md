# Monitoring & Distribution Flow

**Purpose:** How deployment status and logs get from Railway to you.  
**Updated:** After making monitoring run from linked app dirs so Railway CLI has project context.

---

## 1. Data flow (high level)

```
Railway (API / Web services)
    ↓
Railway CLI (must run from a linked app dir: apps/api or apps/web)
    ↓
Our scripts (monitor / debug / check) run CLI from correct dir
    ↓
Output: terminal, lnav, or logs/railway/debug/
```

**Rule:** Every `railway` command is run from `apps/api` or `apps/web` via  
`(cd "$REPO_ROOT/apps/<service>" && railway ...)` so the CLI sees the right project.

---

## 2. Scripts and what they distribute

| Script | What it distributes | How |
|--------|---------------------|-----|
| `check-deployment-status.sh` | Deployment status (list, success/fail) | `railway deployment list` from `apps/api` / `apps/web` |
| `monitor-deployments-realtime.sh` | Live logs from API and/or Web | `railway logs` from each app dir → pipes → lnav or interleaved stream |
| `debug-railway-logs.sh` | Log batches or streams | `railway logs [--lines N]` from app dir → file or pipe → lnav |

---

## 3. Directory and linking

- **Repo root:** Where you run `./scripts/...`. Scripts set  
  `REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"` and never rely on `./apps/...` from a random cwd.
- **Linked dirs:** Railway expects to be run from a directory that has been `railway link`’d (e.g. `apps/api`, `apps/web`).  
  So we always run:
  - API: `(cd "$REPO_ROOT/apps/api" && railway ...)`
  - Web: `(cd "$REPO_ROOT/apps/web" && railway ...)`
- **Log output:** Written under `$REPO_ROOT/logs/railway/debug/` so paths are stable no matter where you started the script.

---

## 4. Status distribution (`check-deployment-status.sh`)

1. **API:** `(cd "$API_DIR" && railway deployment list --service api)`  
   - Shows last deployments, status, etc.  
   - If “Not linked”, we tell the user to run `cd apps/api && railway link` (or use Railway MCP).
2. **Web:** Same with `"$WEB_DIR"` and `--service web`.
3. **No cwd leak:** Status is fetched in subshells so the script’s cwd does not change.

---

## 5. Log distribution – real-time (`monitor-deployments-realtime.sh`)

- **Both services (lnav):**
  - Two FIFOs; two background jobs:
    - `(cd "$API_DIR" && railway logs) > api_pipe`
    - `(cd "$WEB_DIR" && railway logs) > web_pipe`
  - `lnav api_pipe web_pipe` reads both streams.
- **Both services (no lnav):**
  - Same two `(cd ... && railway logs)` in the background, with `sed` adding `[API]` / `[WEB]` prefixes; `wait` keeps the script alive.
- **Single service:**  
  `(cd "$REPO_ROOT/apps/$service" && railway logs)` → one pipe or directly to terminal.

Everything that runs `railway` does it from the correct app dir.

---

## 6. Log distribution – batch/stream (`debug-railway-logs.sh`)

- **Download:**  
  `(cd "$REPO_ROOT/apps/$service" && railway logs --service "$service" --lines "$lines")`  
  → `logs/railway/debug/<service>-<timestamp>.log` → optional filters → lnav.
- **Stream/follow:**  
  `(cd "$REPO_ROOT/apps/$service" && railway logs)`  
  → FIFO → lnav, or directly to terminal if lnav not used.
- **Service “all”:** One run per service (api, web), each from its own app dir; all resulting files can be passed to lnav.

---

## 7. Quick verification

- **Status:**  
  `./scripts/check-deployment-status.sh`  
  - Expect “API status retrieved” / “Web status retrieved” when each app dir is linked; otherwise clear “Not linked” and MCP/link instructions.
- **Real-time logs:**  
  `./scripts/monitor-deployments-realtime.sh both`  
  - Expect “Starting API stream (from apps/api)” and “Starting Web stream (from apps/web)”, then logs (or lnav).  
  - If you see “No linked project”, fix linking in `apps/api` and `apps/web`.
- **Batch logs:**  
  `./scripts/debug-railway-logs.sh api 100 --no-lnav`  
  - Expect “Using CLI (from apps/api)” and a new file under `logs/railway/debug/`.

---

## 8. When “distribution” fails

- **“No linked project”:**  
  Run `cd apps/api && railway link` and, if needed, `cd apps/web && railway link`.  
  Our scripts only run `railway` from those dirs; they do not fix linking for you.
- **Empty or no logs:**  
  Same as above; also confirm project/service names and `railway whoami`.
- **Wrong service:**  
  We use `apps/api` for the API and `apps/web` for the Web service. If your Railway project uses different service names, the `--service` flag in `deployment list` and `logs` must match what Railway shows.

---

## 9. Related docs

- [Deployment Monitoring Realtime](DEPLOYMENT-MONITORING-REALTIME.md) – how to run and use the real-time monitor.
- [Debug Railway Logs Guide](DEBUG-RAILWAY-LOGS-GUIDE.md) – batch download, filters, lnav.
- [Error Investigation Workflow](ERROR-INVESTIGATION-WORKFLOW.md) – when to use Railway MCP vs these scripts.

---

**Summary:** Monitoring “distribution” is: **Railway → CLI (from correct app dir) → our scripts → your terminal/lnav/files.**  
All script paths and `railway` calls use `REPO_ROOT` and the right `apps/<service>` so distribution works from any cwd and with a normal Railway link in each app.
