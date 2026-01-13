# 🧪 E2E Testing Guide - Password Reset & Viewer Refresh

This guide documents the end-to-end testing strategy for authentication workflows.

---

## 📋 Test Coverage

### Password Reset Flow (20 tests)
- ✅ Complete owner user flow
- ✅ Complete admin account flow
- ✅ Password validation (requirements, strength, match)
- ✅ Password visibility toggle
- ✅ Invalid/expired token handling
- ✅ Rate limiting
- ✅ Loading states
- ✅ Form accessibility
- ✅ Mobile responsiveness
- ✅ Touch-friendly targets

### Viewer Refresh Flow (15 tests)
- ✅ Valid token verification
- ✅ Success state with countdown
- ✅ Auto-redirect functionality
- ✅ Manual continue option
- ✅ Invalid/expired token handling
- ✅ Missing token handling
- ✅ Error scenarios (network, malformed tokens)
- ✅ Mobile responsiveness
- ✅ Accessibility (ARIA, keyboard navigation)
- ✅ Performance benchmarks

**Total E2E Tests:** 35 tests

---

## 🚀 Running E2E Tests

### Run All Tests
```bash
pnpm --filter web test:live
```

### Run Specific Test Suite
```bash
# Password reset tests only
pnpm --filter web test:live password-reset

# Viewer refresh tests only
pnpm --filter web test:live viewer-refresh
```

### Run in UI Mode (Interactive)
```bash
pnpm --filter web playwright test --ui
```

### Run in Debug Mode
```bash
pnpm --filter web playwright test --debug
```

### Run on Specific Browser
```bash
pnpm --filter web playwright test --project=chromium
pnpm --filter web playwright test --project=firefox
pnpm --filter web playwright test --project=webkit
```

---

## 🔧 Test Setup Requirements

### 1. Backend API Running
```bash
# Terminal 1: Start API
cd apps/api
pnpm dev
```

### 2. Frontend Running
```bash
# Terminal 2: Start Web
cd apps/web
pnpm dev
```

### 3. Database & Mailpit
```bash
# Terminal 3: Docker services
docker-compose up postgres redis mailpit
```

### 4. Test Database Seeding
```bash
# Seed test data
pnpm --filter api prisma db seed
```

---

## 📝 Test Scenarios

### Password Reset - Owner User

**Test:** Complete password reset flow
1. Navigate to `/forgot-password`
2. Select "Team Owner / Staff"
3. Enter email
4. Submit form
5. Verify success message
6. Navigate to reset page with token
7. Enter new password
8. Verify password strength indicator
9. Confirm password
10. Submit
11. Verify success and redirect

**Expected Results:**
- ✅ Form validation works
- ✅ Success message shows
- ✅ Email sent to Mailpit
- ✅ Token valid for 15 minutes
- ✅ Password requirements enforced
- ✅ Strength indicator accurate
- ✅ Success state shows
- ✅ Auto-redirects to login

### Password Reset - Admin Account

**Test:** Admin-specific flow
1. Navigate to `/forgot-password`
2. Select "Super Admin"
3. Enter admin email
4. Submit form
5. Check for MFA warning in email
6. Complete reset flow

**Expected Results:**
- ✅ Admin option selectable
- ✅ 🔒 Icon shows
- ✅ Token expires in 10 minutes (stricter)
- ✅ MFA reset warning shown
- ✅ Success confirmation

### Viewer Refresh

**Test:** Complete viewer refresh flow
1. Navigate to `/verify-access?token=...`
2. Page verifies token
3. Shows success with countdown
4. Auto-redirects to stream

**Expected Results:**
- ✅ Verifying state shows
- ✅ Success animation displays
- ✅ Countdown from 3
- ✅ Manual continue button works
- ✅ Auto-redirect after 3s
- ✅ Cinema branding visible

### Error Scenarios

**Test:** Invalid tokens
1. Navigate with invalid token
2. Verify error message
3. Check "Request New Link" button

**Test:** Expired tokens
1. Navigate with expired token
2. Verify expiry message
3. Check helpful recovery options

**Test:** Rate limiting
1. Make 3 password reset requests
2. Verify 4th request shows rate limit error
3. Check error message clarity

---

## 🎯 Test Data

### Test Accounts

```typescript
// Owner User
{
  email: 'owner@example.com',
  password: 'OldPassword123!',
  role: 'owner_admin'
}

// Admin Account
{
  email: 'admin@example.com',
  password: 'AdminOldPass123!',
  role: 'super_admin'
}

// Viewer
{
  email: 'viewer@example.com',
  firstName: 'Test',
  lastName: 'Viewer'
}
```

### Test Tokens

