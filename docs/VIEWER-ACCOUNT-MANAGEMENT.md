# Viewer Account Management — Current State & UX Flow

**Date:** February 28, 2026  
**Status:** Documented — Identifies gaps for future enhancement

---

## TL;DR — What Viewers Can Do

| Action | Authenticated Viewer | Anonymous Guest | Where |
|--------|---------------------|----------------|-------|
| **View identity** | ✅ Name/email in ViewerIdentityBar | ✅ "Guest" in identity bar | Top-right (all screens) |
| **Sign out** | ✅ "Sign out" button | ✅ "Sign out" button | ViewerIdentityBar |
| **Change display name** | ❌ Cannot edit | ✅ "Change name" button | Guest name bar (chat area) |
| **Change email** | ❌ Cannot edit | N/A | Not implemented |
| **Manage NotifyMe** | ✅ Unsubscribe button | ❌ No unsubscribe | NotifyMe success state |
| **Account settings page** | ❌ Does not exist | ❌ Does not exist | Not implemented |

---

## Current Implementation

### 1. ViewerIdentityBar Component

**File:** `apps/web/components/v2/ViewerIdentityBar.tsx`

**What it shows:**
- Authenticated viewer: Name (or email if no name)
- Anonymous guest: "Guest"
- Sign out button (always)

**Where it appears:**

```typescript
// DirectStreamPageBase.tsx

// Portrait mode (mobile) — top-right corner
{globalAuth.isAuthenticated && (
  <div className="absolute top-2 right-2 z-10">
    <ViewerIdentityBar />
  </div>
)}

// Landscape mode (desktop) — header area
{globalAuth.isAuthenticated && <ViewerIdentityBar />}
```

**Visual:**
```
┌─────────────────────────────┐
│ [Jane Doe] [Sign out]       │  ← Authenticated viewer
└─────────────────────────────┘

┌─────────────────────────────┐
│ [Guest] [Sign out]          │  ← Anonymous guest
└─────────────────────────────┘
```

**Limitations:**
- No dropdown menu
- No link to profile/settings page
- No edit name/email action

---

### 2. Sign Out Flow

**Trigger:** Click "Sign out" button in `ViewerIdentityBar`

**What happens:**

1. **Calls** `clearViewerAuth()` from `useGlobalViewerAuth` hook
2. **Clears** `localStorage.removeItem('fieldview_viewer_identity')`
3. **Dispatches** `fieldview_viewer_logout` custom event
4. **Resets** React state (sets identity to `null`)

**Effect on UI:**
- `ViewerIdentityBar` disappears
- Chat switches to "Register to Chat" (if chat was unlocked)
- NotifyMe switches to email entry (if was one-tap mode)
- Per-stream viewer token cleared (via `useViewerIdentity` listener)

**Cross-tab sync:**
- Signing out in one tab triggers logout in all tabs (via `storage` event)

**Code:**

```typescript
// useGlobalViewerAuth.ts (line 141-151)
const clearViewerAuth = useCallback(() => {
  setIdentity(null);
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('fieldview_viewer_logout'));
    } catch (error) {
      console.error('[useGlobalViewerAuth] Failed to clear localStorage:', error);
    }
  }
}, []);
```

---

### 3. Guest Name Editing

**Trigger:** Click "Change name" in guest name bar

**Where it appears:**

Only for anonymous guests in the chat area:
- Mobile bottom sheet (line 1726–1750 in `DirectStreamPageBase.tsx`)
- Desktop chat panel (line 1886–1910)

**Condition:** `viewer.isUnlocked && isAnonymousViewer`

**Visual:**

```
┌────────────────────────────────────────┐
│ Chatting as Guest     [Change name]    │  ← Default
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ [input: name] [Save] [Cancel]          │  ← Editing
└────────────────────────────────────────┘
```

**Flow:**

1. Click "Change name" → form appears
2. Enter new name → click "Save"
3. **Stores** `localStorage.setItem('fieldview_guest_name_${slug}', newName)`
4. **Calls API:** `POST /api/public/direct/:slug/viewer/anonymous-token` with new `displayName`
5. Updates local state: `setGuestDisplayName(newName)`

