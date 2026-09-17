# FieldView.Live — Tester Manual (Kellen)

**Environment:** DEV only — [https://dev.fieldview.live](https://dev.fieldview.live)  
**How to report:** Pass / Fail on each checkbox. If something fails, record a [Jam](https://jam.dev) and paste the `jam.dev/c/...` link with what you tapped and what you expected.

Work top to bottom. Part 1 is the new overlay work. Parts 2–7 are a tour of the rest of the app.

---

## How we work

1. Use **DEV**, not production (`fieldview.live`) and not UAT unless someone asks.
2. For each step: do it → check the expected result → mark **Pass** or **Fail**.
3. If it fails: Jam it, then keep going unless the page is completely broken.
4. On DEV, open the **Traklet** widget (icon in the top-right). After you finish a section here, mark the matching test case Pass/Fail in Traklet when one exists.
5. Only judge a test against **that step’s expected result**. If something else looks off, note it separately — don’t fail the current step for it.

---

## Accounts and links (DEV)

| Role | URL | Login |
|------|-----|--------|
| Public site | https://dev.fieldview.live | none |
| API health | https://api-dev.fieldview.live/health | none |
| Free stream | https://dev.fieldview.live/direct/dev-free-stream | none |
| Paid stream (paywall) | https://dev.fieldview.live/direct/dev-paid-stream | none (use sandbox card below) |
| Demo watch link | https://dev.fieldview.live/watch/STORMFC/2010 | none |
| Owner portal | https://dev.fieldview.live/owners/login | `dev-owner@fieldview.live` / `devowner123` |
| Admin console | https://dev.fieldview.live/admin/login | `admin@fieldview.live` / `devadmin123` |

**Sandbox card (DEV paywall only):** `4111 1111 1111 1111` — any future expiry, any CVC, any ZIP.

**Stream settings (Edit Stream Settings on a `/direct/...` page)** — not the same as owner or admin-console login:

| Stream | URL | Settings password |
|--------|-----|-------------------|
| Free demo | https://dev.fieldview.live/direct/dev-free-stream | `admin123` |
| Paid demo | https://dev.fieldview.live/direct/dev-paid-stream | `admin123` |
| Denton Diablos event (TC-DD-001) | https://dev.fieldview.live/direct/dentondiablos/soccer-2008-20260325 | `devil2026` |

Wrong password should say **Invalid password**. If you see “Stream not found” / “Stream event not found”, the event is not seeded — report that, don’t keep guessing passwords.

If admin login asks for an MFA code and you don’t have one, **skip that section** and write “blocked on MFA” in your notes.

Use a **private/incognito** window for paywall tests so an old purchase doesn’t leak through.

---

## Part 1 — Crowdsourced sport overlay (do this first)

This is the new work. Two people on the same game: one reports a play, the other confirms it, the score updates for both.

### 1A. Two-viewer demo (about 5 minutes)

Open: **https://dev.fieldview.live/demo/multi-channel**

You should see:

- A **stream box** at the top (already filled with a Mux test clip)
- One **Sport overlay** dropdown and **Start / Pause / Reset** (in the header only — not on each channel)
- **Channel A** and **Channel B** side by side, both on the same film

| # | Do this | Expected | Pass? |
|---|---------|----------|-------|
| 1 | Load the page. Wait a few seconds. | Both channels show video (or a player). Overlay shows **1st Half** and **00:00**. Sport control is only in the header, not inside Channel A or B. | ☐ |
| 2 | In **Sport overlay**, choose **American Football**. | Both overlays jump to **Q1** and **12:00**. | ☐ |
| 3 | Tap **Start**. Wait ~2 seconds. | Both clocks count **down** together (e.g. 11:58), not stuck on 12:00. | ☐ |
| 4 | On **Channel A**, tap **Home** on the score overlay. | A report sheet opens. You should see **Touchdown**. | ☐ |
| 5 | Tap **Touchdown**, then **Skip** if it asks for yards. | Channel **B** (and A) show a pending chip like **Touchdown HOME?**. Scores still **0–0**. Channel A does **not** get a Confirm button for its own report. | ☐ |
| 6 | On **Channel B**, tap **Confirm**. | Both scores become **6–0**. Pending chip goes away. | ☐ |
| 7 | In **Sport overlay**, choose **Baseball / Softball**. | Period looks like **Top …**. The clock is **gone** (not showing 00:00 — it should not be on the overlay at all). | ☐ |
| 8 | Choose **Soccer**, tap **Reset**, then **Start**. | Clock counts **up** from 00:00. | ☐ |

**Optional:** In the stream box, paste a FieldView slug (e.g. `tchs`) or another `.m3u8` URL and tap **Load**. Both channels should switch to that film. If the slug has no public stream, note what you see (error vs blank player) — don’t fail the whole section for a missing live game.

### 1B. Single-viewer overlay (about 2 minutes)

Open: **https://dev.fieldview.live/demo/sport-overlay**

Here the sport dropdown and clock buttons sit **on the same page** as the overlay (only one viewer).

| # | Do this | Expected | Pass? |
|---|---------|----------|-------|
| 1 | Load the page. | Overlay: **1st Half**, **00:00**. | ☐ |
| 2 | Tap **Start**. Wait ~2 seconds. | Clock counts **up**. | ☐ |
| 3 | Choose **American Football**. | Overlay: **Q1**, **12:00**. | ☐ |
| 4 | Tap **Start**. | Clock counts **down**. | ☐ |
| 5 | Tap **Home** on the overlay. | Report sheet opens with **Touchdown**. | ☐ |

---

## Part 2 — Smoke (no login)

| # | Do this | Expected | Traklet | Pass? |
|---|---------|----------|---------|-------|
| 1 | Open https://dev.fieldview.live | Home loads. You see **FieldView.Live**, **Owner Login**, **Get Started**, **View Demo Stream**. (You may get a “coming soon” modal — dismiss it.) | TC-SM-001 | ☐ |
| 2 | Open https://api-dev.fieldview.live/health | Page shows JSON. Look for `"status":"healthy"` (or `"healthy"` near the start). If it errors or says unhealthy, Fail + Jam. | TC-SM-002 | ☐ |

---

## Part 3 — Watch as a parent (no login)

| # | Do this | Expected | Traklet | Pass? |
|---|---------|----------|---------|-------|
| 1 | Incognito. Open https://dev.fieldview.live/watch/STORMFC/2010 | Page loads as a **viewer**. You are **not** bounced to owner login. | TC-VA-001 | ☐ |
| 2 | From home, tap **View Demo Stream**. | Same watch experience (or the demo stream). Player shell or a clear offline message — not a blank/crash page. | TC-WF-001 | ☐ |
| 3 | Open https://dev.fieldview.live/direct/dev-free-stream | Stream page loads. Video plays **or** you get an intentional offline/empty state — not a white error screen. | TC-SP-001 | ☐ |

On the free direct stream, try:

- Play / pause if controls appear
- Fullscreen if the control exists
- Phone or narrow window: layout still usable (no overlapping unusable buttons)

---

## Part 4 — Paywall (incognito)

Open: **https://dev.fieldview.live/direct/dev-paid-stream** in a **new private window**.

| # | Do this | Expected | Traklet | Pass? |
|---|---------|----------|---------|-------|
| 1 | Load the paid stream with no purchase. | Paywall / purchase UI blocks the film. You cannot watch by dismissing it. | TC-PW-001 | ☐ |
| 2 | If checkout lets you pay: use sandbox card `4111 1111 1111 1111`, any expiry, any CVC. | After success you can watch (or you get a clear next step). You are **not** charged real money. | TC-CW-003 | ☐ |

If checkout is disabled or Square sandbox isn’t wired on DEV, mark the step **Blocked** and note what you saw — that’s useful, not a fail of “you did it wrong.”

---

## Part 5 — Owner (coach) portal

1. Open https://dev.fieldview.live/owners/login  
2. Email: `dev-owner@fieldview.live`  
3. Password: `devowner123`  
4. Submit.

| # | Do this | Expected | Traklet | Pass? |
|---|---------|----------|---------|-------|
| 1 | Log in as owner. | You land on the owner dashboard (not an error, not the login page again). | TC-OA-001 | ☐ |
| 2 | Look around the dashboard. | Revenue / games / links area loads. Nothing is a blank crash. | TC-OW-001 | ☐ |
| 3 | Open **Direct streams** (or equivalent nav). | List of streams loads. | TC-OW-009 | ☐ |
| 4 | Open **Games** if present. | List loads; you can see existing games. | TC-OW-006 | ☐ |

Don’t create junk streams on shared DEV unless you use a unique slug like `kellen-test-0827`. If you do create one, write down the slug so we can clean it up.

---

## Part 6 — Admin console

1. Open https://dev.fieldview.live/admin/login  
2. Email: `admin@fieldview.live`  
3. Password: `devadmin123`  
4. MFA: only if prompted **and** you have a code.

| # | Do this | Expected | Traklet | Pass? |
|---|---------|----------|---------|-------|
| 1 | Log in as admin. | You reach the admin console. | TC-AA-001 / TC-AA-002 | ☐ |
| 2 | Click through main nav (purchases, coupons, etc.). | Pages load; no dead ends. | TC-AA-002 | ☐ |

---

## Part 7 — Overlay on a real Direct Stream (if you have time)

This is the same overlay idea as Part 1, on a live `/direct/...` page.

1. Open https://dev.fieldview.live/direct/dev-free-stream (or `tchs` if that slug is live on DEV).
2. If you see a score overlay on the film, try tapping a team name.
3. If a report sheet opens, that’s the crowdsource overlay on a real stream — note sport, whether the clock matches the sport, and whether a second phone/browser can confirm.

If there is **no** overlay, skip and write “no overlay on this stream.”

---

## When you’re done

Reply with:

1. Which parts you finished (1A, 1B, 2, …).
2. Pass / Fail / Blocked for each numbered row you ran.
3. Jam links for every Fail.
4. Anything confusing in this manual (we’ll fix the instructions).

That’s the whole job: **it worked**, or **it didn’t — here’s a Jam**.
