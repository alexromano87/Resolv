import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

let sqliteAvailable = true;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('sqlite3');
} catch {
  sqliteAvailable = false;
}

describe('Smoke API (sqlite in-memory)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (!sqliteAvailable) return;
    // Usa SQLite in-memory per i test
    process.env.DB_USE_SQLITE = 'true';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (!sqliteAvailable) return;
    await app.close();
  });

  it('register + login should succeed', async () => {
    if (!sqliteAvailable) {
      return;
    }
    const email = `test${Date.now()}@example.com`;
    const password = 'Password123!';

    // Register
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password,
        nome: 'Test',
        cognome: 'User',
        ruolo: 'collaboratore',
      })
      .expect(201);

    expect(registerRes.body).toHaveProperty('access_token');
    expect(registerRes.body).toHaveProperty('refresh_token');

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    expect(loginRes.body).toHaveProperty('access_token');
    expect(loginRes.body).toHaveProperty('refresh_token');
  });
});
