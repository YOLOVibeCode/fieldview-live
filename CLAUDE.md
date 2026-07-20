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

**Payment model = marketplace via the relay's Square Connect Hub** (`api.square.noctusoft.com/connect/fieldview/*`). _Updated 2026-07-19 — replaces the earlier "single-account" wording._
- Each coach OAuth-connects their **own** Square merchant through the relay (`GET /connect/fieldview/oauth/authorize?recipient_key=...`). The relay stores the coach's Square tokens — **FieldView stores only a `recipientKey`, never Square tokens.**
- Viewer payment = `POST /connect/fieldview/recipients/:key/charge` with `app_fee_money`: **~90% → the coach's own Square balance, ~10% → the platform** (rate = `app_fee_bps`, configurable per product & per transaction; default 10% = 1000 bps).
- **FieldView never holds coach funds** — Square splits at charge time (no money-transmitter/escrow exposure).
- Refunds: `POST /connect/fieldview/recipients/:key/refunds` (app fee reversed proportionally). Card-on-file + subscription lifecycle supported. Square webhooks arrive via the relay's `POST /connect/webhooks/:env` fanout to FieldView's callback URL.
- This **supersedes and replaces** the in-repo Square "Model A" (in-repo per-coach OAuth token storage + direct `applicationFeeMoney`). Migrate FieldView to call the Connect Hub; delete the in-repo Square token/OAuth machinery. See `docs/RELAY-CONNECT-HUB-MIGRATION.md`.

**Status (2026-07-19):** relay Connect Hub "Slice 1" is backend-complete (101 tests, production canary-proven: $1 charge + 10¢ fee + refund). Gated on: attorney ToS/Recipient-Agreement review, the FieldView-side integration/UI, and the first real coach.

**🔒 Security:** relay docs keys are now redacted (2026-07-19). If the previously-exposed values were not rotated, rotate them.

---

## Inherited rules
- Global rules in `~/.claude/CLAUDE.md` apply (e.g. Railway SSH via the Railway CLI).
- Match `.cursorrules` for roles, deploy workflow, TDD/ISP, monorepo structure, and UI automation (`data-testid`) requirements.
