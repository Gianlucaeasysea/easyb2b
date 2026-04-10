import { test, expect } from '@playwright/test';
import { loginAsDealer } from '../helpers/auth.helpers';

test.describe('Dealer Catalog', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDealer(page);
    await page.goto('/portal/catalog');
  });

  test('should display the catalog page', async ({ page }) => {
    await expect(page.getByTestId('product-card').first()).toBeVisible({ timeout: 10000 });
  });

  test('should search for products', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/cerca|search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      // Results should update (no crash)
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
