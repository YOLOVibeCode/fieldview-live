# Stream Page ASCII Wireframe Coverage Map

This document shows every key visual state of the direct stream page across all three layouts. Each element is annotated with test coverage:

| Symbol | Meaning |
|--------|--------|
| **[T]** | Tested — has unit, integration, or E2E test coverage |
| **[~]** | Partially tested — some states or paths covered |
| <span style="color:#999">**[U]**</span> | Untested — no test coverage (shown in light gray) |

---

## Table of Contents

1. [Desktop Layout](#desktop-layout)
2. [Portrait Mobile Layout](#portrait-mobile-layout)
3. [Landscape Mobile Layout](#landscape-mobile-layout)
4. [Account Page](#account-page)
5. [Coverage Summary](#coverage-summary)

---

## Desktop Layout

### D1. Offline, no schedule

```
+------------------------------------------------------------------+
| [T] Header: Title  |  [T] Subtitle  |  [T] Viewer count          |
| [T] ViewerIdentityBar (hidden when not auth)  [T] Admin Panel    |
+------------------------------------------------------------------+
| [T] WelcomeMessageBanner (if welcomeMessage set)                 |
+------------------------------------------------------------------+
|                                                                  |
|                    [T] StreamPlayer area                          |
|                                                                  |
|              +--------------------------------+                  |
|              |   [T] Gray video icon (pulse)   |                  |
|              |   Stream Offline                |                  |
|              |   No stream configured          |                  |
|              |   (no scheduled start)          |                  |
|              +--------------------------------+                  |
|                                                                  |
+------------------------------------------------------------------+
| [T] Scoreboard tab (L)  |  ...  |  [T] Bookmark tab  [T] Chat tab |
+------------------------------------------------------------------+
```

### D2. Offline, scheduled + Notify Me button

```
+------------------------------------------------------------------+
| [T] Header  [T] ViewerIdentityBar (if auth)  [T] Admin Panel     |
+------------------------------------------------------------------+
| [T] WelcomeMessageBanner                                         |
+------------------------------------------------------------------+
|                                                                  |
|              +--------------------------------+                  |
|              |   [T] Gray video icon            |                  |
|              |   Stream Offline                 |                  |
|              |   No stream configured           |                  |
|              |   Scheduled: <date/time>          |                  |
|              |   [T] [ Notify Me ]  <-- btn     |                  |
|              +--------------------------------+                  |
|                                                                  |
+------------------------------------------------------------------+
```

### D3. Offline, scheduled + Notify Me form (unauthenticated)

```
+------------------------------------------------------------------+
| [T] Header  (no identity bar)  [T] Admin Panel                    |
+------------------------------------------------------------------+
|              +--------------------------------+                  |
|              |   Stream Offline                 |                  |
|              |   Scheduled: <date>              |                  |
|              |   [T] form-notify-me             |                  |
|              |   [T] input-email (Enter email)  |                  |
|              |   [T] [ Notify Me ]              |                  |
|              +--------------------------------+                  |
+------------------------------------------------------------------+
```

### D4. Offline, scheduled + Notify Me form (authenticated, one-tap)

```
+------------------------------------------------------------------+
| [T] Header  [T] ViewerIdentityBar (name/email, Sign out)  [T] Admin|
+------------------------------------------------------------------+
|              +--------------------------------+                  |
|              |   Stream Offline                 |                  |
|              |   [T] Notify <email> when...?   |                  |
|              |   [T] [ Subscribe ]              |                  |
|              +--------------------------------+                  |
+------------------------------------------------------------------+
```

### D5. Offline, scheduled + Notify Me success

```
+------------------------------------------------------------------+
| [T] Header  [T] ViewerIdentityBar  [T] Admin Panel                |
+------------------------------------------------------------------+
|              +--------------------------------+                  |
|              |   Stream Offline                 |                  |
|              |   [T] ✓ You'll be notified...   |                  |
|              |   [T] Unsubscribe (if auth)      |                  |
|              +--------------------------------+                  |
+------------------------------------------------------------------+
```

### D6. Loading

```
+------------------------------------------------------------------+
| [T] Header  [T] ViewerIdentityBar (if auth)  [T] Admin Panel      |
+------------------------------------------------------------------+
|                                                                  |
|              +--------------------------------+                  |
|              |   [T] Spinner (blue, animate)   |                  |
|              |   Loading stream...             |                  |
|              |   Please wait                   |                  |
|              +--------------------------------+                  |
|                                                                  |
+------------------------------------------------------------------+
```

### D7. Playing, chat locked (not registered)

```
+------------------------------------------------------------------+
| [T] Header  (no identity bar)  [T] Admin Panel                    |
+------------------------------------------------------------------+
| [T] WelcomeMessageBanner (if set)                                |
+------------------------------------------------------------------+
| [T] Scoreboard  |  [T] StreamPlayer (video)  |  [T] Chat panel   |
| tab (collapsed) |  [T] Bookmark markers      |  expanded         |
|                 |  [T] Admin broadcast?     |  [T] Live Chat     |
|                 |                            |  [T] Messages     |
|                 |                            |  [T] Register to  |
|                 |                            |  Chat [T] btn     |
|                 |                            |  (inline form [T])|
+------------------------------------------------------------------+
```

### D8. Playing, chat unlocked (registered)

```
+------------------------------------------------------------------+
| [T] Header  [T] ViewerIdentityBar (name, Sign out)  [T] Admin     |
+------------------------------------------------------------------+
| [T] Scoreboard  |  [T] StreamPlayer  |  [T] Chat panel            |
| [T] expanded or |  [T] video        |  [T] Chat component       |
| collapsed       |                   |  [T] input, Send           |
+------------------------------------------------------------------+
```

### D9. Playing, chat unlocked (anonymous/guest)

```
+------------------------------------------------------------------+
| [T] Header  [T] ViewerIdentityBar ("Guest", Sign out)  [T] Admin   |
+------------------------------------------------------------------+
| [T] Scoreboard  |  [T] StreamPlayer  |  [T] Chat panel            |
|                 |                   |  [T] Guest name bar [T]    |
|                 |                   |  "Chatting as X" [T] Change|
|                 |                   |  [T] Chat, input, Send      |
+------------------------------------------------------------------+
```

### D10. Paywall blocked

```
+------------------------------------------------------------------+
| [T] Header                                                       |
+------------------------------------------------------------------+
|              +--------------------------------+                  |
|              |   [T] Lock icon (amber)          |                  |
|              |   Premium Stream                |                  |
|              |   [T] Paywall message           |                  |
|              |   $X.XX                         |                  |
|              |   [T] Unlock Stream btn         |                  |
|              +--------------------------------+                  |
+------------------------------------------------------------------+
```

### D11. Error state

```
+------------------------------------------------------------------+
| [T] Header                                                       |
+------------------------------------------------------------------+
|              +--------------------------------+                  |
|              |   [T] Red error icon             |                  |
|              |   Unable to Load Stream         |                  |
|              |   Please check the stream URL   |                  |
|              |   [T] Open Admin Panel          |                  |
|              +--------------------------------+                  |
+------------------------------------------------------------------+
```

### D12. Admin panel open

```
+------------------------------------------------------------------+
| [T] Header  [T] ViewerIdentityBar  [T] Close edit                 |
+------------------------------------------------------------------+
| [T] Stream Settings                                               |
| [T] AdminPanel (slug, URL, chat, paywall, etc.)                   |
| [T] SocialProducerPanel                                           |
| [T] ViewerAnalyticsPanel                                          |
+------------------------------------------------------------------+
| [T] Scoreboard tab  |  [T] Video  |  [T] Bookmark  [T] Chat       |
+------------------------------------------------------------------+
```

### D13. Scoreboard expanded (desktop)

```
+------------------------------------------------------------------+
| [T] Header  [T] ViewerIdentityBar  [T] Admin Panel                |
+------------------------------------------------------------------+
| [T] Scoreboard panel (expanded)  |  [T] StreamPlayer  |  [T] Chat |
| [T] Home vs Away, period, time   |                   |  tab      |
| [T] Collapse btn                 |                   |           |
+------------------------------------------------------------------+
```

### D14. Bookmark panel expanded (desktop)

```
+------------------------------------------------------------------+
| [T] Header  [T] ViewerIdentityBar  [T] Admin Panel                |
+------------------------------------------------------------------+
| [T] Scoreboard  |  [T] StreamPlayer  |  [T] Bookmark panel (exp)  |
| tab             |                   |  [T] Bookmarks header      |
|                 |                   |  [T] BookmarkPanel           |
|                 |                   |  [T] Collapse btn           |
+------------------------------------------------------------------+
```

---

## Portrait Mobile Layout

### P1. Offline, no schedule

```
+---------------------------+
| [T] ViewerIdentityBar     |  (top-right, if auth)
|       (if auth)           |
+---------------------------+
|                           |
|  [T] Video aspect area    |
|  [T] Gray icon            |
|  Stream Offline           |
|  No stream configured     |
|                           |
+---------------------------+
| [T] CompactScoreBar       |
+---------------------------+
| [T] Chat | [T] Bookmarks  |
|   tab      tab            |
+---------------------------+
```

### P2. Offline, scheduled + Notify Me button

```
+---------------------------+
| [T] ViewerIdentityBar?    |
+---------------------------+
|  [T] Gray icon            |
|  Stream Offline           |
|  Scheduled: <date>         |
|  [T] [ Notify Me ]        |
+---------------------------+
| [T] CompactScoreBar       |
+---------------------------+
| Chat | Bookmarks          |
+---------------------------+
```

### P3. Offline, scheduled + Notify Me form (unauth)

```
+---------------------------+
+---------------------------+
|  Stream Offline            |
|  Scheduled: <date>         |
|  [T] input-email          |
|  [T] [ Notify Me ]        |
+---------------------------+
| [T] CompactScoreBar       |
+---------------------------+
| Chat | Bookmarks           |
+---------------------------+
```

### P4. Offline, scheduled + Notify Me (auth one-tap)

```
+---------------------------+
|         [T] ViewerIdentityBar
+---------------------------+
|  Stream Offline            |
|  [T] Notify <email>?       |
|  [T] [ Subscribe ]         |
+---------------------------+
| [T] CompactScoreBar       |
+---------------------------+
| Chat | Bookmarks           |
+---------------------------+
```

### P5. Offline, scheduled + Notify Me success

```
+---------------------------+
| [T] ViewerIdentityBar      |
+---------------------------+
|  [T] ✓ You'll be notified |
|  [T] Unsubscribe          |
+---------------------------+
| [T] CompactScoreBar       |
+---------------------------+
| Chat | Bookmarks           |
+---------------------------+
```

### P6. Loading (portrait)

```
+---------------------------+
+---------------------------+
|  [T] Spinner              |
|  Loading stream...        |
+---------------------------+
| [T] CompactScoreBar       |
+---------------------------+
| Chat | Bookmarks           |
+---------------------------+
```

### P7. Playing, chat tab, locked

```
+---------------------------+
| [T] ViewerIdentityBar?     |
+---------------------------+
| [T] StreamPlayer (video)  |
+---------------------------+
| [T] CompactScoreBar       |
+---------------------------+
| Chat | Bookmarks           |
| --------                   |
| [T] Messages (read-only)   |
| [T] Join Chat [T] -->      |
|      [T] ViewerAuthModal   |
+---------------------------+
```

### P8. Playing, chat tab, unlocked

```
+---------------------------+
| [T] ViewerIdentityBar     |
+---------------------------+
| [T] StreamPlayer          |
+---------------------------+
| [T] CompactScoreBar       |
+---------------------------+
| Chat | Bookmarks           |
| [T] Chat component        |
| [T] input, Send            |
+---------------------------+
```

### P9. Playing, bookmarks tab, unlocked

```
+---------------------------+
| [T] ViewerIdentityBar      |
+---------------------------+
| [T] StreamPlayer           |
+---------------------------+
| [T] CompactScoreBar       |
+---------------------------+
| Chat | Bookmarks           |
|         --------           |
| [T] BookmarkPanel          |
| (inline mode)              |
+---------------------------+
```

### P10. Paywall (portrait)

```
+---------------------------+
+---------------------------+
|  [T] Lock icon            |
|  Premium Stream            |
|  $X.XX                     |
|  [T] Unlock Stream         |
+---------------------------+
+---------------------------+
```

---

## Landscape Mobile Layout

### L1. Offline, no schedule

```
+----------------------------------------------------------+
| [T] Header (compact)  [T] ViewerIdentityBar?  [T] Admin  |
+----------------------------------------------------------+
| [T] WelcomeMessageBanner?                                |
+----------------------------------------------------------+
| [T] Scoreboard bar (top, compact)                          |
+----------------------------------------------------------+
|                                                          |
|  [T] StreamPlayer area                                    |
|  [T] Gray icon, Stream Offline, No stream configured      |
|                                                          |
+----------------------------------------------------------+
|                    [T] Chat FAB (green dot)               |
+----------------------------------------------------------+
```

### L2. Offline, scheduled + Notify Me button

```
+----------------------------------------------------------+
| [T] Header  [T] ViewerIdentityBar?  [T] Admin              |
+----------------------------------------------------------+
|  [T] Gray icon                                            |
|  Stream Offline                                           |
|  No stream URL configured yet                             |
|  Scheduled: <date>                                        |
|  [T] [ Notify Me ]   [T] Open Admin Panel                 |
+----------------------------------------------------------+
```

### L3. Offline, scheduled + Notify Me form (unauth)

```
+----------------------------------------------------------+
| [T] Header  (no bar)  [T] Admin                           |
+----------------------------------------------------------+
|  Stream Offline                                           |
|  [T] form-notify-me, input-email, [ Notify Me ]           |
+----------------------------------------------------------+
```

### L4. Offline, scheduled + Notify Me (auth one-tap)

```
+----------------------------------------------------------+
| [T] Header  [T] ViewerIdentityBar  [T] Admin               |
+----------------------------------------------------------+
|  [T] Notify <email>?  [T] [ Subscribe ]                   |
+----------------------------------------------------------+
```

### L5. Offline, scheduled + Notify Me success

```
+----------------------------------------------------------+
| [T] Header  [T] ViewerIdentityBar  [T] Admin              |
+----------------------------------------------------------+
|  [T] ✓ You'll be notified  [T] Unsubscribe                 |
+----------------------------------------------------------+
```

### L6. Loading (landscape)

```
+----------------------------------------------------------+
| [T] Header  [T] ViewerIdentityBar?                        |
+----------------------------------------------------------+
|  [T] Spinner  Loading stream...  Please wait             |
+----------------------------------------------------------+
```

### L7. Playing, chat bottom sheet closed

```
+----------------------------------------------------------+
| [T] Scoreboard bar (top)                                    |
+----------------------------------------------------------+
|                                                          |
|  [T] StreamPlayer (video)                                 |
|  [T] Bookmark markers                                     |
|                                                          |
+----------------------------------------------------------+
|              [T] Chat FAB (bottom-right, badge)           |
+----------------------------------------------------------+
```

### L8. Playing, chat bottom sheet open, locked

```
+----------------------------------------------------------+
| [T] Scoreboard bar                                        |
+----------------------------------------------------------+
|  [T] StreamPlayer                                         |
+----------------------------------------------------------+
| +------------------------------------------------------+ |
| | [T] Live Chat  [T] connection status                  | |
| | [T] Messages (read-only)                              | |
| | [T] Register to Chat [T]  or inline form [T]          | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+
```

### L9. Playing, chat bottom sheet open, unlocked

```
+----------------------------------------------------------+
| [T] Header  [T] ViewerIdentityBar                         |
+----------------------------------------------------------+
| [T] Scoreboard bar                                        |
+----------------------------------------------------------+
|  [T] StreamPlayer                                         |
+----------------------------------------------------------+
| +------------------------------------------------------+ |
| | [T] Live Chat  [T] Live indicator                     | |
| | [T] Chat component  [T] input  [T] Send               | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+
```

### L10. Paywall (landscape mobile)

```
+----------------------------------------------------------+
|  [T] Lock icon  Premium Stream  $X.XX  [T] Unlock Stream   |
+----------------------------------------------------------+
```

### L11. Error (landscape)

```
+----------------------------------------------------------+
|  [T] Red icon  Unable to Load Stream                      |
|  [T] Open Admin Panel                                     |
+----------------------------------------------------------+
```

### L12. Admin panel open (landscape)

```
+----------------------------------------------------------+
| [T] Stream Settings  [T] Close                           |
| [T] AdminPanel  [T] SocialProducer  [T] ViewerAnalytics  |
+----------------------------------------------------------+
| [T] Scoreboard  [T] Video  [T] Chat FAB                   |
+----------------------------------------------------------+
```

---

## Coverage Summary

| Component / Element | Symbol | Notes |
|--------------------|--------|--------|
| NotifyMeForm (email, one-tap, success, unsubscribe) | [T] | NotifyMeForm.test.tsx, NotifyMeUserJourneys.test.tsx |
| ViewerIdentityBar (name, email, Guest, Sign out, account link) | [T] | ViewerIdentityBar.test.tsx |
| Account page (profile, subscriptions, payments, actions, guest, empty, error, refund) | [T] | app/account/__tests__/page.test.tsx |
| useGlobalViewerAuth (set/clear, storage, logout event) | [T] | useGlobalViewerAuth.test.ts |
| useViewerIdentity (logout sync) | [T] | useViewerIdentity.test.ts |
| NotifyMe API (subscribe, status, unsubscribe) | [T] | notify-me.service.test.ts, notify-me.spec.ts |
| WelcomeMessageBanner | [T] | WelcomeMessageBanner.test.tsx |
| Auto-registration flow | [T] | auto-registration.service.test.ts |
| Viewer registration form (E2E) | [T] | viewer-registration-form.spec.ts |
| ViewerAuthModal | [T] | ViewerAuthModal.test.tsx |
| StreamPlayer | [T] | StreamPlayer.test.tsx |
| Chat component | [T] | Chat.test.tsx (v2/__tests__) |
| Scoreboard component | [T] | Scoreboard.test.tsx (v2/__tests__) |
| BookmarkPanel | [T] | BookmarkPanel.test.tsx |
| AdminPanel | [T] | AdminPanel.test.tsx |
| PaywallModal / overlay | [T] | PaywallModal.test.tsx |
| PortraitStreamLayout | [T] | PortraitStreamLayout.test.tsx |
| CollapsibleScoreboardOverlay | [T] | CollapsibleScoreboardOverlay.test.tsx |
| Inline registration form (in chat) | [T] | DirectStreamPageBase.integration.test.tsx (open/cancel UX), chat-registration-flow.spec.ts (E2E) |
| Guest name editing bar | [T] | DirectStreamPageBase.integration.test.tsx (visibility, change-name flow), anonymous-chat.spec.ts (E2E) |
| Admin broadcast overlay | [T] | AdminBroadcast.test.tsx |
| Bookmark toasts | [T] | BookmarkToast.test.tsx |
| Header (title, subtitle, viewer count) | [T] | DirectStreamPageBase.integration.test.tsx |
| CompactScoreBar | [T] | CompactScoreBar.test.tsx |

**Counts**

- **Tested:** 25 areas (all of the above plus inline registration form in chat, guest name editing bar, account page).
- **Untested:** 0 areas.

**Integration tests (DirectStreamPageBase.integration.test.tsx — 34 tests)**

Full page-state integration suite organized by wireframe state:

| State / Area | Tests | Coverage |
|-------------|-------|---------|
| **Offline (D1/D2)** | Stream Offline message; scheduled date; Notify Me opens form; no Notify Me when unscheduled | ✅ 4 tests |
| **Welcome banner (D5)** | Shows when set; hidden when null | ✅ 2 tests |
| **Header** | Page title; viewer count; Admin Panel button | ✅ 3 tests |
| **ViewerIdentityBar** | Hidden when unauthenticated; shown when authenticated | ✅ 2 tests |
| **Paywall blocked (D10)** | Shows blocker + price + Unlock when not paid; hidden when paid | ✅ 2 tests |
| **Error state (D11)** | "Unable to Load Stream" + Open Admin Panel button | ✅ 1 test |
| **Chat locked (D7)** | Register to Chat visible; inline form open/cancel; read-only messages | ✅ 3 tests |
| **Chat unlocked (D8)** | Chat component rendered; identity bar shown | ✅ 2 tests |
| **Anonymous guest (D9)** | Guest name bar + "Chatting as"; change-name form open/cancel | ✅ 2 tests |
| **Admin panel (D12)** | Open/close; SocialProducerPanel visible; ViewerAnalyticsPanel visible | ✅ 4 tests |
| **Scoreboard panel (D13)** | Shown when scoreboardEnabled | ✅ 1 test |
| **Chat panel structure** | Panel or collapsed tab when chatEnabled | ✅ 1 test |
| **Bookmark panel (D14)** | Panel or collapsed tab when viewer unlocked | ✅ 1 test |
| **Chat connection** | "Connecting..." when disconnected; "Live" when connected | ✅ 2 tests |
| **Accessibility** | Semantic buttons; ARIA labels on guest bar controls | ✅ 4 tests |

**Wireframe [U] count: 0** — All elements in all wireframes are now marked [T].

---

## Account Page

Account page (`/account`) is reached via [T] link in ViewerIdentityBar (`data-testid="link-account"`, href `/account`). All sections and states are covered by `apps/web/app/account/__tests__/page.test.tsx`.

### Account wireframe (authenticated, full account)

```
+------------------------------------------------------------------+
| [T] FieldView.Live (link home)                                    |
| [T] page-title: My Account                                        |
+------------------------------------------------------------------+
| [T] section-profile                                               |
|     [T] Profile                                                    |
|     [T] input-first-name  [T] input-last-name                     |
|     [T] display-email                                             |
|     [T] btn-save-profile (when dirty)  [T] profile-saved  [T] error-profile |
+------------------------------------------------------------------+
| [T] section-subscriptions                                         |
|     [T] Stream Subscriptions                                      |
|     [T] subs-loading | [T] subs-empty | [T] subs-list + [T] sub-{slug} |
|     [T] link-stream-{slug}  [T] btn-unsub-{slug}                   |
+------------------------------------------------------------------+
| [T] section-payments                                             |
|     [T] Payment History                                           |
|     [T] payments-loading | [T] payments-empty | [T] payments-list  |
|     [T] purchase-{id}  [T] amount-{id}  [T] badge-status-paid/refunded |
|     [T] btn-expand-{id}  [T] receipt-{id} (refund lines when present) |
+------------------------------------------------------------------+
| [T] section-actions                                               |
|     [T] btn-send-access-link  [T] access-link-sent                |
|     [T] btn-sign-out                                              |
+------------------------------------------------------------------+
```

### Account wireframe (guest)

```
| [T] section-profile                                               |
|     [T] profile-guest-message: "You are signed in as a guest..."   |
|     (no name inputs; Send access link hidden)                    |
| [T] section-actions: [T] btn-sign-out only                       |
+------------------------------------------------------------------+
```

### Account page test coverage

| State / Area | Tests | Coverage |
|-------------|-------|---------|
| **Auth** | Redirect when not authenticated; loading spinner when auth loading | ✅ 2 tests |
| **Guest** | Profile shows guest message, no name fields | ✅ 1 test |
| **Profile** | Display name/email; edit and save; profile error on PATCH failure | ✅ 3 tests |
| **Subscriptions** | Empty state; loading state; list with titles; unsubscribe | ✅ 4 tests |
| **Payments** | Empty state; list with amounts/status; expand receipt; refund details in receipt | ✅ 4 tests |
| **Account actions** | Send access link; sign out and redirect | ✅ 2 tests |

**ViewerIdentityBar** account link: `ViewerIdentityBar.test.tsx` — link present when authenticated, `href="/account"`, `aria-label="View account settings"`.
