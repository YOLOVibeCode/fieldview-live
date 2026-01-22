# Role Feature Test Matrix

**Date**: January 21, 2026  
**Purpose**: Comprehensive test matrix for all user roles and features  
**Status**: ✅ **READY FOR TESTING**

---

## 🎭 User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **Anonymous Viewer** | Unauthenticated user browsing site | Public pages only |
| **Registered Viewer** | User who registered for a stream | Stream access, chat |
| **Owner (Individual)** | Single owner account | Own streams, games, analytics |
| **Owner (Association)** | Organization account | Multiple teams, shared resources |
| **Admin** | Platform administrator | Full system access |
| **Super Admin** | Direct stream administrator | Direct stream management |

---

## 📋 Test Matrix

### 1. Root Page (`/`)

| Test Case | Role | Expected Result | Status |
|-----------|------|-----------------|--------|
| Load homepage | Anonymous | Page loads, shows hero section | ⏳ |
| Click "Get Started" | Anonymous | Redirects to `/owners/register` | ⏳ |
| Click "Login" | Anonymous | Redirects to `/owners/login` | ⏳ |
| View features section | Anonymous | Features displayed | ⏳ |
| Mobile responsive | Anonymous | Layout adapts to mobile | ⏳ |

---

### 2. Owner Registration (`/owners/register`)

| Test Case | Role | Expected Result | Status |
|-----------|------|-----------------|--------|
| Load registration page | Anonymous | Form displays with all fields | ⏳ |
| Submit valid form (Individual) | Anonymous | Account created, token stored, redirect to dashboard | ⏳ |
| Submit valid form (Association) | Anonymous | Account created, token stored, redirect to dashboard | ⏳ |
| Submit duplicate email | Anonymous | Error: "Email already registered" | ⏳ |
| Submit weak password (< 8 chars) | Anonymous | Validation error | ⏳ |
| Submit invalid email | Anonymous | Validation error | ⏳ |
| Check MailPit for welcome email | System | Email received at `http://localhost:4305` | ⏳ |
| Email contains dashboard link | System | Link points to `/owners/dashboard` | ⏳ |
| Abuse detection (multiple accounts) | Anonymous | Abuse modal shown, one-time pass option | ⏳ |
| Accept one-time pass | Anonymous | Registration proceeds | ⏳ |

**Test Data**:
```typescript
{
  name: "Test Owner",
  email: "test-owner@example.com",
  password: "SecurePass123!",
  type: "individual"
}
```

---

### 3. Owner Login (`/owners/login`)

| Test Case | Role | Expected Result | Status |
|-----------|------|-----------------|--------|
| Load login page | Anonymous | Form displays | ⏳ |
| Login with valid credentials | Anonymous | Token stored, redirect to dashboard | ⏳ |
| Login with invalid email | Anonymous | Error: "Invalid credentials" | ⏳ |
| Login with invalid password | Anonymous | Error: "Invalid credentials" | ⏳ |
| Login with unregistered email | Anonymous | Error: "Invalid credentials" | ⏳ |
| Remember me functionality | Anonymous | Token persists across sessions | ⏳ |
| Redirect after login | Anonymous | Goes to `/owners/dashboard` | ⏳ |

**Test Data**:
```typescript
{
  email: "test-owner@example.com",
  password: "SecurePass123!"
}
```

---

### 4. Owner Dashboard (`/owners/dashboard`)

| Test Case | Role | Expected Result | Status |
|-----------|------|-----------------|--------|
| Load dashboard (authenticated) | Owner | Dashboard displays, shows account info | ⏳ |
| Load dashboard (unauthenticated) | Anonymous | Redirects to `/owners/login` | ⏳ |
| View account stats | Owner | Shows games created, revenue, etc. | ⏳ |
| Navigate to "Create Game" | Owner | Redirects to `/owners/games/new` | ⏳ |
| Navigate to "Watch Links" | Owner | Redirects to `/owners/watch-links` | ⏳ |
| Navigate to "Events" | Owner | Redirects to `/owners/events` | ⏳ |
| Logout | Owner | Token cleared, redirects to login | ⏳ |

---

### 5. Direct Stream Pages (`/direct/{slug}`)

| Test Case | Role | Expected Result | Status |
|-----------|------|-----------------|--------|
| Load stream page (no stream URL) | Anonymous | Page loads, shows "No stream configured" | ⏳ |
| Load stream page (with stream URL) | Anonymous | Video player loads, stream plays | ⏳ |
| Admin panel unlock | Anonymous | Password prompt, JWT issued | ⏳ |
| Admin panel save stream URL | Admin | Stream URL saved, video updates | ⏳ |
| Chat panel (if enabled) | Anonymous | Chat panel visible, requires registration | ⏳ |
| Chat registration | Anonymous | Form shown, email verification sent | ⏳ |
| Chat unlock (after verification) | Registered Viewer | Chat unlocked, can send messages | ⏳ |
| Scoreboard (if enabled) | Anonymous | Scoreboard panel visible | ⏳ |
| Connection Debug Panel | Anonymous | Accessible via `Ctrl+Shift+D` or `?debug=true` | ⏳ |
| Mobile responsive | Anonymous | Layout adapts, touch controls work | ⏳ |
| Fullscreen mode | Anonymous | Video enters fullscreen | ⏳ |

