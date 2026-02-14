/**
 * API client: all requests include user_id for MVP auth.
 * Base URL: relative in dev (Vite proxy), absolute when served from FastAPI.
 */
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') search.set(k, String(v));
  });
  const s = search.toString();
  return s ? `?${s}` : '';
}

export function apiUrl(path: string, params: Record<string, string | number | undefined> = {}): string {
  const prefix = path.startsWith('/') ? '' : '/';
  return `${API_BASE}/api/v1${prefix}${path}${qs(params)}`;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { userId: number; params?: Record<string, string | number | undefined> } = {} as any
): Promise<T> {
  const { userId, params = {}, ...init } = options as any;
  const url = apiUrl(path, { user_id: userId, ...params });
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(Array.isArray(err.detail) ? JSON.stringify(err.detail) : err.detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function apiGet<T>(path: string, userId: number, params?: Record<string, string | number | undefined>): Promise<T> {
  return apiFetch<T>(path, { method: 'GET', userId, params });
}

export function apiPost<T>(path: string, userId: number, body?: object, params?: Record<string, string | number | undefined>): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', userId, params, body: body ? JSON.stringify(body) : undefined });
}

export function apiPatch<T>(path: string, userId: number, body: object, params?: Record<string, string | number | undefined>): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', userId, params, body: JSON.stringify(body) });
}

export function apiDelete(path: string, userId: number, params?: Record<string, string | number | undefined>): Promise<void> {
  return apiFetch(path, { method: 'DELETE', userId, params });
}
