import { test, expect } from '@playwright/test';

const adminUser = {
  id: 'u1',
  email: 'admin@studio.it',
  nome: 'Admin',
  cognome: 'Studio',
  ruolo: 'admin_studio',
  studioId: 'studio-1',
  studioNome: 'Studio Test',
  azienda: null,
  mustChangePassword: false,
};

const clienteUser = {
  id: 'u2',
  email: 'cliente@azienda.it',
  nome: 'Mario',
  cognome: 'Rossi',
  ruolo: 'cliente',
  studioId: 'studio-1',
  studioNome: 'Studio Test',
  clientId: 'client-99',
  azienda: 'Azienda Test Srl',
  mustChangePassword: false,
};

test.describe('Login page', () => {
  test('mostra il form di login e blocchi marketing', async ({ page }) => {
    await page.goto('/checkup/login');

    await expect(page.getByRole('heading', { name: /benvenuto/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /accedi/i })).toBeVisible();
  });

  test('mostra errore con credenziali sbagliate', async ({ page }) => {
    await page.route('**/api/checkup/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        json: { message: 'Credenziali non valide' },
      });
    });

    await page.goto('/checkup/login');
    await page.getByRole('textbox', { name: /email/i }).fill('wrong@test.it');
    await page.getByLabel(/password/i).first().fill('wrongpass');
    await page.getByRole('button', { name: /accedi/i }).click();

    await expect(page.getByText(/credenziali non valide/i)).toBeVisible();
  });

  test('admin viene reindirizzato alla dashboard dopo login', async ({ page }) => {
    await page.route('**/api/checkup/auth/login', async (route) => {
      await route.fulfill({ json: { access_token: 'tok-admin', user: adminUser } });
    });
    await page.route('**/api/checkup/auth/profile', async (route) => {
      await route.fulfill({ json: adminUser });
    });
    await page.route('**/api/checkup/auth/refresh', async (route) => {
      await route.fulfill({ json: { access_token: 'tok-admin' } });
    });
    // Intercept dashboard API calls
    await page.route('**/api/checkup/me/system-notifications**', async (route) => {
      await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 6, totalPages: 1 } });
    });

    await page.goto('/checkup/login');
    await page.getByRole('textbox', { name: /email/i }).fill('admin@studio.it');
    await page.getByLabel(/password/i).first().fill('password123');
    await page.getByRole('button', { name: /accedi/i }).click();

    await expect(page).toHaveURL(/dashboard-studio/);
  });

  test('il cliente viene reindirizzato alla pagina preassessment dopo login', async ({ page }) => {
    await page.route('**/api/checkup/auth/login', async (route) => {
      await route.fulfill({ json: { access_token: 'tok-client', user: clienteUser } });
    });
    await page.route('**/api/checkup/auth/profile', async (route) => {
      await route.fulfill({ json: clienteUser });
    });
    await page.route('**/api/checkup/auth/refresh', async (route) => {
      await route.fulfill({ json: { access_token: 'tok-client' } });
    });
    // Intercept preassessment loading
    await page.route('**/api/checkup/preassessment/my', async (route) => {
      await route.fulfill({
        json: {
          id: 'pa-1',
          status: 'in_corso',
          clientId: 'client-99',
          completedAt: null,
        },
      });
    });
    await page.route('**/api/checkup/me/system-notifications**', async (route) => {
      await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 6, totalPages: 1 } });
    });
    await page.route('**/api/checkup/threads/unread**', async (route) => {
      await route.fulfill({ json: { tickets: 0, alerts: 0 } });
    });

    await page.goto('/checkup/login');
    await page.getByRole('textbox', { name: /email/i }).fill('cliente@azienda.it');
    await page.getByLabel(/password/i).first().fill('password123');
    await page.getByRole('button', { name: /accedi/i }).click();

    // Cliente goes to /checkup/ (root)
    await expect(page).toHaveURL(/\/checkup\//);
  });

  test('la pagina 2FA viene mostrata dopo il primo step', async ({ page }) => {
    await page.route('**/api/checkup/auth/login', async (route) => {
      await route.fulfill({
        json: { userId: 'u1', channel: 'email' },
      });
    });

    await page.goto('/checkup/login');
    await page.getByRole('textbox', { name: /email/i }).fill('admin@studio.it');
    await page.getByLabel(/password/i).first().fill('password123');
    await page.getByRole('button', { name: /accedi/i }).click();

    // 2FA step should appear
    await expect(page.getByRole('heading', { name: /verifica/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /codice/i })).toBeVisible();
  });

  test('utente già autenticato viene reindirizzato senza toccare il form', async ({ page }) => {
    await page.route('**/api/checkup/auth/refresh', async (route) => {
      await route.fulfill({ json: { access_token: 'tok-admin' } });
    });
    await page.route('**/api/checkup/auth/profile', async (route) => {
      await route.fulfill({ json: adminUser });
    });
    await page.route('**/api/checkup/me/system-notifications**', async (route) => {
      await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 6, totalPages: 1 } });
    });

    await page.goto('/checkup/login');

    // Should be redirected away from login
    await expect(page).toHaveURL(/dashboard-studio|\/checkup\//);
  });
});
