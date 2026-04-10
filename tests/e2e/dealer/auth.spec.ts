import { test, expect } from '@playwright/test';

test.describe('Dealer Authentication', () => {
  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/portal/catalog');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_DEALER_EMAIL ?? '');
    await page.getByLabel(/password/i).fill(process.env.TEST_DEALER_PASSWORD ?? '');
    await page.getByRole('button', { name: /accedi|login/i }).click();
    await expect(page).toHaveURL(/\/portal/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('wrong@email.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /accedi|login/i }).click();
    await expect(page.getByText(/credenziali|non valide|errore/i)).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    const { loginAsDealer, logout } = await import('../helpers/auth.helpers');
    await loginAsDealer(page);
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('should prevent dealer from accessing admin routes', async ({ page }) => {
    const { loginAsDealer } = await import('../helpers/auth.helpers');
    await loginAsDealer(page);
    await page.goto('/admin/clients');
    await expect(page).not.toHaveURL('/admin/clients');
  });
});
