/**
 * Cliente HTTP do KTask — usado no client-side (browser).
 *
 * - Access token em memória (store Zustand).
 * - Refresh token em cookie httpOnly (API seta/limpa automaticamente).
 * - Intercepta 401, tenta refresh automático, reexecuta a request original.
 * - Deduplica requests de refresh simultâneos.
 * - Envia `credentials: include` para que o cookie de refresh vá em requests para a API.
 */

import { env } from './env';
import { useAuthStore } from '@/stores/auth-store';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(
      message ??
        (typeof body === 'object' && body && 'message' in body
          ? String((body as { message: unknown }).message)
          : `HTTP ${status}`),
    );
    this.status = status;
    this.body = body;
  }

  get fieldErrors(): Record<string, string[]> | null {
    if (typeof this.body === 'object' && this.body && 'errors' in this.body) {
      const errors = (this.body as { errors?: { fields?: Record<string, string[]> } }).errors;
      return errors?.fields ?? null;
    }
    return null;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  headers?: Record<string, string>;
  /** Se true, não tenta refresh em caso de 401. Usado no próprio /auth/refresh. */
  skipAuthRefresh?: boolean;
  /** Se true, não envia Authorization header. Usado em endpoints públicos. */
  skipAuth?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken: string };
      useAuthStore.getState().setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuthRefresh, skipAuth } = options;

  const url = path.startsWith('http') ? path : `${env.NEXT_PUBLIC_API_URL}${path}`;

  const token = skipAuth ? null : useAuthStore.getState().accessToken;

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !skipAuthRefresh && !skipAuth) {
    const newToken = await refreshToken();
    if (newToken) {
      // retry com novo token
      return apiFetch<T>(path, { ...options, skipAuthRefresh: true });
    }
    useAuthStore.getState().clear();
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type') ?? '';
  const parsed = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    throw new ApiError(res.status, parsed);
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => apiFetch<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'DELETE' }),
};
