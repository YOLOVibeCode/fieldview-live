/**
 * DVR E2E Tests
 * 
 * End-to-end tests for complete DVR workflow:
 * 1. Create bookmark
 * 2. View bookmarks list
 * 3. Create clip from bookmark
 * 4. View clip
 * 5. Share clip
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_URL || 'http://localhost:4301';
const WEB_BASE = process.env.WEB_URL || 'http://localhost:4300';

test.describe('DVR E2E Workflow', () => {
  let testGameId: string;
  let testViewerId: string;
  let testBookmarkId: string;
  let testClipId: string;

  test.beforeAll(async ({ request }) => {
    // Setup: Create test data via API
    // Create viewer
    const viewerRes = await request.post(`${API_BASE}/api/public/viewers`, {
      data: {
        email: `dvr-e2e-${Date.now()}@example.com`,
      },
    });
    const viewer = await viewerRes.json();
    testViewerId = viewer.id || viewer.viewerIdentity?.id;

    // Create owner and game
    const ownerRes = await request.post(`${API_BASE}/api/admin/owners`, {
      data: {
        type: 'owner',
        name: 'DVR E2E Test Owner',
        status: 'active',
        contactEmail: `dvr-e2e-owner-${Date.now()}@test.com`,
      },
    });
    const owner = await ownerRes.json();

    const gameRes = await request.post(`${API_BASE}/api/owners/games`, {
      data: {
        ownerAccountId: owner.id,
        title: 'DVR E2E Test Game',
        homeTeam: 'Home',
        awayTeam: 'Away',
        startsAt: new Date().toISOString(),
        priceCents: 499,
        keywordCode: `DVRE2E${Date.now()}`,
      },
    });
    const game = await gameRes.json();
    testGameId = game.id || game.game?.id;
  });

  test('Complete DVR workflow: bookmark → clip → view → share', async ({ page }) => {
    // Navigate to a page with DVR components (adjust URL as needed)
    await page.goto(`${WEB_BASE}/test/dvr?gameId=${testGameId}&viewerId=${testViewerId}`);

    // Step 1: Create a bookmark
    await test.step('Create bookmark', async () => {
      // Click bookmark button
      await page.click('[data-testid="btn-bookmark"]');

      // Fill in bookmark form
      await page.waitForSelector('[data-testid="modal-bookmark"]');
      await page.fill('[data-testid="input-bookmark-label"]', 'Amazing Goal at 2:00');
      await page.fill('[data-testid="input-bookmark-notes"]', 'Top corner shot, incredible!');
      await page.check('[data-testid="checkbox-bookmark-shared"]');

      // Submit
      await page.click('[data-testid="btn-submit-bookmark"]');

      // Wait for success (modal closes)
      await page.waitForSelector('[data-testid="modal-bookmark"]', { state: 'hidden' });
    });

    // Step 2: View bookmarks list
    await test.step('View bookmarks list', async () => {
      // Navigate to bookmarks section (or it might already be visible)
      const bookmarksList = page.locator('[data-testid="list-bookmarks"]');
      await expect(bookmarksList).toBeVisible();

      // Verify bookmark appears
      await expect(bookmarksList.getByText('Amazing Goal at 2:00')).toBeVisible();
      await expect(bookmarksList.getByText('Top corner shot, incredible!')).toBeVisible();
      await expect(bookmarksList.getByText('Public')).toBeVisible();
    });

    // Step 3: Create clip from bookmark
    await test.step('Create clip from bookmark', async () => {
      // Find the bookmark and click "Create Clip"
      const bookmark = page.locator('[data-testid^="bookmark-"]').first();
      await bookmark.locator('[data-testid^="btn-create-clip-"]').click();

      // Wait for clip creation (alert or success message)
      page.on('dialog', async (dialog) => {
        const message = dialog.message();
        expect(message).toContain('Clip created');
        
        // Extract clip ID from message
        const match = message.match(/ID: (.+)/);
        if (match) {
          testClipId = match[1];
        }
        
        await dialog.accept();
      });

      // Wait a bit for the clip to be created
      await page.waitForTimeout(1000);
    });

    // Step 4: View the clip
    await test.step('View clip', async () => {
      // Navigate to clip viewer page
      if (testClipId) {
        await page.goto(`${WEB_BASE}/clips/${testClipId}`);
      } else {
        // Fallback: click on clip from bookmarks list
        const bookmark = page.locator('[data-testid^="bookmark-"]').first();
        await expect(bookmark.getByText('✓ Clip created')).toBeVisible();
      }

      // Verify clip viewer loads
      const clipViewer = page.locator('[data-testid="clip-viewer"]');
      await expect(clipViewer).toBeVisible();

      // Verify video player
      const videoPlayer = page.locator('[data-testid="video-player"]');
      await expect(videoPlayer).toBeVisible();

      // Verify clip info
      await expect(page.getByText('Amazing Goal at 2:00')).toBeVisible();
    });

    // Step 5: Share the clip
    await test.step('Share clip', async () => {
      // Click share button
      await page.click('[data-testid="btn-share-clip"]');

      // Verify copied message
      await expect(page.getByText('✓ Copied!')).toBeVisible({ timeout: 2000 });

      // Verify clipboard (if supported in test environment)
      // Note: Clipboard API might not work in all test environments
    });
  });

  test('Create and manage multiple bookmarks', async ({ page }) => {
    await page.goto(`${WEB_BASE}/test/dvr?gameId=${testGameId}&viewerId=${testViewerId}`);

    // Create multiple bookmarks
    for (let i = 1; i <= 3; i++) {
      await page.click('[data-testid="btn-bookmark"]');
      await page.waitForSelector('[data-testid="modal-bookmark"]');
      await page.fill('[data-testid="input-bookmark-label"]', `Bookmark ${i}`);
      await page.click('[data-testid="btn-submit-bookmark"]');
      await page.waitForSelector('[data-testid="modal-bookmark"]', { state: 'hidden' });
      await page.waitForTimeout(500); // Small delay between creations
    }

    // Verify all bookmarks appear
    const bookmarksList = page.locator('[data-testid="list-bookmarks"]');
    await expect(bookmarksList).toBeVisible();
    
    for (let i = 1; i <= 3; i++) {
      await expect(bookmarksList.getByText(`Bookmark ${i}`)).toBeVisible();
    }

    // Delete a bookmark
    const firstBookmark = page.locator('[data-testid^="bookmark-"]').first();
    
    // Handle confirm dialog
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });

    await firstBookmark.locator('[data-testid^="btn-delete-"]').click();
    
    // Verify bookmark is removed
    await page.waitForTimeout(1000);
    const remainingBookmarks = await page.locator('[data-testid^="bookmark-"]').count();
    expect(remainingBookmarks).toBe(2);
  });

  test('Video player tracking', async ({ page }) => {
    // Create a clip first
    const response = await page.request.post(`${API_BASE}/api/clips`, {
      data: {
        gameId: testGameId,
        providerName: 'mock',
        recordingId: 'test-recording-e2e',
        title: 'Tracking Test Clip',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
        isPublic: true,
      },
    });
    const { clip } = await response.json();

    // Navigate to clip
    await page.goto(`${WEB_BASE}/clips/${clip.id}`);

    // Verify initial view count
    await expect(page.getByText('Views: 0')).toBeVisible();

    // Play the video
    const videoPlayer = page.locator('[data-testid="video-player"]');
    await videoPlayer.click(); // Play

    // Wait for view to be tracked
    await page.waitForTimeout(2000);

    // Reload page to see updated count
    await page.reload();
    
    // View count should have increased
    await expect(page.getByText('Views: 1')).toBeVisible();
  });

  test('Bookmark form validation', async ({ page }) => {
    await page.goto(`${WEB_BASE}/test/dvr?gameId=${testGameId}&viewerId=${testViewerId}`);

    // Open bookmark modal
    await page.click('[data-testid="btn-bookmark"]');
    await page.waitForSelector('[data-testid="modal-bookmark"]');

    // Try to submit without label
    await page.click('[data-testid="btn-submit-bookmark"]');

    // Form should not submit (HTML5 validation)
    const modal = page.locator('[data-testid="modal-bookmark"]');
    await expect(modal).toBeVisible();

    // Fill in valid data
    await page.fill('[data-testid="input-bookmark-label"]', 'Valid Bookmark');
    
    // Test max length
    const longLabel = 'A'.repeat(201);
    await page.fill('[data-testid="input-bookmark-label"]', longLabel);
    const labelValue = await page.inputValue('[data-testid="input-bookmark-label"]');
    expect(labelValue.length).toBeLessThanOrEqual(200);

    // Submit should work now
    await page.fill('[data-testid="input-bookmark-label"]', 'Valid Bookmark');
    await page.click('[data-testid="btn-submit-bookmark"]');
    await page.waitForSelector('[data-testid="modal-bookmark"]', { state: 'hidden' });
  });

  test('Empty state handling', async ({ page }) => {
    // Create a new viewer with no bookmarks
    const viewerRes = await page.request.post(`${API_BASE}/api/public/viewers`, {
      data: {
        email: `empty-state-${Date.now()}@example.com`,
      },
    });
    const viewer = await viewerRes.json();
    const newViewerId = viewer.id || viewer.viewerIdentity?.id;

    await page.goto(`${WEB_BASE}/test/dvr?gameId=${testGameId}&viewerId=${newViewerId}`);

    // Verify empty state
    const emptyState = page.locator('[data-testid="empty-bookmarks"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState.getByText('No bookmarks yet')).toBeVisible();
  });

  test('API error handling', async ({ page }) => {
    await page.goto(`${WEB_BASE}/test/dvr?gameId=${testGameId}&viewerId=invalid-id`);

    // Try to create a bookmark with invalid viewer ID
    await page.click('[data-testid="btn-bookmark"]');
    await page.waitForSelector('[data-testid="modal-bookmark"]');
    await page.fill('[data-testid="input-bookmark-label"]', 'Error Test');
    await page.click('[data-testid="btn-submit-bookmark"]');

    // Should show error message
    const errorMessage = page.locator('[data-testid="error-bookmark"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });
});

