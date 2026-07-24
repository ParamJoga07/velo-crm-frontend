import { z } from 'zod';

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ApiMetaSchema = z.object({
  requestId: z.string().optional(),
  cursor: z.string().nullable().optional(),
  hasMore: z.boolean().optional(),
  total: z.number().int().optional(),
});
export type ApiMeta = z.infer<typeof ApiMetaSchema>;

export type ApiEnvelope<T> = {
  data: T | null;
  meta: ApiMeta | null;
  error: ApiError | null;
};

export function ok<T>(data: T, meta: ApiMeta | null = null): ApiEnvelope<T> {
  return { data, meta, error: null };
}

export function fail(
  code: string,
  message: string,
  details?: unknown,
): ApiEnvelope<null> {
  return {
    data: null,
    meta: null,
    error: { code, message, details },
  };
}
