import type { ApiEnvelope } from '@velo/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type AuthRefresh = () => Promise<string | null>;
let authRefresh: AuthRefresh | null = null;

/** Register once from the auth store so 401s can silently refresh. */
export function registerAuthRefresh(fn: AuthRefresh) {
  authRefresh = fn;
}

function isPaginatedEnvelope(
  json: unknown,
): json is { data: unknown; meta: Record<string, unknown>; error: unknown } {
  if (!json || typeof json !== 'object') return false;
  const obj = json as Record<string, unknown>;
  if (!('data' in obj) || !('meta' in obj) || !('error' in obj)) return false;
  const meta = obj.meta;
  if (!meta || typeof meta !== 'object') return false;
  const m = meta as Record<string, unknown>;
  return 'cursor' in m || 'hasMore' in m || 'total' in m || 'unread' in m;
}

function isAuthPath(path: string) {
  return (
    path.includes('/api/auth/login') ||
    path.includes('/api/auth/refresh') ||
    path.includes('/api/auth/logout')
  );
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & {
    accessToken?: string | null;
    /** Internal: already retried after refresh */
    _authRetry?: boolean;
  } = {},
): Promise<T> {
  const { accessToken, headers, _authRetry, ...rest } = init;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || json.error) {
    if (
      res.status === 401 &&
      !_authRetry &&
      authRefresh &&
      !isAuthPath(path)
    ) {
      const nextToken = await authRefresh();
      if (nextToken) {
        return apiFetch<T>(path, {
          ...init,
          accessToken: nextToken,
          _authRetry: true,
        });
      }
    }
    throw new ApiClientError(
      json.error?.code ?? 'HTTP_ERROR',
      json.error?.message ?? res.statusText,
      res.status,
    );
  }

  if (isPaginatedEnvelope(json)) {
    return json as T;
  }

  return json.data as T;
}
