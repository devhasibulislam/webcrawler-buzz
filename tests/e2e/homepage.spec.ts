import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads and displays the title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/WebCrawler\.buzz/);
  });

  test('has a crawl input form', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('input[type="url"], input[type="text"], input[placeholder*="url" i], input[placeholder*="domain" i]');
    await expect(input.first()).toBeVisible();
  });

  test('shows validation error for empty submit', async ({ page }) => {
    await page.goto('/');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Crawl"), button:has-text("Start")');
    if (await submitBtn.first().isVisible()) {
      await submitBtn.first().click();
      // Should not navigate away or should show an error
      await expect(page).toHaveURL('/');
    }
  });
});

test.describe('Static pages', () => {
  test('about page loads', async ({ page }) => {
    await page.goto('/about.html');
    await expect(page.locator('body')).toContainText(/about/i);
  });

  test('404 page loads for unknown routes', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-xyz');
    // Either shows 404 page or redirects to 404
    expect(response?.status()).toBe(404);
  });

  test('privacy policy page loads', async ({ page }) => {
    await page.goto('/privacy-policy.html');
    await expect(page.locator('body')).toContainText(/privacy/i);
  });
});

test.describe('API health', () => {
  test('health endpoint responds', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });
});
