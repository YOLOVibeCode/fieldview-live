# Owner Registration & Onboarding UX Checklist (MVP)
ROLE: architect STRICT=true

## Scope
Define the **Owner/Organization registration + onboarding UX** end-to-end, including screens, states, edge cases, and API contract requirements. Viewer purchase flow is already defined elsewhere.

## Current State (facts from repo)
- **Owner auth API exists**: `POST /api/owners/register`, `POST /api/owners/login` (implemented in `apps/api/src/routes/owners.ts`).
- **Owner JWT**: returned on register/login (7-day expiry in `apps/api/src/services/OwnerAuthService.ts`).
- **Web UI**: Admin login exists; Owner login/register pages do **not** appear in `apps/web/app/` yet.
- **OpenAPI gap**: `openapi/paths/owners.yaml` contains `/owners/me` and game endpoints, but does **not** define `/owners/register` or `/owners/login`.
- **Public pay-to-watch exists (game-scoped)**: `POST /public/games/{gameId}/checkout` → payment processing → entitlement token → `GET /public/watch/{token}` bootstrap (OpenAPI: `openapi/paths/public.yaml`).

## UX Goals (Owner)
- **Time-to-first-value**: Owner can go from “new” → “ready to sell a game” in **< 10 minutes**.
- **Minimal friction**: no complex account setup before first game creation unless required for payouts.
- **Clear progress**: the UI always shows what is “done” vs “next”.
- **Safe defaults**: do not block game creation on payout onboarding; block payouts instead.
- **Automation-friendly**: all interactive elements have stable `data-testid` attributes.

## Personas / Roles
- **OwnerUser** (individual)
- **AssociationAdmin** (association account)
- **AssociationOperator** (optional post-MVP; not required for initial registration UX)

## State Model (UX-facing)
Owner onboarding should track:
- **Account state**: `pending_setup` → `active` → `suspended`
- **Payout state**: `not_started` → `in_progress` → `connected` → `blocked`
- **First-game state**: `not_created` → `draft_created` → `active_ready` → `live_ready`

*(Note: DB has `OwnerAccount.status` but UX transitions aren’t defined; this checklist defines the UX layer regardless of DB details.)*

## Required Screens (Owner UX)

### Screen 1: Owner Register (`/owner/register`)
- **Fields**:
  - Email (required)
  - Password (required, min 8)
  - Organization/Owner name (required)
  - Account type (radio): `Individual` / `Association`
- **Actions**:
  - Submit → calls `POST /api/owners/register`
  - On success: store token and route to onboarding dashboard
- **Errors**:
  - Email already registered
  - Weak password
  - Network error
- **Test IDs**:
  - `form-owner-register`
  - `input-email`, `input-password`, `input-name`, `radio-type-individual`, `radio-type-association`
  - `btn-submit-register`
  - `error-email`, `error-password`, `error-name`, `error-form`

### Screen 2: Owner Login (`/owner/login`)
- **Fields**: email, password
- **Actions**:
  - Submit → `POST /api/owners/login`
  - On success: store token and route to dashboard
- **Errors**:
  - Invalid credentials
  - Network error
- **Test IDs**:
  - `form-owner-login`
  - `input-email`, `input-password`
  - `btn-submit-login`
  - `error-form`

### Screen 3: Owner Onboarding Dashboard (`/owner/onboarding`)
A guided “checklist” view with progress:
- **Card A: Create first game**
  - CTA: “Create game”
  - Shows if game is draft/active
- **Card B: Configure streaming**
  - CTA: “Configure stream source”
  - Explains Mux-managed vs BYO HLS/RTMP
- **Card C: Payout setup (Square Connect)**
  - CTA: “Set up payouts”
  - Status: Not started / In progress / Connected / Needs attention
- **Card D: Get signage**
  - CTA: “Download signage”
  - Shows keyword + QR
- **Test IDs**:
  - `card-onboarding`, `card-create-game`, `card-streaming`, `card-payouts`, `card-signage`
  - `btn-create-game`, `btn-configure-stream`, `btn-setup-payouts`, `btn-download-signage`

