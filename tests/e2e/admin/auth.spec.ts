import { test, expect } from '@playwright/test';

test.describe('Admin Authentication', () => {
  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should login as admin successfully', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL ?? '');
    await page.getByLabel(/password/i).fill(process.env.TEST_ADMIN_PASSWORD ?? '');
    await page.getByRole('button', { name: /accedi|login/i }).click();
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should prevent admin from accessing dealer routes', async ({ page }) => {
    const { loginAsAdmin } = await import('../helpers/auth.helpers');
    await loginAsAdmin(page);
    await page.goto('/portal/catalog');
    await expect(page).not.toHaveURL('/portal/catalog');
  });
});