```typescript
// Valid tokens (mock for testing)
const validOwnerToken = 'test-owner-reset-token-12345';
const validAdminToken = 'test-admin-reset-token-67890';
const validViewerToken = 'test-valid-viewer-token-12345';

// Invalid/expired tokens
const expiredToken = 'expired-token-99999';
const invalidToken = 'invalid-format-token';
```

---

## 📊 Test Assertions

### Password Reset Page

```typescript
// Form elements
await expect(page.getByTestId('input-email')).toBeVisible();
await expect(page.getByTestId('btn-submit')).toBeVisible();
await expect(page.getByTestId('radio-owner-user')).toBeChecked();

// Success state
await expect(page.getByTestId('success-message')).toBeVisible();
await expect(page.getByTestId('success-message')).toContainText('If an account exists');

// Error state
await expect(page.getByTestId('error-message')).toBeVisible();
await expect(page.getByTestId('error-message')).toContainText('Too many');
```

### Reset Password Page

```typescript
// Form elements
await expect(page.getByTestId('form-reset-password')).toBeVisible();
await expect(page.getByTestId('input-new-password')).toBeVisible();
await expect(page.getByTestId('input-confirm-password')).toBeVisible();

// Password strength
await expect(page.getByTestId('password-strength-label')).toContainText('Strong');

// Success state
await expect(page.getByTestId('success-state')).toBeVisible();
await expect(page.getByText('Password Reset Successful!')).toBeVisible();

// Error state
await expect(page.getByText('Invalid Reset Link')).toBeVisible();
```

### Verify Access Page

```typescript
// Loading state
await expect(page.getByTestId('verifying-state')).toBeVisible();

// Success state
await expect(page.getByText(/Access Restored/i)).toBeVisible();
await expect(page.getByTestId('countdown')).toBeVisible();
await expect(page.getByTestId('btn-continue')).toBeVisible();

// Error state
await expect(page.getByText('Access Link Invalid')).toBeVisible();
await expect(page.getByTestId('btn-back-home')).toBeVisible();
```

---

## 🐛 Debugging Tests

### View Test Results
```bash
# Open HTML report
pnpm --filter web playwright show-report
```

### Screenshot on Failure
Tests automatically capture screenshots on failure in `test-results/`

### Video Recording
```typescript
// Enable in playwright.config.ts
use: {
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
}
```

### Console Logs
```typescript
// Capture console logs in test
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
```

---

## 🔒 Security Testing

### Test Cases
- ✅ Email enumeration protection (generic messages)
- ✅ Token expiry enforcement
- ✅ Rate limiting
- ✅ Token reuse prevention
- ✅ XSS protection (input sanitization)
- ✅ CSRF protection

### Manual Security Tests
1. Attempt SQL injection in email field
2. Test XSS vectors in form inputs
3. Verify HTTPS enforcement
4. Check for sensitive data in URLs
5. Test token tampering

---

## 📱 Mobile Testing

### Viewports Tested
- iPhone SE: 375x667
- iPhone 12 Pro: 390x844
- iPad: 768x1024
- Desktop: 1920x1080

### Mobile-Specific Tests
- ✅ Touch target size (44x44 minimum)
- ✅ Text readability
- ✅ Form usability
- ✅ Button accessibility
- ✅ Responsive layout

---

## ⚡ Performance Testing

### Benchmarks
- Page load: < 3 seconds
- API response: < 500ms
- Form submission: < 1 second
- Token verification: < 2 seconds

### Performance Tests
```typescript
test('should load quickly', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/forgot-password');
  await expect(page.getByText('Reset Password')).toBeVisible();
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000);
});
```

---

## 🎨 Accessibility Testing

### WCAG 2.1 AA Compliance
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Color contrast
- ✅ Focus indicators
- ✅ ARIA labels

### Accessibility Tests
```typescript
test('should be keyboard navigable', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.keyboard.press('Tab'); // Focus email
  await page.keyboard.press('Tab'); // Focus submit
  await expect(page.getByTestId('btn-submit')).toBeFocused();
});
```

---

## 📈 Test Metrics

### Target Coverage
- **Unit Tests:** 90%+ coverage
- **Integration Tests:** 80%+ coverage
- **E2E Tests:** Critical paths 100%

### Current Status
- Password Reset E2E: 20 tests
- Viewer Refresh E2E: 15 tests
- **Total:** 35 E2E tests

---

## 🔄 CI/CD Integration

### GitHub Actions (Example)
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: pnpm install
      - name: Run E2E tests
        run: pnpm --filter web test:live
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Accessibility Testing](https://playwright.dev/docs/accessibility-testing)
- [CI/CD Integration](https://playwright.dev/docs/ci)

---

**E2E Testing ensures production-quality authentication flows!** 🚀