### Screen 4: Payout Setup Flow (Square Connect)
*(UX-level; implementation can come later.)*
- **Entry**: from onboarding dashboard
- **Steps**:
  - Explain why payouts are needed
  - “Connect with Square” CTA
  - Return/callback success page: “Payouts connected”
  - Failure recovery: “Try again” + support instructions
- **Rules**:
  - Do not block game creation if payouts are not connected
  - Block initiating payouts until connected
- **Test IDs**:
  - `btn-square-connect`, `btn-square-retry`, `text-square-status`

### Screen 5: Owner Dashboard (`/owner/dashboard`)
After onboarding:
- Game list, quick actions, stream health
- Empty state should route back to onboarding if no game

## Required Screens (Viewer UX for Org/Team Links)

### Screen V1: Org/Team Link Landing (`/watch/{ORG}/{TEAM}/{EVENTCODE?}`)
**Goal**: a stable link that can either (a) allow immediate viewing if already entitled, or (b) prompt payment.

#### Behavior
- If viewer is **already entitled** for the current event:
  - Redirect to `/watch/{entitlementToken}` (existing watch page)
- Else:
  - Show “Pay to watch” UI
  - Collect **viewerEmail required** (phone optional if you want SMS delivery)
  - Create checkout/payment intent
  - On successful payment, redirect to `/watch/{entitlementToken}`

#### Why reuse `/watch/{token}`?
Avoids duplicating playback+telemetry+refund logic; the org/team link is a *discovery + purchase gateway*, not a second watch implementation.

#### Test IDs
- `card-watch-link`
- `text-org`, `text-team`, `text-event`
- `form-watch-link-checkout`
- `input-email`, `input-phone`
- `btn-submit-checkout`
- `error-email`, `error-form`

### Screen V2: Paywall Success (redirect)
After payment succeeds:
- Redirect to `/watch/{token}` (existing page)
- Confirm state in UI: “Access granted”

### Screen V3: Already Purchased
If viewer hits org/team link again:
- Detect existing entitlement (cookie/local storage) and redirect to `/watch/{token}`
- Provide fallback “enter email to resend link” if no local entitlement is present

## Required API Contracts (to be “fully defined UX”)
### Must exist in OpenAPI
- `POST /owners/register`
- `POST /owners/login`
- **Org/team watch link resolution** (new):
  - `GET /public/watch-links/{org}/{team}` (returns current event + pricing + stream availability)
  - `POST /public/watch-links/{org}/{team}/checkout` (creates checkout for current event, same semantics as game checkout)
- `POST /owners/logout` (optional)
- `POST /owners/password-reset/request` (MVP optional but recommended)
- `POST /owners/password-reset/confirm`
- Square Connect endpoints (exact routes TBD)

### Must exist in Web API client
- Typed client methods matching the above

## Edge Cases (must be designed, not left ambiguous)
- **Duplicate email** on register
- **Password reset**: user forgot password before any login success
- **Association vs individual**: different role assignment, but same UX entry
- **Token expiry**: auto-logout flow after 7 days or on 401
- **Payout not connected**: allow selling a game; show warnings for payout readiness
- **Rate limiting**: too many attempts on login/register
- **Mobile-first**: all forms and onboarding work on phone
- **Org/team link without current event**: show “No active event” + subscribe/help CTA
- **Org/team link where event code is optional**: if code missing, proceed to pay flow; if code present and required by org/team, enforce it
- **Already paid on another device**: allow “resend link by email” (idempotent checkout semantics)

## Acceptance Criteria (UX)
- Owner can register → land on onboarding → create a game and get a keyword/QR in < 10 minutes.
- Owner can login and reach dashboard reliably; session persistence works.
- Payout onboarding is visible, clear, and recoverable (even if not implemented fully yet).
- All interactive elements and key containers have `data-testid`.
- OpenAPI includes owner auth endpoints so contracts are unambiguous.
- Org/team watch link supports **click → pay → watch** without requiring an account.

## Deliverables (what “done” means)
- A complete owner onboarding UX spec (this checklist) + wireframe-level page structure.
- OpenAPI updated to include owner auth routes.
- Web pages exist for owner login/register/onboarding dashboard with test IDs.
- Web page exists for org/team watch link landing with paywall UX (or equivalent within existing game pages).
- E2E tests for owner registration/login + “create first game” happy path (Playwright).

ROLE: architect STRICT=true


