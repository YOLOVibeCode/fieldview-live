# User Acceptance Story: Veo Discovery Complete Journey

## Story Overview

**As a** youth sports coach with a Veo camera  
**I want to** monetize my live streams through FieldView.Live  
**So that** I can recoup my camera investment and provide premium access to parents

---

## Personas

### Coach Williams (Owner)
- Soccer coach at local club
- Owns Veo Cam 3 ($999)
- Has Veo Live subscription ($65/month)
- Tech-savvy but busy
- Email: coach.williams@example.com

### Parent Martinez (Viewer)
- Child plays on Coach Williams' team
- Willing to pay $4.99 to watch live games
- Uses iPhone with Apple Pay
- Email: parent.martinez@example.com

### Bad Actor Bob (Abuse Scenario)
- Tries to exploit the free tier
- Creates multiple accounts
- Same device fingerprint
- Email variations: bob1@example.com, bob2@example.com, bob3@example.com

---

## Chapter 1: Discovery via Veo Camera List

### Scene 1.1: Coach Sees FieldView.Live in Camera List

**Given** Coach Williams opens the Veo app during practice  
**When** he navigates to the camera list for live streaming  
**Then** he sees "fieldview.live ← make money off your veo" as an option

### Scene 1.2: Coach Clicks Through to Website

**Given** Coach Williams selects the FieldView.Live option  
**When** the browser opens to `https://fieldview.live?ref=veo`  
**Then** the Welcome Modal appears with:
- "Welcome to FieldView.Live!"
- "Hey! You probably saw us on the field with you. 👋"
- Value proposition (IP-locked links, built-in paywall, direct payments)
- Use cases (Coaches, Schools, Clubs, Parents)
- 3-step tutorial
- Break-even calculator (15 games to cover $999 camera)
- Veo Live requirement notice
- "Try it free! Create up to 5 free games"
- "Get Started — It's Free" button
- "Don't show this again" checkbox

**Acceptance Criteria:**
- [ ] Modal appears automatically on `?ref=veo`
- [ ] Modal can be dismissed with "Maybe Later"
- [ ] "Don't show again" persists to localStorage
- [ ] "Get Started" navigates to `/owners/register`

---

## Chapter 2: Owner Registration

### Scene 2.1: Coach Registers Account

**Given** Coach Williams clicks "Get Started"  
**When** he arrives at `/owners/register`  
**Then** he sees the registration form with:
- Name field
- Email field
- Password field (with requirements)
- "Create Account" button

**Given** Coach Williams fills out the form:
- Name: "Coach Williams"
- Email: "coach.williams@example.com"
- Password: "SecurePass123!"

**When** he clicks "Create Account"  
**Then**:
- Account is created with `freeGamesUsed: 0`
- Browser fingerprint is recorded
- Registration IP is logged
- He is redirected to `/owners/dashboard`
- Welcome email is sent (check Mailpit)

**Acceptance Criteria:**
- [ ] Account created in database
- [ ] `OwnerAccount.freeGamesUsed = 0`
- [ ] `DeviceFingerprint` record created
- [ ] `OwnerAccountFingerprint` junction record created
- [ ] Welcome email received in Mailpit

### Scene 2.2: Email Verification (via Mailpit)

**Given** Coach Williams checks his email  
**When** he opens Mailpit at `http://localhost:4305`  
**Then** he sees a welcome email from FieldView.Live

**Email Contents:**
- Subject: "Welcome to FieldView.Live!"
- Body: Getting started guide
- Link to dashboard

---

## Chapter 3: Setting Up Square Payments

### Scene 3.1: Connect Square Account

**Given** Coach Williams is on the dashboard  
**When** he clicks "Connect Square"  
**Then** he is redirected to Square OAuth

**Given** he completes Square OAuth (sandbox mode)  
**When** Square redirects back  
**Then**:
- Square access token is stored (encrypted)
- Square location ID is saved
- "Square Connected" badge appears
- He can now enable paywalls

