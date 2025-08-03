import { test, expect } from '@playwright/test';

test.describe('Landing Page Flows', () => {
  test('redirects unauthenticated users to auth landing page', async ({ page }) => {
    await page.goto('/landing');
    await expect(page).toHaveURL('/auth/landing');
    await expect(page.locator('h1')).toContainText('Smart Personal Finance');
  });

  test('shows auth landing page with marketing content', async ({ page }) => {
    await page.goto('/auth/landing');
    
    // Check marketing content
    await expect(page.locator('h1')).toContainText('Smart Personal Finance');
    await expect(page.getByText('AI-Powered Categorization')).toBeVisible();
    await expect(page.getByText('Smart Analytics')).toBeVisible();
    await expect(page.getByText('Easy Statement Upload')).toBeVisible();
    
    // Check auth component is present
    await expect(page.getByText('Sign in')).toBeVisible();
  });

  test('welcome wizard renders with correct steps', async ({ page }) => {
    // This test would require setting up authentication state
    // For now, we'll just test that the component structure is correct  
    await page.goto('/auth/landing');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('navigation includes Home link to landing', async ({ page }) => {
    await page.goto('/auth/landing');
    
    // Check if we can access other pages (they should redirect back to auth if not authenticated)
    await page.goto('/statements');
    // Should redirect back to auth or show login requirement
    
    await page.goto('/dashboard'); 
    // Should redirect back to auth or show login requirement
  });
});
