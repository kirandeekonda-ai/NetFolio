import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/NetFolio/);
});

test('has upload heading', async ({ page }) => {
  await page.goto('/');

  // Expects the page to have the correct heading.
  await expect(page.getByRole('heading', { name: 'Upload Bank Statement' })).toBeVisible();
});
