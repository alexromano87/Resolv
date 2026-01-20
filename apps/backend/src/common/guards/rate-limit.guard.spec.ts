import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { RateLimitGuard } from '../rate-limit.guard';
import { Reflector } from '@nestjs/core';

const createContext = (request: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext);

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  const request = { ip: '127.0.0.1', method: 'GET', url: '/tickets' };
  const reflector = {
    get: jest.fn().mockReturnValue(undefined),
  } as unknown as Reflector;

  beforeEach(() => {
    jest.clearAllMocks();
    (reflector.get as jest.Mock).mockReturnValue(undefined);
    guard = new RateLimitGuard(reflector);
  });

  it('consente la chiamata iniziale', () => {
    expect(guard.canActivate(createContext(request))).toBe(true);
  });

  it('blocca quando si supera la soglia in finestra', () => {
    const context = createContext(request);
    const limit = (guard as any).defaultLimit ?? 60;
    for (let i = 0; i < limit; i++) {
      guard.canActivate(context);
    }
    expect(() => guard.canActivate(context)).toThrow();
  });

  it('reimposta il contatore dopo il timeout', () => {
    const key = `${request.ip}:${request.method}:${request.url}`;
    const context = createContext(request);
    const limit = (guard as any).defaultLimit ?? 60;
    const store = (guard as any).store as Map<string, any>;
    store.set(key, { count: limit, resetAt: Date.now() - 1 });

    expect(guard.canActivate(context)).toBe(true);
    const entry = store.get(key);
    expect(entry.count).toBe(1);
  });
});
