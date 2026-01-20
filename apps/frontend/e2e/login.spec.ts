import { test, expect } from '@playwright/test';

test.describe('Login flow (mocked backend)', () => {
  test('effettua login e mostra dashboard', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-token',
          refresh_token: 'refresh-token',
          user: {
            id: 'u1',
            nome: 'Mario',
            cognome: 'Rossi',
            ruolo: 'admin',
            email: 'admin@example.com',
          },
        }),
      });
    });

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u1',
          nome: 'Mario',
          cognome: 'Rossi',
          ruolo: 'admin',
          email: 'admin@example.com',
        }),
      });
    });

    await page.goto('/');

    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('Password123');
    await page.getByRole('button', { name: /Accedi alla piattaforma/i }).click();

    await expect(page.getByText(/Benvenuto/i)).toBeVisible();
  });
});
