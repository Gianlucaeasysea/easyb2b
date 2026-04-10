import { test, expect } from '@playwright/test';
import { loginAsDealer } from '../helpers/auth.helpers';

test.describe('Dealer Orders', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDealer(page);
  });

  test('should display orders list', async ({ page }) => {
    await page.goto('/portal/orders');
    await expect(page.getByTestId('orders-list')).toBeVisible({ timeout: 10000 });
  });

  test('should show order detail when clicked', async ({ page }) => {
    await page.goto('/portal/orders');
    const firstOrder = page.getByTestId('order-row').first();
    if (await firstOrder.isVisible()) {
      await firstOrder.click();
      await expect(page.getByTestId('order-detail')).toBeVisible();
    }
  });

  test('should be able to submit a draft order', async ({ page }) => {
    await page.goto('/portal/orders');
    const draftOrder = page.getByTestId('order-row').filter({ hasText: /bozza/i }).first();
    if (await draftOrder.isVisible()) {
      await draftOrder.click();
      const submitButton = page.getByRole('button', { name: /invia ordine/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await expect(page.getByText(/ordine inviato/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
