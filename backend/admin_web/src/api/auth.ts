import { authApi } from '@/api/api';

const DEFAULT_CREDENTIALS: Array<{ email: string; password: string }> = [
  // Backend default (see backend/app/core/db.py init_default_admin_user)
  { email: 'Admin@localhost', password: 'admin123' },
  // Legacy/demo
  { email: 'admin@example.com', password: 'admin123' },
];

export const authService = {
  async autoLogin(): Promise<boolean> {
    // If a token already exists, validate it first.
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      try {
        await authApi.verify();
        return true;
      } catch {
        localStorage.removeItem('token');
      }
    }

    // Otherwise try default credentials (dev convenience)
    for (const cred of DEFAULT_CREDENTIALS) {
      try {
        const resp = await authApi.login(cred);
        localStorage.setItem('token', resp.access_token);
        return true;
      } catch {
        // continue
      }
    }

    return false;
  },
};



