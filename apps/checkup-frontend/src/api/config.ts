const API_BASE = import.meta.env.VITE_API_URL || '/api';
export const apiBase = API_BASE;

const DEFAULT_TIMEOUT_MS = 20000;

// ── In-memory access token store ─────────────────────────────────────────────
// Access token intentionally stays only in memory to reduce XSS exfiltration risk.
// Session restore on page reload relies on the httpOnly refresh cookie.
let _accessToken: string | null = null;
let _logoutCallback: (() => void) | null = null;

/** Called by AuthContext on login/refresh to update the in-memory token. */
export function setAccessToken(token: string | null) {
  _accessToken = token;
}

/** Returns the current in-memory access token (use for raw fetch calls that bypass the api helper). */
export function getAccessToken(): string | null {
  return _accessToken;
}

/** Called by AuthContext to register the logout handler for 401 recovery. */
export function setLogoutCallback(fn: () => void) {
  _logoutCallback = fn;
}

// ── Refresh lock: prevents parallel 401 → refresh → retry storms ─────────────
let _refreshing: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  if (_refreshing) return _refreshing;

  _refreshing = (async () => {
    try {
      const res = await fetch(`${API_BASE}/checkup/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // sends httpOnly refresh cookie automatically
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      _accessToken = data.access_token;
      return data.access_token as string;
    } catch {
      return null;
    } finally {
      _refreshing = null;
    }
  })();

  return _refreshing;
}

// ── Core request function ─────────────────────────────────────────────────────

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  skipAuthRedirect?: boolean;
  timeoutMs?: number;
  _isRetry?: boolean; // internal flag — prevents infinite retry loops
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, skipAuthRedirect, timeoutMs, _isRetry, ...fetchOptions } = options;

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Tempo di risposta scaduto. Riprova tra qualche istante.');
    }
    if (error instanceof TypeError || (error as any)?.name === 'NetworkError') {
      throw new Error('Impossibile contattare il server. Verifica la connessione o riprova più tardi.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  // ── 401 handling: try refresh once, then retry ────────────────────────────
  if (response.status === 401 && !skipAuthRedirect && !_isRetry) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      // Retry original request with new access token
      return request<T>(endpoint, { ...options, _isRetry: true });
    }
    // Refresh failed → logout and redirect
    if (_logoutCallback) _logoutCallback();
    else {
      window.location.href = '/checkup/login';
    }
    throw new Error('Sessione scaduta. Effettua nuovamente il login.');
  }

  if (response.status === 401 && (skipAuthRedirect || _isRetry)) {
    throw new Error('Credenziali non valide');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Errore di rete' }));
    const isTimeout = response.status === 408 || response.status === 504;
    const fallbackMessage = isTimeout
      ? 'Tempo di risposta scaduto. Riprova tra qualche istante.'
      : `Errore ${response.status}`;
    throw new Error(error.message || fallbackMessage);
  }

  if (
    response.status === 204 ||
    response.status === 205 ||
    response.headers?.get?.('Content-Length') === '0'
  ) {
    return undefined as T;
  }

  return response.json();
}

/** Come request() ma ritorna un Blob — per endpoint PDF/download. */
export async function requestBlob(endpoint: string, options: RequestOptions = {}): Promise<Blob> {
  const { params, skipAuthRedirect, timeoutMs, _isRetry, ...fetchOptions } = options;

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { ...fetchOptions, headers, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Tempo di risposta scaduto. Riprova tra qualche istante.');
    }
    if (error instanceof TypeError || (error as any)?.name === 'NetworkError') {
      throw new Error('Impossibile contattare il server. Verifica la connessione o riprova più tardi.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  // 401: prova refresh una volta, poi logout
  if (response.status === 401 && !skipAuthRedirect && !_isRetry) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      return requestBlob(endpoint, { ...options, _isRetry: true });
    }
    if (_logoutCallback) _logoutCallback();
    else {
      window.location.href = '/checkup/login';
    }
    throw new Error('Sessione scaduta. Effettua nuovamente il login.');
  }

  if (response.status === 401 && (skipAuthRedirect || _isRetry)) {
    throw new Error('Credenziali non valide');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Errore di rete' }));
    const isTimeout = response.status === 408 || response.status === 504;
    throw new Error(error.message || (isTimeout ? 'Tempo di risposta scaduto. Riprova tra qualche istante.' : `Errore ${response.status}`));
  }

  return response.blob();
}

export async function requestBlobWithFilename(
  endpoint: string,
  options: RequestOptions = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const { params, skipAuthRedirect, timeoutMs, _isRetry, ...fetchOptions } = options;

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { ...fetchOptions, headers, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Tempo di risposta scaduto. Riprova tra qualche istante.');
    }
    if (error instanceof TypeError || (error as any)?.name === 'NetworkError') {
      throw new Error('Impossibile contattare il server. Verifica la connessione o riprova più tardi.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401 && !skipAuthRedirect && !_isRetry) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      return requestBlobWithFilename(endpoint, { ...options, _isRetry: true });
    }
    if (_logoutCallback) _logoutCallback();
    else {
      window.location.href = '/checkup/login';
    }
    throw new Error('Sessione scaduta. Effettua nuovamente il login.');
  }

  if (response.status === 401 && (skipAuthRedirect || _isRetry)) {
    throw new Error('Credenziali non valide');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Errore di rete' }));
    const isTimeout = response.status === 408 || response.status === 504;
    throw new Error(error.message || (isTimeout ? 'Tempo di risposta scaduto. Riprova tra qualche istante.' : `Errore ${response.status}`));
  }

  const contentDisposition = response.headers.get('Content-Disposition') || response.headers.get('content-disposition');
  const filenameMatch = contentDisposition?.match(/filename=\"?([^\";]+)\"?/i);
  const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : null;

  return {
    blob: await response.blob(),
    filename,
  };
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'GET', params, ...options }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),
};
