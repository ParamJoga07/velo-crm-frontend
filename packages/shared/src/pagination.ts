import { z } from 'zod';

export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  /** 1-based page. When set, offset pagination is used instead of cursor. */
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type CursorPagination = z.infer<typeof CursorPaginationSchema>;

export type ListMeta = {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
  hasMore: boolean;
  cursor: string | null;
};

export function resolveListWindow(p: CursorPagination): {
  limit: number;
  page: number;
  skip: number | undefined;
  cursorId: string | undefined;
  mode: 'page' | 'cursor';
} {
  const limit = p.limit;
  if (p.page != null) {
    return {
      limit,
      page: p.page,
      skip: (p.page - 1) * limit,
      cursorId: undefined,
      mode: 'page',
    };
  }
  return {
    limit,
    page: 1,
    skip: undefined,
    cursorId: p.cursor,
    mode: 'cursor',
  };
}

export function buildListMeta(args: {
  total: number;
  limit: number;
  page: number;
  fetched: number;
  /** Used for cursor mode when take was limit+1 */
  sliced?: unknown[];
  lastId?: string | null;
}): { dataLength: number; meta: ListMeta } {
  const pageCount = Math.max(1, Math.ceil(args.total / args.limit) || 1);
  const page = Math.min(Math.max(1, args.page), pageCount);

  if (args.sliced) {
    const hasMore = args.fetched > args.limit;
    const dataLength = hasMore ? args.limit : args.fetched;
    return {
      dataLength,
      meta: {
        page,
        limit: args.limit,
        total: args.total,
        pageCount,
        hasMore,
        cursor: hasMore ? args.lastId ?? null : null,
      },
    };
  }

  const hasMore = page * args.limit < args.total;
  return {
    dataLength: args.fetched,
    meta: {
      page,
      limit: args.limit,
      total: args.total,
      pageCount,
      hasMore,
      cursor: null,
    },
  };
}
