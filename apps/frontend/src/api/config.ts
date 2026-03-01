// src/api/config.ts
// Configurazione centralizzata per le API

const metaEnv = typeof import.meta !== 'undefined' ? ((import.meta as any).env || {}) : {};
const nodeEnv = typeof process !== 'undefined' ? process.env || {} : {};
const env = { ...nodeEnv, ...metaEnv };

// Helper per leggere una variabile env in modo sicuro anche in contesti non Vite/DOM (es. Playwright)
const getEnv = (key: string) => env[key] || env[`VITE_${key}`];

function getApiBaseUrl(): string {
  // 1. Se definito in .env, usa quello (priorità massima)
  const explicit = getEnv('VITE_API_URL') || getEnv('API_URL');
  if (explicit) {
    if (typeof window !== 'undefined' && explicit.startsWith('/')) {
      return `${window.location.origin}${explicit}`;
    }
    // If someone left :3000 in production, normalize to /api on the same host.
    if (typeof window !== 'undefined' && explicit.startsWith('http')) {
      try {
        const explicitUrl = new URL(explicit);
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        if (explicitUrl.hostname === hostname && explicitUrl.port === '3000') {
          return `${protocol}//${hostname}/api`;
        }
      } catch {
        // ignore invalid URL
      }
    }
    return explicit;
  }

  // In contesti senza window (test E2E o SSR) torna un fallback sicuro
  if (typeof window === 'undefined') {
    return 'http://localhost:3000';
  }

  // 2. Rileva automaticamente in base all'hostname
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Localhost / Development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }

  // Production - API is served behind the same host under /api
  // For custom domains or overrides, use VITE_API_URL in .env
  return `${protocol}//${hostname}/api`;
}

export const API_BASE_URL = getApiBaseUrl();
const DEFAULT_TIMEOUT_MS = 20000;

// Debug: mostra in console quale URL viene usato (solo in development)
if (metaEnv.DEV) {
  console.log('🔧 API Base URL:', API_BASE_URL);
  console.log('🌍 Environment:', metaEnv.MODE);
}

/**
 * Classe per errori API con status code
 */
export class ApiError extends Error {
  public status: number;
  public data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Client HTTP centralizzato per tutte le chiamate API
 */
class ApiClient {
  private baseUrl = API_BASE_URL;

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async fetchWithTimeout(input: RequestInfo, init: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(408, 'Tempo di risposta scaduto. Riprova tra qualche istante.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `Errore ${response.status}`;
      let errorData: unknown = null;
      const isTimeout = response.status === 408 || response.status === 504;

      // Errori del server (5xx)
      if (response.status >= 500) {
        throw new ApiError(
          response.status,
          isTimeout ? 'Tempo di risposta scaduto. Riprova tra qualche istante.' : 'Il server non è al momento disponibile. Riprova più tardi.',
          errorData,
        );
      }

      const raw = await response.text().catch(() => '');
      const contentType = response.headers.get('content-type') || '';

      if (raw && contentType.includes('application/json')) {
        try {
          errorData = JSON.parse(raw);
          if (typeof errorData === 'object' && errorData !== null) {
            const err = errorData as { message?: string | string[] };
            if (Array.isArray(err.message)) {
              errorMessage = err.message.join(', ');
            } else if (err.message) {
              errorMessage = err.message;
            }
          }
        } catch {
          // fallback a testo semplice
          errorMessage = raw;
        }
      } else if (raw) {
        errorMessage = raw;
      }

      if (isTimeout && (!errorMessage || errorMessage === `Errore ${response.status}`)) {
        errorMessage = 'Tempo di risposta scaduto. Riprova tra qualche istante.';
      }
      throw new ApiError(response.status, errorMessage, errorData);
    }

    // Se 204 No Content, ritorna null
    if (response.status === 204) {
      return null as T;
    }

    const contentType = response.headers.get('content-type') || '';
    const rawBody = await response.text().catch(() => '');

    if (!rawBody || rawBody.trim() === '') {
      return null as T;
    }

    if (contentType.includes('application/json')) {
      try {
        return JSON.parse(rawBody);
      } catch (error) {
        console.warn('Failed to parse JSON response:', error);
        return null as T;
      }
    }

    // Se non è JSON, restituisci il testo grezzo
    return rawBody as unknown as T;
  }

  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    try {
      const response = await this.fetchWithTimeout(url.toString(), {
        headers: this.getHeaders(),
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      // Errore di rete (server non raggiungibile, timeout, ecc.)
      if (error instanceof TypeError || (error as any).name === 'NetworkError') {
        throw new ApiError(
          0,
          'Impossibile contattare il server. Verifica la connessione o riprova più tardi.',
        );
      }
      throw error;
    }
  }

  async post<T>(path: string, data?: unknown): Promise<T> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      // Errore di rete (server non raggiungibile, timeout, ecc.)
      if (error instanceof TypeError || (error as any).name === 'NetworkError') {
        throw new ApiError(
          0,
          'Impossibile contattare il server. Verifica la connessione o riprova più tardi.',
        );
      }
      throw error;
    }
  }

  async put<T>(path: string, data?: unknown): Promise<T> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      // Errore di rete (server non raggiungibile, timeout, ecc.)
      if (error instanceof TypeError || (error as any).name === 'NetworkError') {
        throw new ApiError(
          0,
          'Impossibile contattare il server. Verifica la connessione o riprova più tardi.',
        );
      }
      throw error;
    }
  }

  async patch<T>(path: string, data?: unknown): Promise<T> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      // Errore di rete (server non raggiungibile, timeout, ecc.)
      if (error instanceof TypeError || (error as any).name === 'NetworkError') {
        throw new ApiError(
          0,
          'Impossibile contattare il server. Verifica la connessione o riprova più tardi.',
        );
      }
      throw error;
    }
  }

  async delete<T>(path: string): Promise<T> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      // Errore di rete (server non raggiungibile, timeout, ecc.)
      if (error instanceof TypeError || (error as any).name === 'NetworkError') {
        throw new ApiError(
          0,
          'Impossibile contattare il server. Verifica la connessione o riprova più tardi.',
        );
      }
      throw error;
    }
  }
}

// Istanza singleton
export const api = new ApiClient();
