# Square Tokens & Marketplace Model A — End-to-End Architecture Spec
ROLE: architect STRICT=false

## Context
FieldView.Live uses **Square Connect OAuth** to let an **OwnerAccount** receive funds directly (Marketplace Model A), while FieldView collects a **10% application fee**. The backend must **not** store card numbers/CVV (Square handles PCI); FieldView stores only **reference IDs** and encrypted OAuth credentials.

## Current observed issues (must fix)
- **OAuth scopes are read-only**: connect flow requests `MERCHANT_PROFILE_READ PAYMENTS_READ SETTLEMENTS_READ`, but marketplace payments require **creating** payments on the owner’s account.
- **Callback redirect is hard-coded to localhost** (`http://localhost:3000/...`), breaking production onboarding UX.
- **Owner location ID not stored**: payment flow currently falls back to platform location, which is not correct for true marketplace “on behalf of seller”.
- **No token refresh**: `squareTokenExpiresAt` is stored but expired tokens are not refreshed.
- **Card-on-file consistency risk**: any saved payment method workflow must be stored/retrieved in the **same Square seller context** used to charge (owner vs platform), otherwise “saved card” IDs won’t be chargeable by the owner client.

## Goals
- **G1**: Owner OAuth tokens can be verified reliably (local sandbox + production).
- **G2**: Marketplace payments succeed end-to-end using **owner-scoped** Square client with **application fee**.
- **G3**: Token lifecycle is safe: encrypted at rest, refreshable, and observable.
- **G4**: Redirects and configuration are environment-safe (no localhost leaks).
- **G5**: Saved payment methods (if enabled) remain PCI-safe and work in the correct seller context.

## Non-goals
- Building a multi-processor abstraction.
- Storing any sensitive card data (PAN/CVV) in FieldView.
- Implementing disputes/chargebacks beyond basic ledger recording.

---

## System design (target)

### A) Square Connect OAuth (owner onboarding)
**Flow**
1. Owner (authenticated) requests a connect URL.
2. FieldView creates `state` and stores:
   - `ownerAccountId`
   - `returnUrl` (validated allowlist)
   - optional `environment`/metadata  
   in Redis with TTL.
3. Owner completes Square OAuth consent.
4. Callback:
   - validates `state`
   - exchanges `code` for tokens
   - encrypts and stores tokens
   - fetches and stores **owner location ID** (see section C)
   - redirects to stored `returnUrl` (fallback: `APP_URL`)

**Required OAuth scopes (minimum)**
- `MERCHANT_PROFILE_READ` (merchant verification / display)
- `PAYMENTS_READ`
- `PAYMENTS_WRITE` (**required** to create owner-scoped payments)
- `SETTLEMENTS_READ` (optional, for payout visibility)

**If Card-on-File is supported (optional feature)**
- `CUSTOMERS_READ`, `CUSTOMERS_WRITE`
- `CARDS_READ` (and `CARDS_WRITE` only if creating cards server-side; ideally avoid)

**Security**
- `state` must be one-time use and deleted after callback.
- `returnUrl` must be validated against an allowlist (e.g., `APP_URL` origin only).

### B) Owner token storage & refresh
**Storage**
- `squareAccessTokenEncrypted` (required)
- `squareRefreshTokenEncrypted` (required if refreshable)
- `squareTokenExpiresAt` (required)
- `payoutProviderRef` (Square merchant id; required)

**Refresh algorithm (server-side)**
- On any owner-scoped Square call:
  - If `squareTokenExpiresAt <= now + refreshSkew` (e.g., 24h), refresh.
  - Refresh using Square OAuth token endpoint with `grant_type=refresh_token`.
  - Encrypt and persist new tokens and expiration.
  - If refresh fails: mark a `payoutState=blocked` (or similar) and surface a reconnect CTA.

**Observability**
- Emit structured logs for:
  - connect start/end
  - refresh attempts + outcomes
  - owner token invalid (401/403)

### C) Owner Square location ID (marketplace correctness)
**Requirement**
Marketplace payments must be created with the **seller’s location**.

**Design**
- Add `OwnerAccount.squareLocationId` (string, nullable).
- On successful OAuth callback, call `LocationsApi.listLocations` using the owner token:
  - choose default heuristics:
    - if only one, select it
    - if multiple, choose the first “ACTIVE” location (or require selection later)
- Store `squareLocationId` on `OwnerAccount`.

### D) Marketplace payment execution (Model A)
**Inputs**
- `purchaseId`, `sourceId` (tokenized card / wallet / saved card id)
- `recipientOwnerAccountId` (required)

**Steps**
1. Load owner account
2. Build owner Square client (with refresh if needed)
3. Create payment on owner account:
   - `amountMoney = gross`
   - `applicationFeeMoney = platformFee` (10%)
   - `locationId = owner.squareLocationId`
4. Update purchase with:
   - `paymentProviderPaymentId`
   - `actualProcessorFeeCents` (if available)
   - `ownerNetCents`
5. Create ledger entries (gross, platform fee, processor fee)
6. Create entitlement token and send receipt

### E) Saved payment methods (optional, but must be architecturally correct)
**Constraint**
Saved card IDs must be usable as `sourceId` in the *same seller context* as the payment creation.

**Recommended design**
- Replace single `viewerIdentity.squareCustomerId` with **per-owner mapping**:
  - `ViewerSquareCustomer { ownerAccountId, viewerId, squareCustomerId }`
- All saved payment method operations (create/list/delete) must use the **owner Square client**.
- Public API for saved methods must be scoped by:
  - viewer identity (email)
  - **ownerAccountId** derived from the target channel/game (never global)

---

## End-to-end verification plan

### 1) Token acquisition (OAuth)
**Pass criteria**
- Owner completes connect
- DB has:
  - `payoutProviderRef` set
  - encrypted access + refresh token set
  - `squareTokenExpiresAt` in the future
  - `squareLocationId` set

### 2) Token validity (lightweight call)
**Pass criteria**
- Using decrypted token, Square “list locations” or “retrieve merchant” succeeds (200 OK)

### 3) Marketplace payment (happy path)
**Pass criteria**
- `payments.create` succeeds using owner client
- application fee is applied
- purchase becomes `paid`, entitlement created, receipt email sent
- ledger entries recorded correctly

### 4) Expiry/refresh behavior
**Pass criteria**
- When `squareTokenExpiresAt` is near/expired:
  - refresh occurs and succeeds, or
  - system cleanly blocks payouts + instructs reconnect (no silent failures)

### 5) Production validation
**Pass criteria**
- All of the above with production keys + production webhook signature key
- Webhook delivery verified in Square dashboard delivery logs

---

## Definition of Done (completion criteria)
- [ ] OAuth scopes updated to include `PAYMENTS_WRITE` (and any optional scopes needed)
- [ ] Redirect handling is environment-safe (no hardcoded localhost); `returnUrl` is stored + validated
- [ ] Owner location ID is stored and used for marketplace payments
- [ ] Token refresh is implemented and observable
- [ ] “Token test” exists as an owner-authenticated capability (endpoint or scripted procedure) and is documented
- [ ] Card-on-file design is either:
  - [ ] explicitly disabled, or
  - [ ] implemented with per-owner customer mapping and owner-scoped Square client
- [ ] Local sandbox E2E checklist verified
- [ ] Production E2E checklist verified


