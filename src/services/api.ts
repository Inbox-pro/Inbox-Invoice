import { useAuthStore } from '../stores/authStore.ts';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status = 500, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Mock mode (default): requests are served in the browser by mockApi.ts and
 * persisted to localStorage, so the app runs as a static site with no backend.
 * Set VITE_USE_MOCK_API=false to talk to the Express server (server.ts).
 */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';

async function transport(url: string, init: RequestInit): Promise<Response> {
  if (USE_MOCK_API) {
    const { mockFetch } = await import('./mockApi.ts');
    return mockFetch(url, init);
  }
  return fetch(url, init);
}

async function tryRefreshToken(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) return null;

  try {
    const res = await transport('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      logout();
      return null;
    }
    const json = await res.json();
    if (json?.success && json.data?.accessToken) {
      setTokens(json.data.accessToken, json.data.refreshToken);
      return json.data.accessToken as string;
    }
    logout();
    return null;
  } catch {
    logout();
    return null;
  }
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await transport(url, { ...options, headers });

  if (res.status === 401 && retry && !url.startsWith('/api/auth/')) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      return apiRequest<T>(url, options, false);
    }
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new ApiError(
        json?.error?.message || 'Request failed',
        res.status,
        json?.error?.code || 'REQUEST_FAILED',
        json?.error?.details
      );
    }
    return json as T;
  }

  if (!res.ok) {
    throw new ApiError(`Request failed with status ${res.status}`, res.status);
  }

  return (await res.text()) as unknown as T;
}

export const api = {
  get: <T>(url: string) => apiRequest<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: unknown) =>
    apiRequest<T>(url, {
      method: 'POST',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(url: string, body?: unknown) =>
    apiRequest<T>(url, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(url: string) => apiRequest<T>(url, { method: 'DELETE' }),
};