**Acceptance Criteria:**
- [ ] OAuth flow completes
- [ ] Token stored encrypted
- [ ] Location ID saved
- [ ] Dashboard shows connected status

---

## Chapter 4: Creating Free Games (1-5)

### Scene 4.1: Create First Free Game

**Given** Coach Williams clicks "Create New Stream"  
**When** he fills out the form:
- Title: "JV Soccer vs Riverside"
- Date: Tomorrow at 3 PM
- Paywall: Disabled (free)
- Password: Auto-generate

**Then**:
- DirectStream record created
- `OwnerAccount.freeGamesUsed` incremented to 1
- Stream slug generated (e.g., `/direct/jv-soccer-riverside`)
- Admin password generated
- Success message: "Stream created! You have 4 free games remaining."

**Acceptance Criteria:**
- [ ] Stream created with correct settings
- [ ] Free game counter incremented
- [ ] Remaining count displayed
- [ ] Shareable link provided

### Scene 4.2: Create Games 2-4

**Repeat Scene 4.1** for:
- Game 2: "Varsity Soccer Home Opener" → freeGamesUsed: 2
- Game 3: "Soccer Tournament Quarterfinal" → freeGamesUsed: 3
- Game 4: "Soccer Tournament Semifinal" → freeGamesUsed: 4

### Scene 4.3: Create Game 5 (Last Free Game)

**Given** Coach Williams creates his 5th game  
**When** the game is saved  
**Then**:
- `freeGamesUsed` becomes 5
- Warning message: "This is your last free game!"
- Modal appears explaining options:
  1. Enable paywall on future games
  2. Subscribe for unlimited free streams
  3. Pay $2.99 per additional free stream

**Acceptance Criteria:**
- [ ] Warning displayed on 5th game
- [ ] Options modal shown
- [ ] User can acknowledge and continue

### Scene 4.4: Attempt 6th Free Game (Blocked)

**Given** Coach Williams has used all 5 free games  
**When** he tries to create a 6th free game (paywall disabled)  
**Then**:
- Form submission blocked
- Error: "Free game limit reached"
- Options presented:
  1. Enable paywall (proceeds with game creation)
  2. Subscribe to Pro ($29.99/month)
  3. Pay for single free game ($2.99)

**Acceptance Criteria:**
- [ ] Cannot create free game beyond limit
- [ ] Clear options provided
- [ ] Can proceed by enabling paywall

---

## Chapter 5: Viewer Watches Free Stream

### Scene 5.1: Parent Receives Share Link

**Given** Coach Williams shares the link via team chat  
**When** Parent Martinez clicks `https://fieldview.live/direct/jv-soccer-riverside`  
**Then** she sees:
- Video player (auto-playing muted)
- Scoreboard overlay
- Chat panel
- No paywall (free stream)

**Acceptance Criteria:**
- [ ] Stream plays without authentication
- [ ] No payment required
- [ ] Chat visible (registration may be required)

### Scene 5.2: Parent Registers for Chat

**Given** Parent Martinez wants to chat  
**When** she clicks the chat input  
**Then** Viewer Auth Modal appears asking for:
- Email
- Display name

**When** she submits  
**Then**:
- She can send chat messages
- Her name appears in chat
- Email stored for notifications

---

## Chapter 6: Creating Paid Stream with Paywall

### Scene 6.1: Coach Creates Paid Game

**Given** Coach Williams creates a new game  
**When** he enables the paywall:
- Title: "Championship Final"
- Paywall: Enabled
- Price: $4.99
- Message: "Support our team! Watch the championship live."

**Then**:
- Stream created with `paywallEnabled: true`
- `priceInCents: 499`
- Shareable link generated
- NOT counted against free game limit

**Acceptance Criteria:**
- [ ] Paid stream doesn't use free quota
- [ ] Price stored correctly
- [ ] Paywall message saved

### Scene 6.2: Coach Sets Stream URL

**Given** the game is created  
**When** Coach Williams goes to Veo Live and starts streaming  
**Then** he copies the HLS URL from Veo

