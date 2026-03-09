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

const preassessment = {
  id: 'pa-1',
  clientId: 'client-99',
  status: 'in_corso',
  completedAt: null,
  studioCanEdit: true,
  data: {},
  notes: {},
  fieldNotes: {},
  userFieldNotes: {},
  naFields: {},
  macroValidations: {},
  sectionValidations: {},
  fieldMeta: {},
  finalValidation: null,
};

const mockStructure = {
  sections: [
    {
      id: 'sec-a1',
      macro: 'a',
      title: 'Dati Generali',
      description: 'Informazioni generali',
      fields: [
        { id: 'f-1', label: 'Ragione Sociale', type: 'text', required: true },
        { id: 'f-2', label: 'Codice Fiscale', type: 'text', required: true },
      ],
    },
    {
      id: 'sec-a2',
      macro: 'a',
      title: 'Sede Legale',
      description: 'Sede legale',
      fields: [
        { id: 'f-3', label: 'Indirizzo', type: 'text', required: false },
      ],
    },
  ],
  macroAreas: [
    { id: 'a', label: 'Anagrafica' },
  ],
};

function setupCommonRoutes(page: ReturnType<typeof test['info']>['page'] extends never ? never : Parameters<Parameters<typeof test>[1]>[0]['page']) {
  return Promise.all([
    page.route('**/api/checkup/auth/refresh', (r) =>
      r.fulfill({ json: { access_token: 'tok-admin' } })),
    page.route('**/api/checkup/auth/profile', (r) =>
      r.fulfill({ json: adminUser })),
    page.route('**/api/checkup/me/system-notifications**', (r) =>
      r.fulfill({ json: { items: [], total: 0, page: 1, limit: 6, totalPages: 1 } })),
    page.route('**/api/checkup/preassessment/pa-1', (r) =>
      r.fulfill({ json: preassessment })),
    page.route('**/api/checkup/preassessment/pa-1/structure**', (r) =>
      r.fulfill({ json: mockStructure })),
    page.route('**/api/checkup/preassessment/pa-1/documents**', (r) =>
      r.fulfill({ json: [] })),
    page.route('**/api/checkup/threads/unread**', (r) =>
      r.fulfill({ json: { tickets: 0, alerts: 0 } })),
    page.route('**/api/checkup/clients/client-99**', (r) =>
      r.fulfill({
        json: {
          client: { id: 'client-99', ragioneSociale: 'Azienda Test Srl', nome: 'Mario', cognome: 'Rossi' },
          preassessment,
        },
      })),
  ]);
}

test.describe('Navigazione preassessment (admin_studio)', () => {
  test('carica la pagina preassessment per un cliente specifico', async ({ page }) => {
    await setupCommonRoutes(page);

    await page.goto('/checkup/clienti/client-99');

    // Should show client name or section list
    await expect(page.getByText(/Azienda Test Srl|Dati Generali/i)).toBeVisible({ timeout: 10_000 });
  });

  test('la sidebar mostra le sezioni della struttura', async ({ page }) => {
    await setupCommonRoutes(page);

    await page.goto('/checkup/clienti/client-99');

    await expect(page.getByText('Dati Generali')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Sede Legale')).toBeVisible();
  });

  test('navigare tra sezioni non causa errori JS', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupCommonRoutes(page);

    await page.goto('/checkup/clienti/client-99');
    await page.waitForTimeout(1000);

    // Click on second section if visible
    const sedeLegaleLink = page.getByText('Sede Legale');
    if (await sedeLegaleLink.isVisible()) {
      await sedeLegaleLink.click();
      await page.waitForTimeout(500);
    }

    expect(jsErrors).toHaveLength(0);
  });
});

test.describe('Dashboard studio (admin_studio)', () => {
  test('carica la dashboard senza errori', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await page.route('**/api/checkup/auth/refresh', (r) =>
      r.fulfill({ json: { access_token: 'tok-admin' } }));
    await page.route('**/api/checkup/auth/profile', (r) =>
      r.fulfill({ json: adminUser }));
    await page.route('**/api/checkup/me/system-notifications**', (r) =>
      r.fulfill({ json: { items: [], total: 0, page: 1, limit: 6, totalPages: 1 } }));
    await page.route('**/api/checkup/preassessments**', (r) =>
      r.fulfill({ json: { items: [], total: 0, page: 1, limit: 20, totalPages: 1 } }));
    await page.route('**/api/checkup/clients**', (r) =>
      r.fulfill({ json: { items: [], total: 0, page: 1, limit: 20, totalPages: 1 } }));

    await page.goto('/checkup/dashboard-studio');

    // Should see dashboard content (heading or some content area)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    expect(jsErrors).toHaveLength(0);
  });

  test('la ricerca clienti è raggiungibile', async ({ page }) => {
    await page.route('**/api/checkup/auth/refresh', (r) =>
      r.fulfill({ json: { access_token: 'tok-admin' } }));
    await page.route('**/api/checkup/auth/profile', (r) =>
      r.fulfill({ json: adminUser }));
    await page.route('**/api/checkup/me/system-notifications**', (r) =>
      r.fulfill({ json: { items: [], total: 0, page: 1, limit: 6, totalPages: 1 } }));
    await page.route('**/api/checkup/clients**', (r) =>
      r.fulfill({ json: { items: [], total: 0, page: 1, limit: 20, totalPages: 1 } }));

    await page.goto('/checkup/clienti');
    await expect(page.getByRole('heading', { name: /clienti/i })).toBeVisible({ timeout: 10_000 });
  });
});
