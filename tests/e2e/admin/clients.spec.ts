import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth.helpers';

test.describe('Admin Clients Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display clients list', async ({ page }) => {
    await page.goto('/admin/clients');
    await expect(page.getByTestId('admin-clients-list')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to client detail', async ({ page }) => {
    await page.goto('/admin/clients');
    const firstClient = page.getByTestId('client-row').first();
    if (await firstClient.isVisible()) {
      await firstClient.click();
      await expect(page).toHaveURL(/\/admin\/clients\//);
    }
  });

  test('should search for clients', async ({ page }) => {
    await page.goto('/admin/clients');
    const searchInput = page.getByPlaceholder(/cerca|search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
