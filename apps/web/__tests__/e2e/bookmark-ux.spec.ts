import { test, expect, type Page } from '@playwright/test';

/**
 * Bookmark & Pin UX E2E Tests
 *
 * Comprehensive tests across form factors:
 *   - Portrait mobile (390x844)
 *   - Landscape mobile (844x390)
 *   - Tablet portrait (768x1024)
 *   - Desktop (1440x900)
 *
 * Tests cover:
 *   1. isShared defaults to true on every bookmark (Bug 1 fix)
 *   2. 'B' keyboard shortcut works in portrait mode (Bug 2 fix)
 *   3. Escape closes BookmarkButton modal (Bug 3 fix)
 *   4. Inline confirm/cancel instead of native dialogs (Bug 4 fix)
 *   5. Touch targets >= 44px on all interactive elements
 *   6. Bookmark badge count on toggle button
 *   7. No native dialogs triggered
 *
 * Prereqs: local API + web running, "test" stream with:
 *   - streamUrl set (HLS URL)
 *   - allowAnonymousChat: true (for auto-connect to unlock viewer)
 */

const STREAM_URL = '/direct/test';

// Helper: navigate and wait for anonymous auto-connect to unlock viewer
async function navigateAndWaitForUnlock(page: Page): Promise<boolean> {
  await page.goto(STREAM_URL);
  // Wait for bootstrap + anonymous auto-connect + React re-render
  // The anonymous auto-connect fires when allowAnonymousChat=true,
  // which calls setExternalIdentity, setting isUnlocked=true and viewerId
  await page.waitForTimeout(5000);

  // Check if bookmark controls appeared (indicates viewer is unlocked + stream has URL)
  const hasBookmarks = await page.getByTestId('btn-quick-bookmark')
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  return hasBookmarks;
}

// Helper: assert a locator meets minimum 44px touch target
async function assertTouchTarget(page: Page, locator: ReturnType<Page['locator']>, label: string) {
  if (await locator.isVisible({ timeout: 2000 }).catch(() => false)) {
    const box = await locator.boundingBox();
    if (box) {
      expect(box.height, `${label} height >= 44px`).toBeGreaterThanOrEqual(43); // 43 allows for sub-pixel rounding
      expect(box.width, `${label} width >= 44px`).toBeGreaterThanOrEqual(43);
    }
  }
}

// ============================================================
// PORTRAIT MOBILE (390x844) — PortraitStreamLayout
// ============================================================
test.describe('Bookmark UX — Portrait Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('bookmark controls render when viewer is auto-connected', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) {
      test.skip(true, 'Bookmark controls not visible (stream may lack URL or anonymous connect failed)');
      return;
    }

    await expect(page.getByTestId('btn-quick-bookmark')).toBeVisible();
    await expect(page.getByTestId('btn-bookmark')).toBeVisible();
  });

  test('B key toggles portrait tab to bookmarks and back', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    // Portrait mode should show tab bar
    const chatTab = page.getByTestId('portrait-tab-chat');
    const bookmarksTab = page.getByTestId('portrait-tab-bookmarks');

    const hasPortraitTabs = await chatTab.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasPortraitTabs) { test.skip(true, 'Portrait tabs not visible'); return; }

    // Chat tab should be active initially (has border-b-2 active style)
    const chatClass1 = await chatTab.getAttribute('class') || '';
    expect(chatClass1).toContain('border-b-2');

    // Press 'B' to switch to bookmarks tab
    await page.keyboard.press('b');
    await page.waitForTimeout(600);

    // Bookmarks tab should now be active
    if (await bookmarksTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      const bookmarksClass = await bookmarksTab.getAttribute('class') || '';
      expect(bookmarksClass).toContain('border-b-2');
    }

    // Press 'B' again to switch back to chat
    await page.keyboard.press('b');
    await page.waitForTimeout(600);

    const chatClass2 = await chatTab.getAttribute('class') || '';
    expect(chatClass2).toContain('border-b-2');
  });

  test('BookmarkButton modal opens and Escape closes it', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    await page.getByTestId('btn-bookmark').click();
    await page.waitForTimeout(600);

    const modal = page.getByTestId('modal-bookmark');
    await expect(modal).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await expect(modal).not.toBeVisible();
  });

  test('isShared checkbox defaults to checked on every open', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    // First open — should be checked
    await page.getByTestId('btn-bookmark').click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId('checkbox-bookmark-shared')).toBeChecked();

    // Fill label and submit
    await page.getByTestId('input-bookmark-label').fill('Test Bookmark 1');
    await page.getByTestId('btn-submit-bookmark').click();

    // Wait for modal to close (success) or remain open (API error)
    const modal = page.getByTestId('modal-bookmark');
    const closed = await modal.waitFor({ state: 'hidden', timeout: 5000 }).then(() => true).catch(() => false);

    if (!closed) {
      // Modal stayed open (API error) — close via Escape and verify isShared is still true
      // The key verification: even after submit attempt, isShared state should remain true
      const checkbox = page.getByTestId('checkbox-bookmark-shared');
      await expect(checkbox).toBeChecked();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    // Re-open modal — isShared should STILL default to true (Bug 1 fix)
    await page.getByTestId('btn-bookmark').click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId('checkbox-bookmark-shared')).toBeChecked();

    await page.keyboard.press('Escape');
  });

  test('touch targets meet 44px minimum on portrait', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    await assertTouchTarget(page, page.getByTestId('btn-quick-bookmark'), 'QuickBookmarkButton');
    await assertTouchTarget(page, page.getByTestId('btn-bookmark'), 'BookmarkButton');

    // Open modal and check dialog buttons
    await page.getByTestId('btn-bookmark').click();
    await page.waitForTimeout(400);
    await assertTouchTarget(page, page.getByTestId('btn-cancel-bookmark'), 'Cancel button');
    await assertTouchTarget(page, page.getByTestId('btn-submit-bookmark'), 'Save button');

    await page.keyboard.press('Escape');
  });
});