**Limitation:**
- Only for anonymous guests
- Per-stream (not global)
- Authenticated viewers cannot edit their name

---

### 4. NotifyMe Subscription Management

**File:** `apps/web/components/v2/NotifyMeForm.tsx`

**Subscribe flow:**

**Unauthenticated:**
1. Enter email → click "Notify Me"
2. API: `POST /api/public/direct/:slug/notify-me` with `{ email }`
3. Shows success: "You'll be notified when the stream starts!"
4. **No unsubscribe button** (no `viewerIdentityId`)

**Authenticated (one-tap):**
1. Shows: "Notify [email] when the stream starts?"
2. Click "Subscribe"
3. API: `POST /api/public/direct/:slug/notify-me` with `{ viewerIdentityId }`
4. Shows success with **Unsubscribe button**

**Unsubscribe flow (authenticated only):**

1. Click "Unsubscribe"
2. API: `DELETE /api/public/direct/:slug/notify-me` with `{ viewerIdentityId }`
3. Returns to idle (email entry form)

**Code:**

```typescript
// Unsubscribe button (line 143-150)
{viewerIdentityId && (
  <button
    type="button"
    onClick={handleUnsubscribe}
    className="text-xs text-white/70 hover:text-white underline self-start"
    data-testid="btn-unsubscribe"
    aria-label="Unsubscribe from stream start notification"
  >
    Unsubscribe
  </button>
)}
```

**Limitation:**
- Unauthenticated email subscriptions cannot unsubscribe via UI
- Would need magic link or email unsubscribe endpoint

---

### 5. What's Missing

#### A. Profile Editing for Authenticated Viewers

**Gap:** No UI to edit name or email after registration

**Current behavior:**
- Registration: `ViewerAuthModal` collects email + name → submits to API
- After registration: Name/email are locked (displayed in `ViewerIdentityBar` but not editable)

**Database support:**
- API endpoint: `POST /api/public/direct/:slug/viewer/unlock` (upserts viewer on each unlock)
- Schema: `ViewerIdentity` table has `email`, `firstName`, `lastName` (all editable in theory)

**What would be needed:**
1. Add "Edit profile" button to `ViewerIdentityBar` (dropdown or modal)
2. Create `ViewerProfileEditModal` component
3. Add API endpoint: `PATCH /api/public/viewer/:viewerId` (update name/email with validation)
4. Handle email change: Require re-verification (magic link)

#### B. Centralized Account Settings Page

**Gap:** No `/account` or `/settings` route

**What would be needed:**
1. Create route: `app/account/page.tsx`
2. Show:
   - Current email/name
   - Edit profile button
   - NotifyMe subscriptions (list all streams subscribed to)
   - Manage subscription per stream (unsubscribe)
   - Sign out button
3. Require authentication (redirect if not logged in)

#### C. Unsubscribe for Unauthenticated Email Subscriptions

**Gap:** No unsubscribe UI for users who subscribed with email only (no registration)

**What would be needed:**
1. Email-based unsubscribe link: `GET /unsubscribe/:token`
2. Token generation on subscribe: Include unsubscribe token in email
3. Unsubscribe page: `app/unsubscribe/[token]/page.tsx`

---

## Current UX Journey

### Scenario 1: Unauthenticated Viewer → Register → Sign Out

```
1. Visit /direct/tchs
   ├─> No identity bar visible
   └─> Chat shows "Register to Chat"

2. Click "Register to Chat"
   ├─> Inline form appears (name + email)
   └─> Submit

3. After registration
   ├─> ViewerIdentityBar appears (top-right)
   │   └─> Shows: "[Jane Doe] [Sign out]"
   ├─> Chat unlocks (can send messages)
   └─> NotifyMe shows one-tap "Subscribe" (if stream scheduled)

4. Click "Sign out" in ViewerIdentityBar
   ├─> Identity bar disappears
   ├─> Chat locks (back to "Register to Chat")
   └─> NotifyMe reverts to email entry
```

### Scenario 2: Anonymous Guest → Change Name

