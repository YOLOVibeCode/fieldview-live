# FieldView.Live — Product Overview & MVP Scope

## Product summary
FieldView.Live is a monetization platform for youth sports live streaming.

It enables a frictionless viewer experience:
- **Primary (Text-to-pay)**: Text a short code → pay in mobile browser → receive a watch link → watch instantly (no app, no account)
- **Secondary (QR-to-pay)**: Scan QR → pay → watch

It supports two customer tracks:
- **Owner-only**: individual camera owners (Veo/Pixellot/RTMP-capable)
- **Association-only**: associations/leagues operating multiple fields with admin oversight (and optionally hardware + training as a service track)

## Goals
- **Frictionless conversion**: A parent/grandparent can purchase access on a phone in < 30 seconds once they've learned the flow.
- **No app required**: Payment and playback are browser-first.
- **Protected streams**: Streams are purchase-only protected; no public access without valid entitlement. Owners can monitor who watches their streams.
- **Trust via guarantee**: Automatic, rules-based refunds for quality failures.
- **Owner ROI clarity**: Customers can see gross/net, platform fee, processor fee, refunds, and payouts.
- **Viewer monitoring**: Owners can see who purchased and watched their games. SuperAdmin can drill down across all owners for support and compliance.
- **Operational supportability**: Internal staff can diagnose issues end-to-end (SMS ↔ payment ↔ entitlement ↔ playback ↔ refund) quickly and safely.

## Non-goals (MVP)
- **Subscriptions / season passes** (including "text WATCH to subscribe") (**Post-MVP**)
- **DVR (pause/rewind)** (**Post-MVP**)
- **Highlights / clips / multi-angle mixing / overlays** (**Post-MVP**)
- **Carrier billing / charge to phone bill** (**Post-MVP**)
- **Full white-labeling** beyond basic signage templates (**Post-MVP**)

## Product principles
- **Text-first**: SMS is the primary conversion channel.
- **Mobile-native**: Payment + playback must be excellent on mobile.
- **Protected streams**: Entitlement required for access; no public HLS URL leakage. Streams are purchase-only protected to prevent unauthorized viewing (e.g., rivals accessing competitor streams).
- **Secure entitlements**: Purchased access grants a time-bound entitlement; do not rely on a permanently public stream URL. Entitlement tokens are signed, expiring, and validated on every watch page load and session start.
- **Viewer identity for monitoring**: Email address is required at checkout to enable owner and admin monitoring of who purchased and watched streams.
- **Deterministic refunds**: Refund rules are measurable, auditable, reproducible, and versioned.

## MVP cutline
### Core (MVP)
- **Owner onboarding**: create owner account + configure payout destination (Square Connect)
- **Game management**: create/edit/cancel games (schedule, title, price) + generate keyword + QR
- **Text-to-pay**:
  - inbound SMS keyword handling
  - outbound SMS payment link and watch link
  - HELP/STOP compliance
- **Payments**: Apple Pay / Google Pay / card; marketplace split (platform fee vs owner earnings); **email required at checkout** for viewer identity
- **Entitlements**: signed, expiring entitlement tokens; enforce access control for watch page and session start; tokens must not be reusable beyond validity window
- **Playback**: mobile web watch page, clear states (not started / live / ended / unavailable)
- **Quality telemetry**: capture buffering/down/fatal errors needed for refunds
- **Automatic refunds**: deterministic thresholds + SMS notification
- **Dashboards**: owner/association revenue + refunds + per-game stats + **audience monitoring** (who purchased/watched)
- **Internal admin console**: support workflows with audit logging + MFA + **viewer monitoring** (drill-down by owner/customer)

### Association-only (MVP additions)
- Multi-user access and roles for association staff
- Multi-field grouping and consolidated reporting

### Post-MVP (explicitly deferred)
- Subscriptions/season passes, reminders, DVR, ads/sponsors, multi-camera, advanced analytics

## Glossary (canonical terms)
- **Viewer**: end user purchasing a single game's access (no account). Identified by email address (required) and optionally phone number.
- **OwnerAccount**: paying customer operating one or more cameras/fields.
- **Association**: an OwnerAccount type operating multiple teams/fields with admin oversight.
- **Game**: a scheduled event that can be purchased and watched.
- **Keyword / text code**: short code texted by a viewer to request a payment link (e.g., `EAGLES22`).
- **Payment link**: mobile web URL to complete checkout for a specific game.
- **Purchase**: a payment attempt and its outcome; a successful purchase creates an entitlement.
- **Entitlement**: time-bound permission to watch, derived from a purchase.
- **Entitlement token**: signed token encoding entitlement claims; used by the watch experience.
- **Playback session**: a viewer's watch attempt(s) tied to an entitlement.
- **Quality telemetry**: playback events and summaries (buffering/down/errors) used to compute refund eligibility.
- **Ledger entry**: immutable accounting record for charges, fees, refunds, and payouts.

## Success metrics (initial)
- **Conversion**: % of link requests that become paid purchases
- **Time-to-watch**: keyword SMS received → first frame
- **Refund rate**: overall and by reason
- **Repeat purchase rate**
- **Owner retention**: % of owners active after 3 months

## Spec linkage map
- **Flows**: see [02-user-flows.md](./02-user-flows.md)
- **Requirements**: see [03-functional-requirements.md](./03-functional-requirements.md)
- **APIs**: see [05-api-spec-outline.md](./05-api-spec-outline.md)
- **Refund determinism**: see [07-refund-and-quality-rules.md](./07-refund-and-quality-rules.md)
