# Traklet QA Runbook — Testing on DEV

> Everything a tester or engineer needs to run manual QA against
> **https://dev.fieldview.live** using the Traklet widget, and to keep the
> GitHub-backed test-case library up to date. No prior context required.

---

## 1. How the pieces fit together

```
.traklet/test-cases/**/*.md          (93 test cases, source of truth, in git)
        │
        │  node scripts/traklet-sync-github.mjs
        ▼
GitHub issues on YOLOVibeCode/fieldview-live
  labels: test-case, suite:<name>, priority-<level>
        │
        │  Traklet widget (GitHub adapter, reads issues live)
        ▼
Widget on https://dev.fieldview.live   ← testers execute + file bugs here
        │
        │  Bug filed from the widget records "- **URL:** https://dev.fieldview.live/..."
        ▼
GitHub Action .github/workflows/traklet-env-label.yml
  auto-adds the env:dev label based on that URL
```

Key rules baked into this setup:

- **Every URL inside a test case points at `https://dev.fieldview.live`** (the
  dev API is `https://api-dev.fieldview.live`). Testers who click through a
  test case always stay on DEV, never production.
- The widget only loads where `NEXT_PUBLIC_TRAKLET_ENABLED=true` **and**
  `NEXT_PUBLIC_TRAKLET_GITHUB_TOKEN` is set — DEV and UAT builds only. It can
  never appear on production.
- Sync is **idempotent**: each markdown file stores its GitHub issue number in
  `backend-id` frontmatter, so re-running the sync never duplicates issues.

---

## 2. For testers: run test cases on DEV

### Step 1 — Open the DEV site

1. Go to **https://dev.fieldview.live** in Chrome (or any modern browser).
2. Confirm you see the DEV environment banner/badge (env chrome). If you don't
   see it, you are probably on production — stop and re-check the URL.

### Step 2 — Open the Traklet widget

1. Look for the floating Traklet anchor icon in the **top-right** corner.
2. Click it to open the widget panel. You can drag it anywhere, or drag it to
   a screen edge to snap it as a sidebar.

### Step 3 — Identify yourself (first time only)

1. Click the **gear icon** in the widget header.
2. Enter your **name and email**. This is stored in your browser and used to
   attribute the issues and test results you create. It is not a login.

### Step 4 — Browse and execute test cases

1. In the widget, open the **test cases** view. Test cases are grouped by
   suite (`smoke`, `checkout`, `owner-portal`, `auth-admin`, etc.).
2. Open a test case. You will see Objective, Prerequisites, Steps, and
   Expected Result.
3. Follow the steps exactly. **All URLs in the steps already point at
   `https://dev.fieldview.live`** — just click/copy them as written.
   - Where a step says `{API_BASE_URL}`, use `https://api-dev.fieldview.live`.
4. To record results formally, start a **test run** (checkbox icon in the
   widget header), name it (e.g. "Aug 2026 regression"), then mark each test
   case **Pass / Fail / Blocked** as you go. Stop the run when finished —
   results are saved to history.

Recommended starting order: `suite:smoke` first (TC-SM-001, TC-SM-002), then
whatever suites your testing session targets.

### Step 5 — Attach evidence with Jam.dev (recommended)

