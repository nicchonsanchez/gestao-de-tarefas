import { create } from 'zustand';
import type { User } from '@ktask/contracts';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  initialized: boolean;
  setAccessToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setSession: (payload: { accessToken: string; user: User }) => void;
  clear: () => void;
  setInitialized: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  initialized: false,
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  setSession: ({ accessToken, user }) => set({ accessToken, user }),
  clear: () => set({ accessToken: null, user: null }),
  setInitialized: (value) => set({ initialized: value }),
}));