```
1. Visit stream with allowAnonymousChat enabled
   ├─> Auto-connects as "Guest"
   └─> ViewerIdentityBar shows: "[Guest] [Sign out]"

2. In chat area
   ├─> Guest name bar appears: "Chatting as Guest [Change name]"
   └─> Click "Change name"

3. Edit form appears
   ├─> Enter new name (e.g., "John")
   ├─> Click "Save"
   └─> Updates to "Chatting as John"

4. Name persists
   ├─> Stored in localStorage (per stream)
   └─> Reload page → still shows "John"
```

### Scenario 3: Authenticated Viewer → Subscribe to Notify Me → Unsubscribe

```
1. Authenticated viewer visits offline stream (scheduled)
   ├─> ViewerIdentityBar visible
   └─> Offline overlay shows "Notify Me" button

2. Click "Notify Me"
   ├─> Form shows: "Notify jane@example.com when the stream starts?"
   └─> Click "Subscribe" (one-tap, no email entry)

3. Success state
   ├─> Shows: "✓ You'll be notified when the stream starts!"
   └─> Unsubscribe button visible

4. Click "Unsubscribe"
   ├─> API: DELETE /notify-me
   └─> Reverts to "Notify Me" button
```

---

## API Endpoints Related to Account Management

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/public/direct/:slug/viewer/unlock` | POST | Register/unlock viewer | No (email + name) |
| `/api/public/direct/:slug/viewer/auto-register` | POST | Auto-register if globally auth | Yes (viewerIdentityId) |
| `/api/public/direct/:slug/viewer/anonymous-token` | POST | Get anonymous guest token | No (sessionId) |
| `/api/public/direct/:slug/notify-me` | POST | Subscribe to stream start notification | No (email or viewerIdentityId) |
| `/api/public/direct/:slug/notify-me` | DELETE | Unsubscribe from notification | Yes (viewerIdentityId) |
| `/api/public/direct/:slug/notify-me/status` | GET | Check subscription status | Yes (query param) |

**Missing endpoints:**
- `PATCH /api/public/viewer/:viewerId` — Update viewer profile (name/email)
- `GET /api/public/viewer/:viewerId/subscriptions` — List all NotifyMe subscriptions
- `GET /unsubscribe/:token` — Email-based unsubscribe (no auth)

---

## Where Account Actions Appear

### ViewerIdentityBar (Top-right on all stream pages)

**Visible when:** `globalAuth.isAuthenticated === true`

**Shows:**
- Viewer name or "Guest"
- Sign out button

**Does NOT show:**
- Account settings link
- Profile edit link
- Dropdown menu

### Guest Name Bar (Chat area, anonymous only)

**Visible when:** `viewer.isUnlocked && isAnonymousViewer`

**Shows:**
- "Chatting as [name]"
- Change name button

**Location:**
- Mobile: Bottom sheet chat header
- Desktop: Chat panel header

### NotifyMe Form (Offline overlay, scheduled streams only)

**Visible when:** `status === 'offline' && bootstrap.scheduledStartAt`

**Shows:**
- Subscribe button
- Unsubscribe button (authenticated only, after subscribe)

**Location:**
- Offline overlay (center of video area)

---

## Gaps & Recommendations

### Priority 1: Profile Editing (Authenticated Viewers)

**Current gap:** Viewers cannot edit their name or email after registration.

**User story:**
> "As an authenticated viewer, I want to update my display name and email so that I can correct typos or use a different email address."

**Proposed solution:**

1. **Add dropdown to ViewerIdentityBar:**

```tsx
┌──────────────────────────────────┐
│ [Jane Doe ▾]     [Sign out]      │
└──────────────────────────────────┘
         ↓ (click)
┌──────────────────────────────────┐
│ Edit Profile                     │
│ Manage Subscriptions             │
│ ─────────────────────────────    │
│ Sign Out                         │
└──────────────────────────────────┘
```

2. **Create ViewerProfileModal:**
   - Fields: Name (text), Email (text)
   - Validation: Email format, name ≥2 chars
   - Save button → API: `PATCH /api/public/viewer/:viewerId`
   - If email changes: Send verification link + show "Check your email"

3. **Create API endpoint:**

```typescript
PATCH /api/public/viewer/:viewerId
Body: { firstName?, lastName?, email? }
Authorization: Bearer <viewerToken>