**When** he opens Admin Panel (password required)  
**And** pastes the HLS URL  
**Then**:
- Stream URL saved
- Video begins playing on the page
- Status shows "Live"

---

## Chapter 7: Viewer Pays Through Paywall

### Scene 7.1: Parent Encounters Paywall

**Given** Parent Martinez clicks the championship game link  
**When** the page loads  
**Then** she sees:
- "Premium Stream" overlay with lock icon
- Price: "$4.99"
- Message: "Support our team! Watch the championship live."
- "Unlock Stream" button
- PaywallModal auto-opens

**Acceptance Criteria:**
- [ ] Paywall blocks video playback
- [ ] Price clearly displayed
- [ ] Unlock button visible

### Scene 7.2: Parent Completes Payment

**Given** Parent Martinez clicks "Unlock Stream"  
**When** PaywallModal is open  
**Then** she sees:
- Email field (pre-filled if returning)
- First Name field
- Last Name field
- "Continue to Payment" button

**When** she enters info and continues  
**Then** Square payment form appears with:
- Card number field
- Expiry field
- CVV field
- Apple Pay / Google Pay buttons (if available)
- "Pay $4.99" button

**Test Card for Square Sandbox:**
```
Card Number: 4532 0123 4567 8901
Expiry: 12/26
CVV: 111
```

**When** payment succeeds  
**Then**:
- Purchase record created with `status: 'paid'`
- IP address locked to this purchase
- localStorage updated: `paywall_championship-final: { hasPaid: true }`
- PaywallModal closes
- Video begins playing
- Confirmation email sent (check Mailpit)

**Acceptance Criteria:**
- [ ] Payment processed via Square
- [ ] Purchase record created
- [ ] IP lock recorded
- [ ] Video plays after payment
- [ ] Email confirmation sent

### Scene 7.3: Parent Returns Later (Same IP)

**Given** Parent Martinez closes browser and returns  
**When** she visits the same link  
**Then**:
- Paywall NOT shown (localStorage has payment)
- Video plays immediately
- If localStorage cleared but same IP: still allowed (IP lock)

### Scene 7.4: Different Device/IP Blocked

**Given** Parent Martinez tries from a different network  
**When** the IP doesn't match the locked IP  
**Then**:
- "Access Denied" message
- "This stream is locked to another device"
- Option to contact support

---

## Chapter 8: Abuse Detection & One-Time Pass

### Scene 8.1: Bad Actor Creates First Account

**Given** Bad Actor Bob visits `/owners/register`  
**When** he creates account:
- Email: "bob1@example.com"
- Name: "Bob Smith"

**Then**:
- Account created
- Browser fingerprint recorded
- `freeGamesUsed: 0`

### Scene 8.2: Bad Actor Creates Second Account (Same Device)

**Given** Bob tries to register again  
**When** he uses email "bob2@example.com"  
**And** same browser (same fingerprint)  
**Then**:
- Abuse detection triggers
- **AbuseDetectedModal** appears with message:

```
"Hey, we noticed something..."

"It looks like you might already have an account with us. 
We want to be fair to everyone, so we limit free accounts 
to one per person.

If you're in a tough spot and can't afford to pay right now, 
we get it. We don't want to keep anyone's parents from 
watching their kids play.

We'll let this one slide, but please consider supporting 
the platform when you can. It helps us keep the lights on 
for everyone."

[Continue Anyway] [Go Back]
```

**Acceptance Criteria:**
- [ ] Abuse detection triggers on 2nd registration
- [ ] Compassionate message displayed
- [ ] One-time pass option available
- [ ] Can proceed if choosing "Continue Anyway"

### Scene 8.3: Bad Actor Uses One-Time Pass

**Given** Bob clicks "Continue Anyway"  
**When** registration completes  
**Then**:
- Account created with warning flag
- `DeviceFingerprint.oneTimePassUsed: true`
- `DeviceFingerprint.abuseScore` incremented
- Bob cannot use one-time pass again from this device

### Scene 8.4: Bad Actor Tries Third Time (Blocked)

