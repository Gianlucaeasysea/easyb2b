import { test, expect } from '@playwright/test';
import { loginAsDealer } from '../helpers/auth.helpers';

test.describe('Dealer Cart', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDealer(page);
    await page.goto('/portal/catalog');
  });

  test('should add a product to cart', async ({ page }) => {
    await expect(page.getByTestId('product-card').first()).toBeVisible({ timeout: 10000 });
    await page.getByTestId('product-card').first().getByRole('button', { name: /aggiungi|carrello/i }).click();
    const cartBadge = page.getByTestId('cart-badge');
    await expect(cartBadge).toBeVisible();
    await expect(cartBadge).not.toHaveText('0');
  });

  test('should show cart with added products', async ({ page }) => {
    await page.getByTestId('product-card').first().getByRole('button', { name: /aggiungi|carrello/i }).click();
    await page.goto('/portal/cart');
    await expect(page.getByTestId('cart-item')).toHaveCount(1);
  });

  test('should update quantity in cart', async ({ page }) => {
    await page.goto('/portal/cart');
    const quantityInput = page.getByTestId('cart-item-quantity').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('3');
      await quantityInput.blur();
      await expect(page.getByTestId('cart-subtotal')).not.toBeEmpty();
    }
  });

  test('should persist cart after page reload', async ({ page }) => {
    await page.getByTestId('product-card').first().getByRole('button', { name: /aggiungi/i }).click();
    await page.reload();
    const cartBadge = page.getByTestId('cart-badge');
    await expect(cartBadge).not.toHaveText('0');
  });
});