Response:
- 200: { updated: true }
- 400: { error: "Invalid email" }
- 401: { error: "Invalid viewer token" }
- 409: { error: "Email already in use" }
```

### Priority 2: Centralized Account Page

**Current gap:** No `/account` route to manage identity across all streams.

**User story:**
> "As a viewer, I want to see all streams I'm subscribed to and manage my notifications in one place."

**Proposed route:** `/account`

**What it should show:**

```
┌────────────────────────────────────────────────────────────────┐
│                     My Account                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Profile                                                        │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Name:  [Jane Doe]                           [Edit]         │ │
│ │ Email: [jane@example.com]                   [Edit]         │ │
│ │ Joined: Feb 28, 2026                                       │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ Stream Notifications                                           │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ TCHS Soccer vs Lincoln  [Unsubscribe]                      │ │
│ │ Basketball Game 2/29    [Unsubscribe]                      │ │
│ │                                                            │ │
│ │ (No active subscriptions)                                  │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ [Sign Out]                                                     │
└────────────────────────────────────────────────────────────────┘
```

**API needed:**

```typescript
GET /api/public/viewer/:viewerId/notify-subscriptions
Response: [{ slug, streamTitle, subscribedAt }]

DELETE /api/public/viewer/:viewerId/notify-subscriptions/:slug
Response: { unsubscribed: true }
```

### Priority 3: Email Unsubscribe (Unauthenticated)

**Current gap:** Users who subscribed with email only (no registration) cannot unsubscribe.

**User story:**
> "As someone who entered my email for NotifyMe but didn't register, I want to unsubscribe without needing to sign up."

**Proposed solution:**

1. **Generate unsubscribe token on subscribe:**

```typescript
POST /api/public/direct/:slug/notify-me
Body: { email }
Response: { viewerId, unsubscribeToken }
```

2. **Add unsubscribe route:**

```typescript
app/unsubscribe/[token]/page.tsx
```

3. **Unsubscribe page shows:**

```
┌─────────────────────────────────────────┐
│   Unsubscribe from Stream Notifications │
│                                         │
│   Email: jane@example.com               │
│   Stream: TCHS Soccer vs Lincoln        │
│                                         │
│   [Confirm Unsubscribe]                 │
└─────────────────────────────────────────┘
```

4. **API endpoint:**

```typescript
DELETE /api/public/unsubscribe/:token
Response: { unsubscribed: true, email, slug }
```

---

## Technical Details

### Global Auth Storage

**Key:** `fieldview_viewer_identity`

**Schema:**

```typescript
{
  viewerIdentityId: string;     // Global viewer ID (cross-stream)
  email: string;
  firstName?: string;
  lastName?: string;
  registeredAt: string;         // ISO date
  
  // Per-stream fields (preserved by setViewerAuth)
  viewerToken?: string;         // Stream-specific JWT
  gameId?: string;              // Stream-specific game ID
  viewerId?: string;            // Same as viewerIdentityId
}
```

**Hook:** `useGlobalViewerAuth()` (`apps/web/hooks/useGlobalViewerAuth.ts`)

**Methods:**
- `setViewerAuth(identity)` — Set global auth, preserve per-stream fields
- `clearViewerAuth()` — Clear auth, dispatch logout event, sync across tabs
- Cross-tab sync via `storage` event

### Per-Stream Auth Storage

**Hook:** `useViewerIdentity({ gameId, slug })` (`apps/web/hooks/useViewerIdentity.ts`)

**Same key:** `fieldview_viewer_identity` (same as global)

**Methods:**
- `unlock({ email, firstName, lastName })` — Calls `/viewer/unlock` API, saves token
- `setExternalIdentity({ viewerToken, viewerId, displayName, gameId })` — For admin auto-login or anonymous token
- Listens for `fieldview_viewer_logout` event → resets local state

**Relationship:**
- Global auth = cross-stream identity (viewerIdentityId, email, name)
- Per-stream auth = stream-specific token (viewerToken, gameId)
- Both stored in same localStorage key (merged object)

---

## Guest Name Storage

**Per-stream:** `fieldview_guest_name_${slug}`

**Session ID:** `fieldview_anon_session` (UUID, persists across reloads)

**Flow:**

```typescript
// On mount (DirectStreamPageBase.tsx, line 515-559)
1. Check if allowAnonymousChat enabled
2. Get or create sessionId
3. Check for saved guest name: localStorage.getItem(`fieldview_guest_name_${slug}`)
4. POST /viewer/anonymous-token with { sessionId, displayName }
5. Receive { viewerToken, viewer: { id, displayName }, gameId }
6. Call viewer.setExternalIdentity() to set token + viewerId

