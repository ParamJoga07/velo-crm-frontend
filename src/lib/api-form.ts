import { useAuthStore } from '@/stores/auth';
import { ApiClientError } from '@/lib/api';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function apiForm<T>(
  path: string,
  form: FormData,
  accessToken?: string | null,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: form,
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new ApiClientError(
      json.error?.code ?? 'HTTP_ERROR',
      json.error?.message ?? res.statusText,
      res.status,
    );
  }
  return json.data as T;
}

export function authDownloadUrl(path: string) {
  const token = useAuthStore.getState().accessToken;
  // Browser navigation can't set Authorization easily; use fetch blob helper instead.
  return { path, token };
}

export async function downloadWithAuth(path: string, fileName: string) {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
