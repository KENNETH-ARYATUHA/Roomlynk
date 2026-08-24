// One typed fetch wrapper. Every page imports THIS instead of calling
// fetch() directly — one place to attach the JWT, handle expired sessions,
// and normalise errors, instead of repeating try/catch everywhere.

import type { ApiResult } from '@/types';

const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('roomlynk_token');
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body }: RequestOptions = {}
): Promise<ApiResult<T>> {
  try {
    const token = getToken();

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // 401 = expired/revoked JWT. Clear it so the route guard (Step 6)
    // redirects to login on the next render instead of looping failed calls.
    if (response.status === 401) {
      localStorage.removeItem('roomlynk_token');
      localStorage.removeItem('roomlynk_user');
      return { ok: false, error: 'Session expired. Please log in again.' };
    }

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      return { ok: false, error: json?.message ?? `Request failed (${response.status})` };
    }

    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: 'Network error. Check your connection and try again.' };
  }
}