// On name change (line 574-606)
1. User clicks "Change name" → form appears
2. User enters new name → clicks "Save"
3. Save to localStorage: `fieldview_guest_name_${slug}` = newName
4. Update local state: setGuestDisplayName(newName)
5. Close form
```

**API:** Anonymous token endpoint regenerates token with new name but keeps same `sessionId` (so messages stay attributed to same guest).

---

## Cross-Stream Auth

**Auto-registration flow** (DirectStreamPageBase, line 433-509):

When a viewer is globally authenticated and visits a new stream:

1. Check: `globalAuth.isAuthenticated && !viewer.isUnlocked && !bootstrap.paywallEnabled`
2. Call: `POST /api/public/direct/:slug/viewer/auto-register` with `{ viewerIdentityId }`
3. API creates or finds `DirectStreamViewer` for this stream
4. Returns: `{ registration: { viewerIdentity } }`
5. Call `viewer.unlock()` to get stream-specific token
6. Viewer is now unlocked (can chat, create bookmarks, etc.)

**Result:** One registration, access to all streams (no re-registration needed).

---

## Current Account Management UX Summary

**What works:**
- ✅ ViewerIdentityBar shows name/email on all stream pages
- ✅ Sign out button (clears auth, works across tabs)
- ✅ Guest name editing (anonymous only, per stream)
- ✅ NotifyMe unsubscribe (authenticated only)
- ✅ Cross-stream auth (register once, access all)

**What's missing:**
- ❌ Profile editing for authenticated viewers (name/email)
- ❌ Centralized account settings page
- ❌ List of all NotifyMe subscriptions
- ❌ Email-based unsubscribe for unauthenticated subscriptions
- ❌ Dropdown menu on ViewerIdentityBar
- ❌ Change password/email verification flow

**Workaround for now:**
- To change name/email: Sign out → re-register with new info
- To unsubscribe (unauth): No UI (would need admin intervention or email link)

---

## Recommended Next Steps

### Phase 1: Minimal Profile Editing (Quick Win)

1. Add "Edit Name" button to `ViewerIdentityBar` (inline, no dropdown)
2. Inline form: Just name (first/last), no email
3. Save → `PATCH /viewer/:viewerId`
4. ~2-3 hours work

### Phase 2: Full Account Page (Medium)

1. Create `/account` route
2. Profile section (name, email, joined date)
3. NotifyMe subscriptions list
4. ~1-2 days work

### Phase 3: Email Unsubscribe (Low Priority)

1. Generate unsubscribe tokens
2. Create `/unsubscribe/:token` page
3. Send token in NotifyMe confirmation emails
4. ~4-6 hours work

---

## Files to Review

**Current implementation:**
- `apps/web/components/v2/ViewerIdentityBar.tsx` — Identity display + sign out
- `apps/web/hooks/useGlobalViewerAuth.ts` — Global auth state
- `apps/web/hooks/useViewerIdentity.ts` — Per-stream auth state
- `apps/web/components/v2/NotifyMeForm.tsx` — Subscribe/unsubscribe UI
- `apps/web/components/DirectStreamPageBase.tsx` — Guest name editing (lines 1726–1750, 1886–1910)

**API routes:**
- `apps/api/src/routes/direct.ts` — `/viewer/unlock`, `/viewer/auto-register`, `/viewer/anonymous-token`
- `apps/api/src/routes/public.direct-notify-me.ts` — NotifyMe subscribe/unsubscribe/status

**Tests:**
- `apps/web/components/v2/__tests__/ViewerIdentityBar.test.tsx` — Identity bar + sign out
- `apps/web/hooks/__tests__/useGlobalViewerAuth.test.ts` — Global auth + clear
- `apps/web/components/__tests__/DirectStreamPageBase.integration.test.tsx` — Guest name editing
