import { useCallback, useState } from 'react';

const DEFAULT_LIMIT = 25;

/** Shared page/limit state for server-paginated tables */
export function useTablePagination(initialLimit = DEFAULT_LIMIT) {
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(initialLimit);

  const setLimit = useCallback((next: number) => {
    setLimitState(next);
    setPage(1);
  }, []);

  const resetPage = useCallback(() => setPage(1), []);

  return {
    page,
    limit,
    setPage,
    setLimit,
    resetPage,
    /** Query string fragment: page=&limit= */
    params: { page: String(page), limit: String(limit) },
  };
}

export type ListEnvelope<T> = {
  data: T[];
  meta: {
    page?: number;
    limit?: number;
    total?: number;
    pageCount?: number;
    hasMore?: boolean;
    cursor?: string | null;
  };
  error?: null;
};

export function normalizeListEnvelope<T>(
  envelope: ListEnvelope<T> | T[],
): ListEnvelope<T> {
  if (Array.isArray(envelope)) {
    return {
      data: envelope,
      meta: {
        page: 1,
        limit: envelope.length,
        total: envelope.length,
        pageCount: 1,
        hasMore: false,
      },
    };
  }
  const data = Array.isArray(envelope.data) ? envelope.data : [];
  const total = envelope.meta?.total ?? data.length;
  const limit = envelope.meta?.limit ?? (data.length || 25);
  const page = envelope.meta?.page ?? 1;
  const pageCount =
    envelope.meta?.pageCount ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)) || 1);
  return {
    data,
    meta: {
      ...envelope.meta,
      page,
      limit,
      total,
      pageCount,
      hasMore: envelope.meta?.hasMore ?? page < pageCount,
    },
  };
}
