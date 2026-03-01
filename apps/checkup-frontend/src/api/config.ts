const API_BASE = import.meta.env.VITE_API_URL || '/api';
export const apiBase = API_BASE;

const DEFAULT_TIMEOUT_MS = 20000;

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  skipAuthRedirect?: boolean;
  timeoutMs?: number;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, skipAuthRedirect, timeoutMs, ...fetchOptions } = options;

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const token = localStorage.getItem('checkup_token');
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (let browser set it with boundary)
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

  if (response.status === 401) {
    localStorage.removeItem('checkup_token');
    localStorage.removeItem('checkup_user');
    if (!skipAuthRedirect) {
      window.location.href = '/checkup/login';
    }
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

  return response.json();
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
