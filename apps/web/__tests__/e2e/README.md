# E2E Test Suite - Automation-Friendly Selectors

This test suite follows the automation-friendly mandate: **all tests use accessibility-first locators** (`getByRole`, `getByLabel`) instead of brittle CSS selectors.

## Test Files

- `live.smoke.spec.ts` - Basic smoke tests
- `live.checkout-to-payment.spec.ts` - Checkout flow end-to-end
- `live.checkout-form.spec.ts` - Checkout form validation and selectors
- `live.payment-page.spec.ts` - Payment page with Square integration
- `live.admin-login.spec.ts` - Admin login flow
- `live.admin-console.spec.ts` - Admin console search and navigation

## Selector Strategy

### ✅ Preferred (Accessibility-First)
1. **`getByRole()`** - For buttons, headings, links, form controls
   ```typescript
   page.getByRole('button', { name: /Sign in/i })
   page.getByRole('heading', { name: /Admin Console/i })
   ```

2. **`getByLabel()`** - For form inputs (most reliable)
   ```typescript
   page.getByLabel(/Email Address/i)
   page.getByLabel(/Global Search/i)
   ```

3. **`getByText()`** - For visible text content (use sparingly)
   ```typescript
   page.getByText('Purchase Stream Access')
   ```

### ⚠️ Use Sparingly (Only When Necessary)
4. **`getByTestId()`** - Only for 3rd-party widgets or dynamic content
   ```typescript
   page.getByTestId('square-card-container')
   page.getByTestId('pay-now')
   ```

### ❌ Avoid
- CSS selectors (`page.locator('.class-name')`)
- XPath selectors
- Text content that changes frequently
- Auto-generated class names

## Running Tests

```bash
# Set required environment variables
export LIVE_TEST_MODE=1
export PLAYWRIGHT_BASE_URL=http://localhost:3000
export PLAYWRIGHT_API_BASE_URL=http://localhost:3001

# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm playwright test apps/web/__tests__/e2e/live.checkout-form.spec.ts
```

## Test Patterns

### Form Testing
```typescript
// ✅ Good: Use label-based selectors
await page.getByLabel(/Email Address/i).fill('user@example.com');
await page.getByRole('button', { name: /Submit/i }).click();

// ❌ Bad: CSS selectors
await page.fill('input[type="email"]', 'user@example.com');
await page.click('button[type="submit"]');
```

### Error Message Testing
```typescript
// ✅ Good: Use role="alert" selector
const errorAlert = page.getByRole('alert');
await expect(errorAlert).toBeVisible();
await expect(errorAlert).toContainText(/error message/i);
```

### Dynamic Content Testing
```typescript
// ✅ Good: Use regex for dynamic button text
await page.getByRole('button', { name: /Continue to Payment/i }).click();

// ❌ Bad: Exact text match that breaks when price changes
await page.getByText('Continue to Payment - $7.00').click();
```

## Notes

- All error messages have `role="alert"` for accessibility and testing
- All form inputs have proper `<label>` associations
- All buttons have `aria-label` when text is ambiguous
- 3rd-party widgets (Square) use `data-testid` for stable selectors

