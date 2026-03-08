import { test, expect } from '@playwright/test';

const user = {
  id: 'u1',
  email: 'admin@test.it',
  nome: 'Admin',
  cognome: 'Studio',
  ruolo: 'admin_studio',
  studioId: 'studio-1',
  studioNome: 'Studio Test',
  azienda: null,
  mustChangePassword: false,
};

test.describe('Notifiche di sistema', () => {
  test('non carica nulla finche non clicco Cerca', async ({ page }) => {
    let pageNotificationCalls = 0;

    await page.route('**/api/checkup/auth/refresh', async (route) => {
      await route.fulfill({ json: { access_token: 'token-test' } });
    });
    await page.route('**/api/checkup/auth/profile', async (route) => {
      await route.fulfill({ json: user });
    });
    await page.route('**/api/checkup/me/system-notifications**', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('limit') === '6') {
        await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 6, totalPages: 1 } });
        return;
      }
      pageNotificationCalls += 1;
      await route.fulfill({
        json: {
          items: [
            {
              id: 'notif-1',
              type: 'checkup_completato',
              title: 'Checkup completato',
              message: 'Cliente Test ha completato il checkup',
              createdAt: '2026-03-08T10:00:00.000Z',
              actorName: 'Mario Rossi',
              clientName: 'Cliente Test',
              priority: 'normal',
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
    });

    await page.goto('/checkup/notifiche-sistema');
    await expect(page.getByText('Imposta i filtri desiderati e premi Cerca per caricare le notifiche.')).toBeVisible();
    expect(pageNotificationCalls).toBe(0);

    await page.getByRole('button', { name: 'Cerca' }).click();
    await expect(page.getByRole('heading', { name: 'Checkup completato' })).toBeVisible();
    expect(pageNotificationCalls).toBe(1);
  });

  test('prefila query e tipo dal deep link ma non esegue fetch automatica', async ({ page }) => {
    let lastUrl = '';
    let pageNotificationCalls = 0;

    await page.route('**/api/checkup/auth/refresh', async (route) => {
      await route.fulfill({ json: { access_token: 'token-test' } });
    });
    await page.route('**/api/checkup/auth/profile', async (route) => {
      await route.fulfill({ json: user });
    });
    await page.route('**/api/checkup/me/system-notifications**', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('limit') === '6') {
        await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 6, totalPages: 1 } });
        return;
      }
      pageNotificationCalls += 1;
      lastUrl = route.request().url();
      await route.fulfill({ json: { items: [], total: 0, page: 1, limit: 20, totalPages: 1 } });
    });

    await page.goto('/checkup/notifiche-sistema?notificationId=notif-99&query=cliente%20demo&type=sezione_validata');
    await expect(page.getByPlaceholder('Cerca cliente, messaggio o autore')).toHaveValue('cliente demo');
    expect(pageNotificationCalls).toBe(0);

    await page.getByRole('button', { name: 'Cerca' }).click();
    await expect.poll(() => pageNotificationCalls).toBe(1);
    expect(lastUrl).toContain('query=cliente+demo');
    expect(lastUrl).toContain('type=sezione_validata');
    expect(lastUrl).toContain('notificationId=notif-99');
  });
});