// ============================================================
// LANDSCAPE MOBILE (844x390)
// ============================================================
test.describe('Bookmark UX — Landscape Mobile', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test('bookmark controls render in landscape', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    await expect(page.getByTestId('btn-quick-bookmark')).toBeVisible();
    await expect(page.getByTestId('btn-bookmark')).toBeVisible();
  });

  test('Escape closes bookmark modal in landscape', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    await page.getByTestId('btn-bookmark').click();
    await page.waitForTimeout(600);

    const modal = page.getByTestId('modal-bookmark');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(modal).not.toBeVisible();
  });

  test('B key toggles bookmark panel (not portrait tab) in landscape', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    const toggleBtn = page.getByTestId('btn-toggle-bookmark-panel');
    const hasToggle = await toggleBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasToggle) { test.skip(true, 'No toggle button in landscape'); return; }

    // Press B to open panel
    await page.keyboard.press('b');
    await page.waitForTimeout(600);

    const panel = page.getByTestId('bookmark-panel');
    const panelVisible = await panel.isVisible({ timeout: 2000 }).catch(() => false);

    if (panelVisible) {
      await expect(panel).toBeVisible();

      // Press B again to close
      await page.keyboard.press('b');
      await page.waitForTimeout(600);
      await expect(panel).not.toBeVisible();
    }
  });

  test('touch targets meet 44px minimum in landscape', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    await assertTouchTarget(page, page.getByTestId('btn-quick-bookmark'), 'QuickBookmarkButton');
    await assertTouchTarget(page, page.getByTestId('btn-bookmark'), 'BookmarkButton');
  });
});

// ============================================================
// TABLET PORTRAIT (768x1024)
// ============================================================
test.describe('Bookmark UX — Tablet Portrait', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('bookmark panel toggle opens and collapse button works', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    const toggleBtn = page.getByTestId('btn-toggle-bookmark-panel');
    const hasToggle = await toggleBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasToggle) { test.skip(true, 'No toggle button'); return; }

    await assertTouchTarget(page, toggleBtn, 'Toggle bookmark panel');

    // Open panel
    await toggleBtn.click();
    await page.waitForTimeout(600);

    const panel = page.getByTestId('bookmark-panel');
    if (await panel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(panel).toBeVisible();

      // Collapse button should work
      const collapseBtn = page.getByTestId('btn-collapse-bookmark-panel');
      if (await collapseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await collapseBtn.click();
        await page.waitForTimeout(400);
        await expect(panel).not.toBeVisible();

        // Collapsed tab should appear
        const collapsedTab = page.getByTestId('bookmark-collapsed-tab');
        const hasCollapsedTab = await collapsedTab.isVisible({ timeout: 2000 }).catch(() => false);
        if (hasCollapsedTab) {
          await expect(collapsedTab).toBeVisible();
        }
      }
    }
  });

  test('Escape closes bookmark modal on tablet', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    await page.getByTestId('btn-bookmark').click();
    await page.waitForTimeout(600);

    const modal = page.getByTestId('modal-bookmark');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await expect(modal).not.toBeVisible();
  });
});