**Test URLs**:
- `/direct/tchs`
- `/direct/tchs/soccer-20260122-varsity`
- `/direct/tchs/soccer-20260122-jv`
- `/direct/tchs/soccer-20260122-jv2`

---

### 6. Email Verification (MailPit)

| Test Case | Role | Expected Result | Status |
|-----------|------|-----------------|--------|
| Welcome email sent on registration | System | Email in MailPit at `http://localhost:4305` | ⏳ |
| Email subject correct | System | "Welcome to FieldView.Live!" | ⏳ |
| Email contains dashboard link | System | Link works, redirects to dashboard | ⏳ |
| Stream registration email sent | System | Email in MailPit with verification link | ⏳ |
| Verification link works | Registered Viewer | Link verifies email, unlocks features | ⏳ |
| Resend verification email | Registered Viewer | New email sent | ⏳ |

**MailPit URL**: `http://localhost:4305`

---

### 7. Admin Features

| Test Case | Role | Expected Result | Status |
|-----------|------|-----------------|--------|
| Super Admin - Direct Streams | Super Admin | Can view all direct streams | ⏳ |
| Super Admin - Create Event | Super Admin | Can create new events | ⏳ |
| Super Admin - Update Stream URL | Super Admin | Can update stream URLs | ⏳ |
| Admin Panel - Unlock | Admin | Can unlock with password | ⏳ |
| Admin Panel - Save Settings | Admin | Can save stream URL, scoreboard | ⏳ |

---

### 8. API Endpoints

| Endpoint | Method | Role | Expected Result | Status |
|----------|--------|------|-----------------|--------|
| `/api/owners/register` | POST | Anonymous | Creates account, returns token | ⏳ |
| `/api/owners/login` | POST | Anonymous | Returns token | ⏳ |
| `/api/owners/me` | GET | Owner | Returns account info | ⏳ |
| `/api/direct/{slug}/bootstrap` | GET | Anonymous | Returns stream config | ⏳ |
| `/api/direct/{slug}/settings` | PATCH | Admin | Updates stream settings | ⏳ |
| `/api/direct/{slug}/unlock-admin` | POST | Anonymous | Returns JWT token | ⏳ |
| `/api/public/direct/viewer/auto-register` | POST | Anonymous | Creates viewer identity | ⏳ |

---

## 🧪 Test Execution Plan

### Phase 1: Setup
1. [ ] Start MailPit: `docker run -d -p 4305:8025 -p 1025:1025 axllent/mailpit`
2. [ ] Start API: `cd apps/api && pnpm dev`
3. [ ] Start Web: `cd apps/web && pnpm dev`
4. [ ] Verify services running:
   - API: `http://localhost:4301/health`
   - Web: `http://localhost:4300`
   - MailPit: `http://localhost:4305`

### Phase 2: Root Page Tests
1. [ ] Load `http://localhost:4300`
2. [ ] Verify page loads
3. [ ] Test "Get Started" link
4. [ ] Test "Login" link
5. [ ] Test mobile responsive

### Phase 3: Owner Registration Flow
1. [ ] Navigate to `/owners/register`
2. [ ] Fill form with test data
3. [ ] Submit form
4. [ ] Verify redirect to dashboard
5. [ ] Check MailPit for welcome email
6. [ ] Verify email content and links

### Phase 4: Owner Login Flow
1. [ ] Navigate to `/owners/login`
2. [ ] Enter credentials
3. [ ] Submit form
4. [ ] Verify redirect to dashboard
5. [ ] Verify token stored in localStorage

### Phase 5: Direct Stream Tests
1. [ ] Test `/direct/tchs`
2. [ ] Test `/direct/tchs/soccer-20260122-varsity`
3. [ ] Test admin panel unlock
4. [ ] Test admin panel save stream URL
5. [ ] Test chat registration
6. [ ] Test connection debug panel
7. [ ] Test mobile responsive

### Phase 6: Email Verification
1. [ ] Check MailPit for all emails
2. [ ] Verify email content
3. [ ] Test verification links
4. [ ] Test resend functionality

### Phase 7: E2E Test Suite
1. [ ] Run: `cd apps/web && pnpm test:e2e`
2. [ ] Verify all tests pass
3. [ ] Check for console errors
4. [ ] Verify no TypeScript errors

---

## 📊 Test Results Template

```markdown
## Test Execution Results - [Date]

### Setup
- [ ] MailPit running
- [ ] API running
- [ ] Web running

### Root Page
- [ ] Loads successfully
- [ ] Links work
- [ ] Mobile responsive

### Owner Registration
- [ ] Form works
- [ ] Account created
- [ ] Email sent to MailPit
- [ ] Redirect works

### Owner Login
- [ ] Form works
- [ ] Authentication works
- [ ] Redirect works

### Direct Streams
- [ ] Pages load
- [ ] Admin panel works
- [ ] Chat works
- [ ] Debug panel works

### Email Verification
- [ ] Emails received
- [ ] Links work

### E2E Tests
- [ ] All tests pass
- [ ] No errors
```

---

## 🐛 Known Issues

| Issue | Description | Workaround | Status |
|-------|-------------|------------|--------|
| - | - | - | - |

---

**Last Updated**: January 21, 2026  
**Next Review**: After test execution
