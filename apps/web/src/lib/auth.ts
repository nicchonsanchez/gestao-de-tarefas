import type { LoginRequest, LoginResponse, User } from '@ktask/contracts';
import { api } from './api-client';
import { useAuthStore } from '@/stores/auth-store';

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const data = await api.post<LoginResponse>('/api/v1/auth/login', credentials, {
    skipAuth: true,
    skipAuthRefresh: true,
  });
  useAuthStore.getState().setSession({ accessToken: data.accessToken, user: data.user as User });
  return data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/v1/auth/logout', undefined, { skipAuthRefresh: true });
  } finally {
    useAuthStore.getState().clear();
  }
}

export async function fetchMe(): Promise<User> {
  return api.get<User>('/api/v1/auth/me');
}

/**
 * Inicializa a sessão: tenta refresh via cookie. Se OK, busca /me.
 * Chamada uma vez no bootstrap do app.
 */
export async function bootstrapSession(): Promise<User | null> {
  const store = useAuthStore.getState();
  if (store.initialized && store.user) return store.user;

  try {
    const refreshRes = await api.post<{ accessToken: string; user: User }>(
      '/api/v1/auth/refresh',
      undefined,
      { skipAuth: true, skipAuthRefresh: true },
    );
    useAuthStore.getState().setSession({
      accessToken: refreshRes.accessToken,
      user: refreshRes.user as User,
    });
    useAuthStore.getState().setInitialized(true);
    return refreshRes.user as User;
  } catch {
    useAuthStore.getState().clear();
    useAuthStore.getState().setInitialized(true);
    return null;
  }
}
