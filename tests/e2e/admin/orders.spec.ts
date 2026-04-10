import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth.helpers';

test.describe('Admin Orders Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display admin orders list', async ({ page }) => {
    await page.goto('/admin/orders');
    await expect(page.getByTestId('admin-orders-list')).toBeVisible({ timeout: 10000 });
  });

  test('should filter orders by status', async ({ page }) => {
    await page.goto('/admin/orders');
    await page.getByRole('button', { name: /inviato|submitted/i }).click();
    const orders = page.getByTestId('order-row');
    const count = await orders.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      await expect(orders.nth(i)).toContainText(/inviato/i);
    }
  });
});
