import { test, expect } from '@playwright/test';
import { loginAsSales } from '../helpers/auth.helpers';

test.describe('CRM Leads Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSales(page);
  });

  test('should display leads list', async ({ page }) => {
    await page.goto('/crm/leads');
    await expect(page.getByTestId('leads-list')).toBeVisible({ timeout: 10000 });
  });

  test('should open lead detail panel', async ({ page }) => {
    await page.goto('/crm/leads');
    const firstLead = page.getByTestId('lead-row').first();
    if (await firstLead.isVisible()) {
      await firstLead.click();
      await expect(page.getByTestId('lead-detail')).toBeVisible();
    }
  });
});
