import { create } from 'zustand';
import { api } from '../api/api';
import type { User } from '../types/api';

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithCode: (email: string, code: string) => Promise<void>;
  register: (email: string, password: string, code: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;

  // Reset
  reset: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  // Check authentication on mount
  checkAuth: async () => {
    const token = api.getToken();
    if (token) {
      try {
        const userData = await api.verifyToken();
        set({
          user: userData.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // Token is invalid, clear it
        api.setToken(null);
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } else {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  // Login with email and password
  login: async (email: string, password: string) => {
    const response = await api.loginWithPassword({ email, password });
    set({
      user: response.user,
      isAuthenticated: true,
    });
  },

  // Login with email and verification code
  loginWithCode: async (email: string, code: string) => {
    const response = await api.loginWithCode({ email, verification_code: code });
    set({
      user: response.user,
      isAuthenticated: true,
    });
  },

  // Register new user
  register: async (email: string, password: string, code: string) => {
    const response = await api.register({ email, password, verification_code: code });
    set({
      user: response.user,
      isAuthenticated: true,
    });
  },

  // Logout
  logout: () => {
    api.setToken(null);
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  // Refresh user data
  refreshUser: async () => {
    const userData = await api.verifyToken();
    set({
      user: userData.user,
      isAuthenticated: true,
    });
  },

  // Reset
  reset: () => {
    set(initialState);
  },
}));
