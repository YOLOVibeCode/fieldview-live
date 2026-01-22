# Full User Story Test - Owner Registration to Dashboard

**Date**: January 21, 2026  
**Purpose**: End-to-end test of owner registration → email verification → login → dashboard  
**Status**: ⏳ **READY TO EXECUTE**

---

## 🎯 Test Scenario

**User Story**: As a new owner, I want to register for an account, verify my email via MailPit, log in, and access my dashboard.

---

## 📋 Test Steps

### Step 1: Verify Services Running

```bash
# Check API
curl http://localhost:4301/health
# Expected: {"status":"ok"}

# Check Web
curl http://localhost:4300
# Expected: HTML with "FieldView.Live"

# Check MailPit
open http://localhost:4305
# Expected: MailPit web interface
```

**Status**: ⏳

---

### Step 2: Test Root Page (`/`)

1. Navigate to `http://localhost:4300`
2. Verify page loads
3. Check for:
   - [ ] Hero section with "FieldView.Live" title
   - [ ] "Owner Login" button (links to `/owners/login`)
   - [ ] "Get Started" button (links to `/owners/register`)
   - [ ] "View Demo Stream" button
   - [ ] Features section (Live Streaming, Easy Payments, Stable Links)
   - [ ] Footer with links

**Expected Result**: Page loads, all links work, mobile responsive

**Status**: ⏳

---

### Step 3: Owner Registration (`/owners/register`)

1. Click "Get Started" or navigate to `http://localhost:4300/owners/register`
2. Fill form:
   - **Name**: `Test Owner`
   - **Email**: `test-owner-${Date.now()}@example.com` (unique email)
   - **Password**: `SecurePass123!`
   - **Account Type**: `Individual`
3. Click "Create account"
4. Verify:
   - [ ] Form submits successfully
   - [ ] Redirects to `/owners/dashboard`
   - [ ] Token stored in `localStorage` (`owner_token`)
   - [ ] No console errors

**Expected Result**: Account created, redirected to dashboard

**Status**: ⏳

---

### Step 4: Check MailPit for Welcome Email

1. Open MailPit: `http://localhost:4305`
2. Look for latest email with subject: **"Welcome to FieldView.Live!"**
3. Verify email contains:
   - [ ] Welcome message
   - [ ] Link to dashboard (`http://localhost:4300/owners/dashboard`)
   - [ ] Getting started information
   - [ ] Account type (Individual/Association)

**Expected Result**: Welcome email received in MailPit

**Status**: ⏳

---

### Step 5: Owner Login (`/owners/login`)

1. Logout (clear `localStorage` or use incognito)
2. Navigate to `http://localhost:4300/owners/login`
3. Fill form:
   - **Email**: Same email used in registration
   - **Password**: `SecurePass123!`
4. Click "Sign in"
5. Verify:
   - [ ] Form submits successfully
   - [ ] Redirects to `/owners/dashboard`
   - [ ] Token stored in `localStorage`
   - [ ] No console errors

**Expected Result**: Login successful, redirected to dashboard

**Status**: ⏳

---

### Step 6: Owner Dashboard (`/owners/dashboard`)

1. Verify dashboard loads
2. Check for:
   - [ ] Account information displayed
   - [ ] Navigation links work:
     - "Create Game" → `/owners/games/new`
     - "Watch Links" → `/owners/watch-links`
     - "Events" → `/owners/events`
   - [ ] Stats/analytics section (if implemented)
   - [ ] Logout functionality

**Expected Result**: Dashboard displays correctly, all links work

**Status**: ⏳

---

### Step 7: Test Direct Stream Pages

1. Navigate to `http://localhost:4300/direct/tchs`
2. Verify:
   - [ ] Page loads
   - [ ] Video player visible
   - [ ] Admin panel accessible (bottom-right)
   - [ ] Connection Debug Panel accessible (`Ctrl+Shift+D`)

3. Test new URLs:
   - [ ] `http://localhost:4300/direct/tchs/soccer-20260122-varsity`
   - [ ] `http://localhost:4300/direct/tchs/soccer-20260122-jv`
   - [ ] `http://localhost:4300/direct/tchs/soccer-20260122-jv2`

**Expected Result**: All direct stream pages load correctly

**Status**: ⏳

---

## 🐛 Troubleshooting

### MailPit Not Receiving Emails

1. Check API logs for email sending errors
2. Verify `EMAIL_PROVIDER=mailpit` in API `.env`
3. Check MailPit is running: `docker ps | grep mailpit`
4. Verify SMTP port: `localhost:4305` (or check docker port mapping)

### Registration Fails

1. Check API logs: `cd apps/api && pnpm dev`
2. Verify database connection
3. Check for duplicate email errors
4. Verify form validation (password min 8 chars)

### Login Fails

1. Verify account was created (check database)
2. Check password hash matches
3. Verify token generation works
4. Check API logs for errors

---

## ✅ Success Criteria

- [x] Stale code deleted (8 files)
- [ ] Root page loads
- [ ] Owner registration works
- [ ] Welcome email received in MailPit
- [ ] Owner login works
- [ ] Dashboard loads
- [ ] Direct stream pages work
- [ ] No console errors
- [ ] No TypeScript errors

---

## 📊 Test Results

```markdown
## Test Execution - [Date/Time]

### Services
- [ ] API running
- [ ] Web running
- [ ] MailPit running

### Root Page
- [ ] Loads
- [ ] Links work

### Registration
- [ ] Form works
- [ ] Account created
- [ ] Email sent

### MailPit
- [ ] Email received
- [ ] Content correct

### Login
- [ ] Form works
- [ ] Authentication works

### Dashboard
- [ ] Loads
- [ ] Links work

### Direct Streams
- [ ] Pages load
- [ ] Features work

### Errors
- [ ] Console errors: [list]
- [ ] TypeScript errors: [list]
```

---

**Last Updated**: January 21, 2026  
**Next**: Execute full test suite
