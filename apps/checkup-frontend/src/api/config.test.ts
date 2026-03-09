import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setAccessToken, setLogoutCallback, api } from './config';

// ---------------------------------------------------------------------------
// Minimal fetch mock helpers
// ---------------------------------------------------------------------------

type FetchMockResponse = {
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
  blob?: () => Promise<Blob>;
};

function mockFetch(responses: FetchMockResponse[]) {
  let callIndex = 0;
  return vi.fn(async () => {
    const res = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return {
      ok: res.ok,
      status: res.status,
      json: res.json ?? (async () => ({})),
      blob: res.blob ?? (async () => new Blob()),
    };
  });
}

describe('api config', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    setAccessToken(null);
    setLogoutCallback(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('aggiunge header Authorization se accessToken è presente', async () => {
    setAccessToken('my-token');

    const capturedHeaders: Record<string, string>[] = [];
    globalThis.fetch = vi.fn(async (_url: unknown, opts: unknown) => {
      capturedHeaders.push((opts as RequestInit).headers as Record<string, string>);
      return { ok: true, status: 200, json: async () => ({ ok: true }) } as any;
    }) as any;

    await api.get('/checkup/test');

    expect(capturedHeaders[0]['Authorization']).toBe('Bearer my-token');
  });

  it('non aggiunge header Authorization se accessToken è null', async () => {
    setAccessToken(null);

    const capturedHeaders: Record<string, string>[] = [];
    globalThis.fetch = vi.fn(async (_url: unknown, opts: unknown) => {
      capturedHeaders.push((opts as RequestInit).headers as Record<string, string>);
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    await api.get('/checkup/test');

    expect(capturedHeaders[0]['Authorization']).toBeUndefined();
  });

  it('imposta Content-Type application/json di default', async () => {
    setAccessToken(null);
    const capturedHeaders: Record<string, string>[] = [];
    globalThis.fetch = vi.fn(async (_url: unknown, opts: unknown) => {
      capturedHeaders.push((opts as RequestInit).headers as Record<string, string>);
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    await api.post('/checkup/test', { name: 'value' });

    expect(capturedHeaders[0]['Content-Type']).toBe('application/json');
  });

  it('lancia errore con messaggio se risposta non ok', async () => {
    globalThis.fetch = mockFetch([
      { ok: false, status: 400, json: async () => ({ message: 'Bad request' }) },
    ]) as any;

    await expect(api.get('/checkup/test')).rejects.toThrow('Bad request');
  });

  it('lancia errore generico se response è 500 senza messaggio', async () => {
    globalThis.fetch = mockFetch([
      { ok: false, status: 500, json: async () => ({}) },
    ]) as any;

    await expect(api.get('/checkup/test')).rejects.toThrow('Errore 500');
  });

  it('chiama logout se il refresh fallisce su 401', async () => {
    const logoutFn = vi.fn();
    setLogoutCallback(logoutFn);
    setAccessToken('expired-token');

    // First call: 401 (original request)
    // Second call (refresh): also fails → triggers logout
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) }) as any;

    await expect(api.get('/checkup/test', undefined, { skipAuthRedirect: false })).rejects.toThrow();

    expect(logoutFn).toHaveBeenCalledTimes(1);
  });

  it('riprova la richiesta originale con nuovo token dopo refresh 401', async () => {
    setAccessToken('old-token');

    const callUrls: string[] = [];
    globalThis.fetch = vi.fn(async (url: unknown) => {
      const urlStr = String(url);
      callUrls.push(urlStr);

      if (urlStr.includes('/auth/refresh')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'new-token' }) };
      }
      if (callUrls.filter((u) => !u.includes('refresh')).length === 1) {
        // First real request → 401
        return { ok: false, status: 401, json: async () => ({}) };
      }
      // Retry → success
      return { ok: true, status: 200, json: async () => ({ data: 'ok' }) };
    }) as any;

    const result = await api.get<{ data: string }>('/checkup/test');
    expect(result.data).toBe('ok');

    const nonRefreshCalls = callUrls.filter((u) => !u.includes('refresh'));
    expect(nonRefreshCalls).toHaveLength(2); // original + retry
  });
});