**Given** Bob tries again with "bob3@example.com"  
**When** registration is attempted  
**Then**:
- Hard block (one-time pass already used)
- Message: "We can't create another account from this device"
- No option to proceed
- Must contact support

---

## Chapter 9: Owner Upgrades After Free Limit

### Scene 9.1: Coach Hits Limit and Decides to Subscribe

**Given** Coach Williams has used 5 free games  
**When** he navigates to "Subscription" in dashboard  
**Then** he sees options:
- **Free Tier** (current): 5 free games, then paywall required
- **Pro Tier** ($29.99/month): Unlimited free streams, priority support

**When** he clicks "Upgrade to Pro"  
**Then**:
- Square payment for subscription
- `subscriptionTier: 'pro'`
- `subscriptionEndsAt: <1 month from now>`
- Unlimited free games unlocked

### Scene 9.2: Coach Creates Free Game After Upgrade

**Given** Coach Williams has Pro subscription  
**When** he creates a free game (no paywall)  
**Then**:
- Game created without warning
- `freeGamesUsed` still tracked but not limited
- Success message (no remaining count warning)

---

## Chapter 10: Email Notifications (Mailpit Verification)

### Expected Emails to Verify in Mailpit

| Recipient | Subject | Trigger |
|-----------|---------|---------|
| coach.williams@example.com | Welcome to FieldView.Live! | Registration |
| coach.williams@example.com | Stream Created: JV Soccer | Stream creation |
| parent.martinez@example.com | Your stream is starting soon! | 5-min reminder |
| parent.martinez@example.com | Payment Confirmed - $4.99 | Successful payment |
| bob1@example.com | Welcome to FieldView.Live! | Registration |
| bob2@example.com | Welcome to FieldView.Live! | Registration (with warning) |

**Mailpit Access:**
- URL: http://localhost:4305
- API: http://localhost:4305/api/v1/messages

---

## Test Data Summary

### Accounts to Create

| Email | Role | Free Games | Notes |
|-------|------|------------|-------|
| coach.williams@example.com | Owner | 5 | Full journey |
| parent.martinez@example.com | Viewer | - | Paid viewer |
| bob1@example.com | Owner | 5 | Abuse test 1 |
| bob2@example.com | Owner | 5 | Abuse test 2 (one-time pass) |
| bob3@example.com | Owner | 0 | Abuse test 3 (blocked) |

### Streams to Create

| Slug | Owner | Paywall | Price |
|------|-------|---------|-------|
| jv-soccer-riverside | coach.williams | No | - |
| varsity-home-opener | coach.williams | No | - |
| tournament-quarter | coach.williams | No | - |
| tournament-semi | coach.williams | No | - |
| tournament-final-free | coach.williams | No | - |
| championship-final | coach.williams | Yes | $4.99 |

### Square Sandbox Test Cards

| Card Number | Result |
|-------------|--------|
| 4532 0123 4567 8901 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 9995 | Insufficient funds |

---

## Playwright Test Files Structure

```
tests/e2e/
├── veo-discovery/
│   ├── 01-welcome-modal.spec.ts
│   ├── 02-owner-registration.spec.ts
│   ├── 03-square-connect.spec.ts
│   ├── 04-free-games-limit.spec.ts
│   ├── 05-viewer-free-stream.spec.ts
│   ├── 06-paywall-purchase.spec.ts
│   ├── 07-abuse-detection.spec.ts
│   ├── 08-one-time-pass.spec.ts
│   ├── 09-email-notifications.spec.ts
│   └── 10-subscription-upgrade.spec.ts
└── fixtures/
    └── veo-discovery.ts
```

---

## Definition of Done

- [ ] All 10 E2E test files created and passing
- [ ] Mailpit integration verified
- [ ] Square sandbox payments working
- [ ] Abuse detection triggers correctly
- [ ] One-time pass grants access once
- [ ] Free game limit enforced at 5
- [ ] Paywall blocks and unblocks correctly
- [ ] IP locking works as expected
- [ ] All emails sent and received
- [ ] Welcome modal shows on ?ref=veo
