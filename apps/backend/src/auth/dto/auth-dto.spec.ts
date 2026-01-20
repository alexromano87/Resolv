import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';
import { RefreshTokenDto } from './refresh-token.dto';
import { TwoFactorLoginVerifyDto } from './two-factor.dto';

async function collectErrors<T>(DtoClass: new () => T, value: Partial<T>) {
  const instance = plainToInstance(DtoClass, value);
  const errors = await validate(instance);
  return errors.map((e) => e.property);
}

describe('Auth DTO validation', () => {
  it('richiede email valida e password lunga almeno 6 caratteri per il login', async () => {
    const errors = await collectErrors(LoginDto, { email: 'not-an-email', password: '123' });
    expect(errors).toEqual(expect.arrayContaining(['email', 'password']));

    const okErrors = await collectErrors(LoginDto, { email: 'user@example.com', password: 'securepw' });
    expect(okErrors).toHaveLength(0);
  });

  it('valida i dati di registrazione e impedisce caratteri speciali in nome/cognome', async () => {
    const errors = await collectErrors(RegisterDto, {
      email: 'invalid',
      password: 'short',
      nome: 'Mario!',
      cognome: 'Rossi@',
      ruolo: 'sconosciuto' as any,
      clienteId: 'not-a-uuid',
    });

    expect(errors).toEqual(expect.arrayContaining(['email', 'password', 'nome', 'cognome', 'ruolo', 'clienteId']));

    const okErrors = await collectErrors(RegisterDto, {
      email: 'valid@example.com',
      password: 'password123',
      nome: 'Mario',
      cognome: 'Rossi',
      ruolo: 'cliente',
    });
    expect(okErrors).toHaveLength(0);
  });

  it('richiede userId come UUID e refreshToken presente', async () => {
    const errors = await collectErrors(RefreshTokenDto, { userId: 'not-uuid', refreshToken: '' });
    expect(errors).toEqual(expect.arrayContaining(['userId']));

    const okErrors = await collectErrors(RefreshTokenDto, {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      refreshToken: 'refresh-token',
    });
    expect(okErrors).toHaveLength(0);
  });

  it('verifica che il codice 2FA abbia almeno 4 caratteri', async () => {
    const errors = await collectErrors(TwoFactorLoginVerifyDto, {
      userId: '',
      code: '12',
    });

    expect(errors).toEqual(expect.arrayContaining(['code']));

    const okErrors = await collectErrors(TwoFactorLoginVerifyDto, {
      userId: '33333333-3333-3333-3333-333333333333',
      code: '123456',
    });
    expect(okErrors).toHaveLength(0);
  });
});
