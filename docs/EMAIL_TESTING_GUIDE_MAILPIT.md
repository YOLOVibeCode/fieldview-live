# 📧 Email Testing Guide with Mailpit

## ✅ Mailpit (Local Email Capture)

**Container**: `fieldview-mailpit` (defined in `docker-compose.yml`)  
**SMTP Port**: `localhost:4305` (maps to container `1025`)  
**Web UI**: http://localhost:4304 (maps to container `8025`)  
**From address**: `noreply@fieldview.live` (`MAILPIT_FROM_EMAIL`)

---

## 🎯 Pages Available for Testing

### ⭐ **Recommended: A Direct Stream** (example slug: `tchs`)
```
Local:  http://localhost:4300/direct/tchs
Prod:   https://fieldview.live/direct/tchs
```

**Why This Page**:
- ✅ Video player (when a stream source is configured)
- ✅ Scoreboard enabled (can test score editing)
- ✅ Chat enabled (can test email registration)
- ✅ All mobile features active
- ✅ Per-owner branding

> Swap `tchs` for any active `/direct/{slug}` that exists in your local database.

---

### 🧪 **Alternative Test Pages**

#### 1. **StormFC Main Stream**
```
Local:  http://localhost:4300/direct/stormfc
Prod:   https://fieldview.live/direct/stormfc
```

#### 2. **TCHS Event Pages** (Hierarchical)
```
http://localhost:4300/direct/tchs/soccer-20260109-varsity
https://fieldview.live/direct/tchs/soccer-20260109-varsity
```

#### 3. **Any Direct Stream**
```
Pattern: /direct/{slug} or /direct/{slug}/{eventSlug}
```

**All pages have the mobile improvements!**

---

## 📧 **Complete Email Registration Flow Test**

### Step 1: Navigate to Stream Page
```
http://localhost:4300/direct/tchs
```

### Step 2: Expand Chat Panel
- **Desktop**: Press `C` key OR click chat expand button
- **Mobile**: Tap 💬 chat button in mobile control bar (bottom)

### Step 3: Fill Registration Form
**Test Email**: `qa-test-${timestamp}@fieldview.live`

Example:
```
Email: qa-test-1736547890@fieldview.live
First Name: QA
Last Name: Tester
```

### Step 4: Submit Registration
- Click "Unlock Stream" button
- Wait for confirmation

### Step 5: Check Mailpit for the Confirmation Email
1. Open Mailpit: http://localhost:4304
2. Look for new email from `noreply@fieldview.live`
3. Subject: "You're registered for {stream title}"
4. Email contains a "📺 Watch Stream" link back to the stream (not a verification link)

> Note: the "Unlock Stream" button calls `POST /api/public/direct/{slug}/viewer/unlock`, which unlocks chat immediately and sends this confirmation email. The separate registration form (`POST /api/public/direct/{slug}/register`) is a different flow that sends a "Verify your email for {stream title}" email with a verification link (`GET /api/public/direct/verify?token=...`).

### Step 6: Verify Chat Access
- Chat unlocks immediately after submitting the form — the unlock API returns a viewer JWT, so no link click is required
- You can send messages
- Display name will show as "QA T." (First Last Initial)

---

## 🧪 **Email Testing Scenarios**

### Test Case 1: Successful Registration ✅
**Steps**:
1. Navigate to the local stream
2. Register with valid email via "Unlock Stream"
3. Confirm chat unlocks immediately
4. Check Mailpit for the confirmation email

**Expected**:
- ✅ Confirmation email received within 1 second
- ✅ Chat becomes accessible immediately (no link click needed)
- ✅ Email "Watch Stream" link opens the stream
- ✅ Display name shown correctly

---

### Test Case 2: Email Already Registered
**Steps**:
1. Use same email as Test Case 1
2. Try to register again

**Expected**:
- ✅ Should handle gracefully
- ✅ OR auto-unlock if email is verified

---

### Test Case 3: Invalid Email Format
**Steps**:
1. Enter invalid email (e.g., "notanemail")
2. Try to submit

**Expected**:
- ✅ Form validation prevents submission
- ✅ Error message shown

---

## 📱 **Mobile Email Testing** (On Real Device)

### iPhone/Android Test Flow:
1. Open Safari/Chrome on your phone
2. Navigate to: `https://fieldview.live/direct/tchs`
3. Verify mobile control bar appears at bottom
4. Tap 💬 chat button
5. Fill registration form (use your real email for testing)
6. Submit
7. Check email on your phone
8. Tap verification link
9. Return to stream
10. Send test chat message
11. Verify message appears in real-time

---

## 🔍 **Mailpit Web UI** (http://localhost:4304)

### Features:
- **Inbox View**: See all captured emails
- **Real-Time Updates**: New emails appear automatically
- **Email Preview**: Click email to see HTML/text content
- **Search**: Find emails by subject, from, to
- **Tags**: Organize emails (e.g., "square" tag)
- **API Access**: http://localhost:4304/api/v1/messages

### Emails You'll Typically See:
```
- "You're registered for {stream title}"   - viewer chat unlock (confirmation)
- "Verify your email for {stream title}"    - registration-form email verification
- "Stream is live: {org} {team}"            - go-live notification
- "Confirm your subscription"               - subscription double opt-in
```

---

## 🚀 **Quick Testing Commands**

### Check Mailpit Status:
```bash
docker ps --filter "name=fieldview-mailpit"
```

### View Recent Emails:
```bash
curl -s http://localhost:4304/api/v1/messages | jq '.messages[] | {subject, to, created}'
```

### Test Email Registration (API):
```bash
curl -X POST http://localhost:4301/api/public/direct/tchs/viewer/unlock \
  -H "Content-Type: application/json" \
  -d '{
    "email": "qa-test@fieldview.live",
    "firstName": "QA",
    "lastName": "Tester"
  }'
```

### Open Mailpit Web UI:
```bash
open http://localhost:4304
```

---

## 🎯 **What to Test**

### Email Flow:
- [ ] Confirmation email arrives in Mailpit (<1 second)
- [ ] Email subject is "You're registered for {stream title}"
- [ ] Email has correct from address (noreply@fieldview.live)
- [ ] Email "Watch Stream" link is present and clickable
- [ ] Chat unlocks immediately on form submit (no link click needed)

### Chat After Registration:
- [ ] Chat panel shows "Connected" or "Live"
- [ ] Can type message (240 char limit)
- [ ] Can send message
- [ ] Message appears in chat panel
- [ ] Display name shows correctly ("First L.")

### Mobile-Specific:
- [ ] Mobile control bar appears on touch device
- [ ] Touch hints replace keyboard shortcuts
- [ ] Fullscreen registration overlay works
- [ ] All touch targets are 48px+

---

## ✅ **Summary**

**YES - You can test on any of these pages:**

1. ⭐ **http://localhost:4300/direct/tchs** (local - best for email testing with Mailpit)
2. **https://fieldview.live/direct/tchs** (production - best for real mobile device testing)
3. **http://localhost:4300/direct/stormfc** (alternative)
4. **Any `/direct/{slug}` or `/direct/{slug}/{event}` URL**

**All pages have**:
- ✅ Email registration for chat
- ✅ Mailpit integration (local only)
- ✅ Mobile-first improvements
- ✅ Collapsible scoreboard & chat

**Mailpit is ready** at http://localhost:4304 - keep it open while testing to see emails arrive in real-time!

---

**Happy Testing!** 🎉

ROLE: qa STRICT=true

