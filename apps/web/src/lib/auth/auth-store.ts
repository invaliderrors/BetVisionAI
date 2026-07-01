// apps/web/src/lib/auth/auth-store.ts
// Client-only auth state. The access token itself lives in the in-memory token store; this
// store holds the derived session (user + status) that the UI reacts to. On load we attempt a
// single silent refresh so a page reload restores the session from the httpOnly cookie.
import { create } from 'zustand';
import type { AuthUser, Locale, LoginRequest, RegisterRequest } from '@betvision/contracts';
import { authApi, usersApi } from '../api';
import { setAccessToken, clearAccessToken } from '../api/token-store';

export type SessionStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  status: SessionStatus;
  /** Guards against running the silent-refresh bootstrap more than once. */
  bootstrapped: boolean;
  bootstrap: (locale?: string) => Promise<void>;
  login: (credentials: LoginRequest, locale?: string) => Promise<void>;
  register: (input: RegisterRequest, locale?: string) => Promise<void>;
  logout: (locale?: string) => Promise<void>;
  setUserLocale: (locale: Locale) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',
  bootstrapped: false,

  bootstrap: async (locale) => {
    if (get().bootstrapped) return;
    set({ bootstrapped: true });
    try {
      const { accessToken } = await authApi.refresh(locale);
      setAccessToken(accessToken);
      const profile = await usersApi.getMe(locale);
      set({
        user: {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          locale: profile.locale,
        },
        status: 'authenticated',
      });
    } catch {
      clearAccessToken();
      set({ user: null, status: 'unauthenticated' });
    }
  },

  login: async (credentials, locale) => {
    const res = await authApi.login(credentials, locale);
    setAccessToken(res.accessToken);
    set({ user: res.user, status: 'authenticated' });
  },

  register: async (input, locale) => {
    // Register returns the profile only (no token); immediately establish a session.
    await authApi.register(input, locale);
    const res = await authApi.login(
      { email: input.email, password: input.password },
      locale,
    );
    setAccessToken(res.accessToken);
    set({ user: res.user, status: 'authenticated' });
  },

  logout: async (locale) => {
    try {
      await authApi.logout(locale);
    } finally {
      clearAccessToken();
      set({ user: null, status: 'unauthenticated' });
    }
  },

  setUserLocale: (locale) => {
    const user = get().user;
    if (user) set({ user: { ...user, locale } });
  },
}));
