import { test, expect } from '@playwright/test';

test.describe('Flussi principali (backend reale)', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // Login using real backend authentication
    await page.goto('/');
    console.log('On login page');

    await page.getByLabel('Email').fill('g.iorlano@iorlanoepartners.it');
    await page.getByLabel('Password').fill('gerardo123');
    console.log('Filled credentials');

    await page.getByRole('button', { name: /Accedi alla piattaforma/i }).click();
    console.log('Clicked login button');

    // Wait a bit and check URL
    await page.waitForTimeout(3000);
    console.log('Current URL after login attempt:', page.url());

    // Wait for successful login (redirect to dashboard)
    await page.waitForURL(/\/(|dashboard)$/, { timeout: 15000 });
  });

  test('Login successful and dashboard accessible', async ({ page }) => {
    // Verify we're on dashboard after login
    await expect(page).toHaveURL(/\/(|dashboard)$/);

    // Check that we're not redirected back to login
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL(/login/);
  });

  test('Navigazione alle pagine principali', async ({ page }) => {
    // Test navigation to different pages without checking specific content
    // Just verify we don't get redirected to login

    const pages = ['/documenti', '/pratiche', '/tickets', '/alerts'];

    for (const path of pages) {
      await page.goto(path);
      await page.waitForTimeout(2000); // Wait for potential redirects

      // Verify we're not redirected to login (which would mean access denied)
      const currentUrl = page.url();
      console.log(`Navigated to ${path}, current URL: ${currentUrl}`);

      if (currentUrl.includes('/login')) {
        throw new Error(`Access denied to ${path} - redirected to login`);
      }
    }
  });
});
