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

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { accessToken?: string | null } = {},
): Promise<T> {
  const { accessToken, headers, ...rest } = init;
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
    throw new ApiClientError(
      json.error?.code ?? 'HTTP_ERROR',
      json.error?.message ?? res.statusText,
      res.status,
    );
  }

  // Keep paginated { data, meta, error } intact so history tables get rows + totals
  if (isPaginatedEnvelope(json)) {
    return json as T;
  }

  return json.data as T;
}