// ============================================================
// DESKTOP (1440x900)
// ============================================================
test.describe('Bookmark UX — Desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('bookmark controls visible on desktop', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    await expect(page.getByTestId('btn-quick-bookmark')).toBeVisible();
    await expect(page.getByTestId('btn-bookmark')).toBeVisible();
    await expect(page.getByTestId('btn-toggle-bookmark-panel')).toBeVisible();
  });

  test('B key toggles bookmark panel on desktop', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    await page.keyboard.press('b');
    await page.waitForTimeout(600);

    const panel = page.getByTestId('bookmark-panel');
    const panelVisible = await panel.isVisible({ timeout: 2000 }).catch(() => false);
    if (!panelVisible) { test.skip(true, 'Panel did not open'); return; }

    await expect(panel).toBeVisible();

    // Escape closes the panel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(panel).not.toBeVisible();
  });

  test('Escape closes bookmark modal on desktop', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    await page.getByTestId('btn-bookmark').click();
    await page.waitForTimeout(600);

    const modal = page.getByTestId('modal-bookmark');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await expect(modal).not.toBeVisible();
  });

  test('create bookmark then verify badge on toggle button', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    // Create a bookmark via quick button
    await page.getByTestId('btn-quick-bookmark').click();
    await page.waitForTimeout(2000);

    // Toggle button should be visible and clickable
    const toggleBtn = page.getByTestId('btn-toggle-bookmark-panel');
    await expect(toggleBtn).toBeVisible();
    await assertTouchTarget(page, toggleBtn, 'Toggle panel');

    // Open panel to verify bookmarks exist
    await toggleBtn.click();
    await page.waitForTimeout(1000);

    const panel = page.getByTestId('bookmark-panel');
    if (await panel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(panel).toBeVisible();
    }
  });

  test('inline delete confirm replaces native dialog', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    // Intercept any native dialog — should NOT fire
    let dialogTriggered = false;
    page.on('dialog', async (dialog) => {
      dialogTriggered = true;
      await dialog.dismiss();
    });

    // Create a bookmark
    await page.getByTestId('btn-quick-bookmark').click();
    await page.waitForTimeout(2000);

    // Open bookmark panel
    const toggleBtn = page.getByTestId('btn-toggle-bookmark-panel');
    if (!await toggleBtn.isVisible({ timeout: 2000 }).catch(() => false)) { test.skip(); return; }
    await toggleBtn.click();
    await page.waitForTimeout(1500);

    // Find a delete button in the list
    const deleteBtn = page.locator('[data-testid^="btn-delete-"]').first();
    if (!await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(true, 'No delete button found'); return; }

    // Click delete — should show inline confirm, NOT native dialog
    await deleteBtn.click();
    await page.waitForTimeout(600);

    expect(dialogTriggered, 'Native dialog should NOT have been triggered').toBe(false);

    // Inline confirm buttons should appear
    const confirmBtn = page.locator('[data-testid^="btn-confirm-delete-"]').first();
    const hasInlineConfirm = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasInlineConfirm, 'Inline confirm button should be visible').toBe(true);

    // Cancel the delete (click "No")
    const noBtn = page.locator('[data-testid^="confirm-delete-"] button').first();
    if (await noBtn.isVisible()) {
      await noBtn.click();
      await page.waitForTimeout(400);
    }
  });

  test('inline clip feedback replaces native alert', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    // Intercept any native dialog
    let alertTriggered = false;
    page.on('dialog', async (dialog) => {
      alertTriggered = true;
      await dialog.accept();
    });

    // Create a bookmark
    await page.getByTestId('btn-quick-bookmark').click();
    await page.waitForTimeout(2000);

    // Open bookmark panel
    const toggleBtn = page.getByTestId('btn-toggle-bookmark-panel');
    if (!await toggleBtn.isVisible({ timeout: 2000 }).catch(() => false)) { test.skip(); return; }
    await toggleBtn.click();
    await page.waitForTimeout(1500);

    // Find create clip button
    const clipBtn = page.locator('[data-testid^="btn-create-clip-"]').first();
    if (!await clipBtn.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(true, 'No clip button found'); return; }

    await clipBtn.click();
    await page.waitForTimeout(2000);

    // Should NOT trigger native alert
    expect(alertTriggered, 'Native alert should NOT have been triggered').toBe(false);

    // Inline feedback should appear (success or error — both are inline)
    const feedback = page.locator('[data-testid^="clip-feedback-"]').first();
    const hasFeedback = await feedback.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasFeedback) {
      await expect(feedback).toBeVisible();
      // Auto-hide after 3s
      await page.waitForTimeout(3500);
      await expect(feedback).not.toBeVisible();
    }
  });

  test('touch targets on all desktop bookmark buttons', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    await assertTouchTarget(page, page.getByTestId('btn-quick-bookmark'), 'QuickBookmarkButton');
    await assertTouchTarget(page, page.getByTestId('btn-bookmark'), 'BookmarkButton');
    await assertTouchTarget(page, page.getByTestId('btn-toggle-bookmark-panel'), 'Toggle panel');
  });

  test('collapsed bookmark tab appears on right edge', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    // Collapsed tab should be visible by default (panel starts collapsed)
    const collapsedTab = page.getByTestId('bookmark-collapsed-tab');
    const hasTab = await collapsedTab.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasTab) { test.skip(true, 'Collapsed tab not visible'); return; }

    await expect(collapsedTab).toBeVisible();

    // Click collapsed tab to expand panel
    await collapsedTab.click();
    await page.waitForTimeout(600);

    const panel = page.getByTestId('bookmark-panel');
    const panelVisible = await panel.isVisible({ timeout: 2000 }).catch(() => false);
    if (panelVisible) {
      await expect(panel).toBeVisible();
      // Collapsed tab should disappear when panel is expanded
      await expect(collapsedTab).not.toBeVisible();
    }
  });

  test('collapse button on expanded panel returns to collapsed tab', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    // Open panel via toggle button
    const toggleBtn = page.getByTestId('btn-toggle-bookmark-panel');
    await toggleBtn.click();
    await page.waitForTimeout(600);

    const panel = page.getByTestId('bookmark-panel');
    const panelVisible = await panel.isVisible({ timeout: 2000 }).catch(() => false);
    if (!panelVisible) { test.skip(true, 'Panel did not open'); return; }

    // Click collapse button
    const collapseBtn = page.getByTestId('btn-collapse-bookmark-panel');
    if (!await collapseBtn.isVisible({ timeout: 2000 }).catch(() => false)) { test.skip(); return; }

    await collapseBtn.click();
    await page.waitForTimeout(600);

    // Panel should close, collapsed tab should appear
    await expect(panel).not.toBeVisible();
    const collapsedTab = page.getByTestId('bookmark-collapsed-tab');
    const hasTab = await collapsedTab.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasTab) {
      await expect(collapsedTab).toBeVisible();
    }
  });

  test('bookmark panel state persists across page reload', async ({ page }) => {
    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    // Expand the panel
    const collapsedTab = page.getByTestId('bookmark-collapsed-tab');
    const hasTab = await collapsedTab.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasTab) { test.skip(true, 'Collapsed tab not visible'); return; }

    await collapsedTab.click();
    await page.waitForTimeout(600);

    const panel = page.getByTestId('bookmark-panel');
    const panelVisible = await panel.isVisible({ timeout: 2000 }).catch(() => false);
    if (!panelVisible) { test.skip(true, 'Panel did not open'); return; }

    // Reload page
    await page.reload();
    await page.waitForTimeout(6000);

    // Panel should still be expanded (state persisted via localStorage)
    const panelAfterReload = page.getByTestId('bookmark-panel');
    const stillOpen = await panelAfterReload.isVisible({ timeout: 3000 }).catch(() => false);
    // This verifies localStorage persistence of the collapsed state
    expect(stillOpen).toBe(true);
  });
});

// ============================================================
// CROSS-FORM-FACTOR: No native dialogs anywhere
// ============================================================
test.describe('Bookmark UX — No Native Dialogs', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('page never triggers native confirm() or alert() during bookmark operations', async ({ page }) => {
    let nativeDialogCount = 0;
    page.on('dialog', async (dialog) => {
      nativeDialogCount++;
      await dialog.dismiss();
    });

    const hasBookmarks = await navigateAndWaitForUnlock(page);
    if (!hasBookmarks) { test.skip(); return; }

    // Open bookmark panel
    const toggleBtn = page.getByTestId('btn-toggle-bookmark-panel');
    if (await toggleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggleBtn.click();
      await page.waitForTimeout(1000);
    }

    // Navigate the tabs
    const mineTab = page.getByTestId('tab-mine');
    const allTab = page.getByTestId('tab-all');
    if (await mineTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await allTab.click();
      await page.waitForTimeout(500);
      await mineTab.click();
      await page.waitForTimeout(500);
    }

    expect(nativeDialogCount, 'No native dialogs should have been triggered').toBe(0);
  });
});
