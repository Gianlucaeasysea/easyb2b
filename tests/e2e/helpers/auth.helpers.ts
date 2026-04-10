import { Page } from '@playwright/test';

export async function loginAsDealer(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(process.env.TEST_DEALER_EMAIL ?? '');
  await page.getByLabel(/password/i).fill(process.env.TEST_DEALER_PASSWORD ?? '');
  await page.getByRole('button', { name: /accedi|login/i }).click();
  await page.waitForURL('/portal/**', { timeout: 10000 });
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL ?? '');
  await page.getByLabel(/password/i).fill(process.env.TEST_ADMIN_PASSWORD ?? '');
  await page.getByRole('button', { name: /accedi|login/i }).click();
  await page.waitForURL('/admin/**', { timeout: 10000 });
}

export async function loginAsSales(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(process.env.TEST_SALES_EMAIL ?? '');
  await page.getByLabel(/password/i).fill(process.env.TEST_SALES_PASSWORD ?? '');
  await page.getByRole('button', { name: /accedi|login/i }).click();
  await page.waitForURL('/crm/**', { timeout: 10000 });
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /profilo|account|logout/i }).first().click();
  await page.getByRole('menuitem', { name: /logout|esci/i }).click();
  await page.waitForURL('/login', { timeout: 5000 });
}
