# FieldView.Live — Claude Code Project Rules

> Full engineering conventions (roles, TDD, ISP, Railway deploy, UI test-id rules) live in [`.cursorrules`](.cursorrules) — follow those too. This file records project-level **decisions** Claude must respect.

---

## 💳 Payment & Comms Architecture — DECIDED DIRECTION

> **Status: DECIDED, but BUILD IS PAUSED.** Do not implement the payment workflow yet, and do not extend the legacy in-repo Square integration. Owner is updating the relay first (see below).

**Backbone = Noctusoft Relay** (`docs.api.noctusoft.com`). ALL Square, Twilio, SendGrid, and Google API traffic routes through the relay via a drop-in base-URL swap. The relay injects vendor credentials server-side, so **this repo must hold NO Square / Twilio / SendGrid / Google secrets.**

| Vendor | Relay base URL |
|---|---|
| Square (prod) | `connect.squareup.noctusoft.com` (sandbox: `connect.squareupsandbox.noctusoft.com`) — switch with header `X-Square-Env: sandbox\|production` |
| Twilio / SMS | `api.twilio.noctusoft.com` (native: `noctusoft.com/twilio/api`) |
| SendGrid / email | `api.sendgrid.noctusoft.com` |
| Auth to relay | Railway **deploy key** via env `NOCTUSOFT_API_KEY` (works from any IP) |

**Payment model = single-account via the relay, with relay-side variable platform-fee retention.**
- Viewer payments settle into the platform Square account **through the relay**.
- The **relay retains a configurable platform fee — default 10%, settable to 5% or a variable % —** and attributes the remainder to the coach/owner.
- FieldView records per-coach earnings; coach payout follows the relay/settlement model.
- This **supersedes** the current in-repo Square Marketplace "Model A" (per-coach OAuth + `applicationFeeMoney`). **Do not build on Model A; migrate toward the relay.**

**⏸️ Blocking:** Owner is updating the relay to add the variable platform-fee-retention pattern. **Wait for that to land before implementing the payment workflow.**

**🔒 Security TODO (before go-live):** the relay docs page currently serves live keys over a plain fetch — rotate the relay keys and properly gate the page. (Owner asked for help locking this down.)

---

## Inherited rules
- Global rules in `~/.claude/CLAUDE.md` apply (e.g. Railway SSH via the Railway CLI).
- Match `.cursorrules` for roles, deploy workflow, TDD/ISP, monorepo structure, and UI automation (`data-testid`) requirements.
