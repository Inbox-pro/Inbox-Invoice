import { create } from 'zustand';
import type { Company, User } from '../../shared/types.ts';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  setSession: (payload: {
    accessToken: string;
    refreshToken: string;
    user: User;
    company: Company;
  }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setCompany: (company: Company) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

// Security: Tokens are held strictly in memory (never written to localStorage or sessionStorage).
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  company: null,
  isAuthenticated: false,

  setSession: ({ accessToken, refreshToken, user, company }) =>
    set({
      accessToken,
      refreshToken,
      user,
      company,
      isAuthenticated: true,
    }),

  setTokens: (accessToken, refreshToken) =>
    set({
      accessToken,
      refreshToken,
    }),

  setCompany: (company) => set({ company }),

  setUser: (user) => set({ user }),

  logout: () =>
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      company: null,
      isAuthenticated: false,
    }),
}));
