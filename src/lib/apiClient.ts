// One typed fetch wrapper. Every page imports THIS instead of calling
// fetch() directly: one place to attach the login token, handle expired
// sessions and turn errors into friendly messages.

import type { ApiResult } from '@/types';

const BASE_URL = '/api'; // in dev, vite.config.ts forwards /api to the server on port 3000

export const TOKEN_KEY = 'roomlynk_token';
export const USER_KEY = 'roomlynk_user';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body }: RequestOptions = {}
): Promise<ApiResult<T>> {
  try {
    const token = localStorage.getItem(TOKEN_KEY);

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await response.json().catch(() => null);

    // 401 = missing/expired token. Clear it so the app sends the user to log in.
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return { ok: false, status: 401, error: json?.message ?? 'Session expired. Please log in again.' };
    }

    if (!response.ok) {
      // Our server always replies { message: "..." } on errors (see errorHandler.ts).
      return { ok: false, status: response.status, error: json?.message ?? `Request failed (${response.status})` };
    }

    return { ok: true, status: response.status, data: json as T };
  } catch {
    // fetch itself threw → the server is unreachable (offline, or not running).
    return { ok: false, error: 'Network error. Check your connection and try again.' };
  }
}