Every test case has an **Evidence** section built for [Jam.dev](https://jam.dev)
recordings:

1. Install the [Jam browser extension](https://jam.dev) and record your testing
   session while you execute the steps (Jam captures clicks, network, console,
   and video automatically).
2. When done, copy the recording link (`https://jam.dev/c/...`).
3. In the widget, open the test case's **Evidence** section and paste the
   link. Traklet detects `jam.dev/c/` URLs and surfaces them as recordings on
   the test case. Screenshots can be pasted directly too (Ctrl+V / Cmd+V).

A failed test case with a Jam recording attached is the entry point for the
[Jam → Traklet autonomous QA pipeline](https://github.com/rvegajr/traklet/blob/main/JAM_TRAKLET_PIPELINE_RECIPE.md)
(recording → generated Playwright spec → automated fix → human-gated merge).

### Step 6 — File a bug when something fails

1. In the widget, create a **new issue** while you are on the page where the
   problem happened (the widget records the current page URL into the issue).
2. Describe what you did, what you expected, and what happened. Paste
   screenshots directly (Ctrl+V / Cmd+V) into the issue.
3. Submit. The issue is created on GitHub at
   https://github.com/YOLOVibeCode/fieldview-live/issues and a GitHub Action
   automatically tags it **`env:dev`** because the recorded URL starts with
   `dev.fieldview.live`.

### Step 7 — Verify your issue landed (optional)

Open https://github.com/YOLOVibeCode/fieldview-live/issues and filter by the
`env:dev` label. Your issue should appear within a few seconds, labeled.

---

## 3. For engineers: add or change test cases

Test cases live in `.traklet/test-cases/<suite>/TC-XXX-name.md`. The markdown
files are the source of truth; GitHub issues are generated from them.

### Step 1 — Write the markdown file

Use the **new Traklet format**: every `{traklet:...}` marker is wrapped in a
hidden `<span>` so it is invisible when the issue renders on GitHub, and the
Evidence section carries the Jam.dev placeholder. Copy an existing file (e.g.
`.traklet/test-cases/smoke/TC-SM-002-api-health.md`) as a template, or start
from this skeleton:

```markdown
---
id: TC-SM-003
title: Example new test case
priority: high            # low | medium | high | critical
labels:
  - smoke
suite: smoke              # folder name and suite grouping in the widget
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
What this verifies.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open `https://dev.fieldview.live/...`
2. ...
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
What should happen.
<span style="display:none">{/traklet:section:expected-result}</span>

<span style="display:none">{traklet:section:actual-result}</span>
## Actual Result
_Not yet tested._
<span style="display:none">{/traklet:section:actual-result}</span>

<span style="display:none">{traklet:section:evidence}</span>
## Evidence
_No recordings or screenshots attached yet._

> **Tip:** Use [Jam.dev](https://jam.dev) to record your testing session, then paste the link here.
<span style="display:none">{/traklet:section:evidence}</span>

<span style="display:none">{traklet:section:diagnostics}</span>
## Diagnostics
_Diagnostics will be auto-attached when submitting results._
<span style="display:none">{/traklet:section:diagnostics}</span>

<span style="display:none">{traklet:section:notes}</span>
## Notes

<span style="display:none">{/traklet:section:notes}</span>
```

**Rules:**

- `id` must be unique across all test cases (grep before choosing one).
- Every URL must use `https://dev.fieldview.live` (API:
  `https://api-dev.fieldview.live`). Never reference production hosts.
- Keep every marker wrapped in `<span style="display:none">...</span>` — this
  is the new Traklet format: the widget parses the markers, GitHub renders
  clean markdown without them. (The widget still parses the legacy bare
  `{traklet:...}` format, but new files must use hidden spans.)
- Keep the Evidence section's Jam.dev tip — the widget extracts
  `https://jam.dev/c/...` links pasted there as test evidence recordings.
- Do **not** hand-write `backend-id` / `last-synced`; the sync script manages
  those.

### Step 2 — Preview the sync

```bash
node scripts/traklet-sync-github.mjs --dry-run
```

Only files **without** a `backend-id` are listed as "would create". Existing
synced cases are skipped.

### Step 3 — Sync to GitHub

```bash
node scripts/traklet-sync-github.mjs
```

Token resolution order (no setup needed if you use the GitHub CLI):

1. `NEXT_PUBLIC_TRAKLET_GITHUB_TOKEN` env var (same var the widget uses)
2. `GITHUB_TOKEN` env var
3. `gh auth token` (i.e. just be logged in via `gh auth login`)

The script creates one GitHub issue per new test case with labels
`test-case`, `suite:<suite>`, `priority-<priority>`, plus any frontmatter
labels, and writes the issue number back into the file's `backend-id`.

### Step 4 — Commit the frontmatter changes

```bash
git add .traklet/test-cases && git commit -m "chore(traklet): sync test cases to GitHub"
```

Committing `backend-id` is what keeps future syncs idempotent for everyone.

### Editing an existing test case

Edit the markdown file, then push the change onto the existing GitHub issue
(title + body are updated in place; labels are left alone so pipeline state
labels survive):

```bash
node scripts/traklet-sync-github.mjs --push-updates
```

The issue number (`backend-id`) stays the same, so widget history and links
keep working. (`--force` re-creates **all** test cases as new issues — almost
never what you want.)

---

## 4. Environment configuration (already in place)

| Where | Setting | Value |
|---|---|---|
| Railway `web` service, **development** env | `NEXT_PUBLIC_TRAKLET_ENABLED` | `true` |
| Railway `web` service, **development** env | `NEXT_PUBLIC_TRAKLET_GITHUB_TOKEN` | fine-grained PAT, Issues read/write on `YOLOVibeCode/fieldview-live` |
| Railway `web` service, **production** env | both vars | **absent** — widget never ships to prod |
| `.traklet/config.md` | adapter/project | `github` / `YOLOVibeCode/fieldview-live` |
| `.github/workflows/traklet-env-label.yml` | env labeling | adds `env:dev` / `env:uat` from the issue's reported URL |

These are `NEXT_PUBLIC_*` vars, so they are baked in at **build time** — after
changing them on Railway, redeploy the `web` service for DEV.

---

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Widget icon not visible on dev.fieldview.live | Env vars missing at build time, or a stale build | `railway variables --service web --environment development --kv \| grep TRAKLET`, then redeploy `web` |
| Widget opens but shows no test cases | Token invalid/expired, or `suite:*` labels missing on GitHub | Regenerate the fine-grained PAT (Issues: read/write), update the Railway var, redeploy; confirm issues carry `test-case` + `suite:*` labels |
| Test case missing from the widget | File never synced (no `backend-id` in frontmatter) | Run `node scripts/traklet-sync-github.mjs` and commit |
| New bug issue missing the `env:dev` label | Issue body has no `**URL:**` line, or URL host isn't `dev.*` | File the bug from the DEV site so the recorded URL starts with `https://dev.fieldview.live` |
| Sync script fails with 403/rate limit | GitHub secondary rate limit on issue creation | Wait a minute and re-run — already-created cases are skipped automatically |
| A test-case URL points at production | Regression of the dev-URL rule | Fix the file (`https://dev.fieldview.live`), and see §3 "Editing an existing test case" |
