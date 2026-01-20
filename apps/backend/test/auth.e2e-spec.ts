process.env.DB_USE_SQLITE = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { RateLimitGuard } from '../src/common/guards/rate-limit.guard';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/users/user.entity';
import { Cliente } from '../src/clienti/cliente.entity';
import { EmailService } from '../src/notifications/email.service';


class InMemoryUserRepository {
  private readonly storage: Partial<User>[] = [];

  create(partial: Partial<User>) {
    return { ...partial };
  }

  async save(entity: Partial<User>) {
    if (!entity.id) {
      entity.id = `user-${this.storage.length + 1}`;
    }

    if (entity.attivo === undefined) {
      entity.attivo = true;
    }

    const existingIndex = this.storage.findIndex((item) => item.id === entity.id);
    if (existingIndex >= 0) {
      this.storage[existingIndex] = { ...this.storage[existingIndex], ...entity };
      return this.storage[existingIndex];
    }

    this.storage.push(entity);
    return entity;
  }

  async findOne(options: any) {
    const where = options?.where || {};
    return this.storage.find((item) => {
      if (where.id && item.id !== where.id) return false;
      if (where.email && item.email !== where.email) return false;
      if (where.attivo !== undefined && item.attivo !== where.attivo) return false;
      return true;
    }) ?? null;
  }

  async update(id: string, changes: Partial<User>) {
    const target = this.storage.find((item) => item.id === id);
    if (!target) return { affected: 0 };
    Object.assign(target, changes);
    return { affected: 1 };
  }

  async increment(criteria: { id: string }, field: string, value: number) {
    const target = this.storage.find((item) => item.id === criteria.id);
    if (!target) return { affected: 0 };
    target[field] = (target[field as keyof User] as unknown as number ?? 0) + value;
    return { affected: 1 };
  }

  createQueryBuilder() {
    let filters: Record<string, any> = {};

    const builder = {
      addSelect: () => builder,
      where: (_clause: string, params: Record<string, any>) => {
        filters = { ...filters, ...params };
        return builder;
      },
      orWhere: (_clause: string, params: Record<string, any>) => {
        filters = { ...filters, ...params };
        return builder;
      },
      getOne: async () => {
        return this.storage.find((item) => {
          return Object.entries(filters).every(([key, value]) => {
            return (item as any)[key] === value;
          });
        }) ?? null;
      },
    };

    return builder;
  }
}

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let authController: AuthController;
  let userRepo: InMemoryUserRepository;

  const registerAndLogin = async (email: string) => {
    const payload = {
      email,
      password: 'TopSecret!234',
      nome: 'E2E',
      cognome: 'User',
      ruolo: 'collaboratore',
    };

    await authController.register(payload);

    const loginResponse = await authController.login({
      email: payload.email,
      password: payload.password,
    });

    return {
      accessToken: loginResponse.access_token,
      refreshToken: loginResponse.refresh_token,
      userId: loginResponse.user.id,
    };
  };

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    const clienteRepoMock = {
      createQueryBuilder: () => ({
        where: () => ({ orWhere: () => ({ getOne: async () => null }) }),
      }),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PassportModule,
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        RateLimitGuard,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(Cliente),
          useValue: clienteRepoMock,
        },
        {
          provide: EmailService,
          useValue: { sendEmail: jest.fn() },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    authController = moduleFixture.get(AuthController);
  });

  afterEach(async () => {
    await app.close();
  });

  it('permette la registrazione/login e ottiene il profilo', async () => {
    const { accessToken, userId: createdUserId } = await registerAndLogin('end2end@example.com');

    const profileResponse = await authController.getProfile(createdUserId);
    expect(profileResponse.email).toBe('end2end@example.com');
    expect(profileResponse.id).toBe(createdUserId);
  });

  it('riceve refresh token valido dopo il login', async () => {
    const { userId, refreshToken } = await registerAndLogin('refresh@example.com');

    const refreshResponse = await authController.refresh({ userId, refreshToken });
    expect(refreshResponse).toHaveProperty('access_token');
    expect(refreshResponse.user.id).toBe(userId);

    await expect(
      authController.login({ email: 'unknown@example.com', password: 'wrong' }),
    ).rejects.toThrow();
  });
  it('abilita la password reset per un utente registrato', async () => {
    const payload = {
      email: 'reset@example.com',
      password: 'AnotherSecret123!',
      nome: 'Reset',
      cognome: 'User',
      ruolo: 'collaboratore',
    };

    await authController.register(payload);
    await authController.requestPasswordReset({ email: payload.email });
  });
});
