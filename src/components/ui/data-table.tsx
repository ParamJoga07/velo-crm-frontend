import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/** Shared shell — matches User Management tables */
export const tableShellClass =
  'flex min-h-0 flex-col overflow-hidden rounded border border-border bg-surface-raised shadow-panel';

export const tableHeadClass =
  'border-b border-border bg-surface-muted text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground';

export const tableRowClass =
  'border-b border-border/70 last:border-0 hover:bg-surface-muted/60';

export const tableCellClass = 'px-3 py-2 align-middle';

export type TablePagination = {
  page: number;
  limit: number;
  total: number;
  pageCount?: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  isFetching?: boolean;
};

type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
  title?: string;
  description?: string;
  pagination?: TablePagination;
  /** Scroll body under sticky header. Default fits typical CRM viewport. */
  maxHeightClass?: string;
};

export function DataTable<T>({
  columns,
  data,
  emptyMessage = 'No records found',
  className,
  title,
  description,
  pagination,
  maxHeightClass = 'max-h-[min(58vh,calc(100dvh-15rem))] md:max-h-[calc(100dvh-14rem)]',
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const total = pagination?.total ?? data.length;
  const page = pagination?.page ?? 1;
  const limit = pagination?.limit ?? (data.length || 25);
  const pageCount =
    pagination?.pageCount ??
    Math.max(1, Math.ceil(total / Math.max(limit, 1)) || 1);
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className={cn(tableShellClass, className)}>
      {title || description ? (
        <div className="shrink-0 border-b border-border px-3 py-2.5">
          {title ? (
            <p className="text-sm font-semibold text-navy">{title}</p>
          ) : null}
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          'min-h-0 flex-1 overflow-auto',
          maxHeightClass,
          pagination?.isFetching ? 'opacity-70 transition-opacity' : '',
        )}
      >
        <table className="w-full min-w-[560px] border-collapse text-table sm:min-w-[640px]">
          <thead className="sticky top-0 z-20">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className={tableHeadClass}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      tableCellClass,
                      'bg-surface-muted shadow-[inset_0_-1px_0_var(--color-border)]',
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className={tableRowClass}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={tableCellClass}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination ? (
        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-surface-muted/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {total === 0
              ? 'No rows'
              : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {pagination.onLimitChange ? (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Rows
                <select
                  className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-navy"
                  value={limit}
                  onChange={(e) =>
                    pagination.onLimitChange?.(Number(e.target.value))
                  }
                >
                  {(pagination.pageSizeOptions ?? [10, 25, 50, 100]).map(
                    (n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ),
                  )}
                </select>
              </label>
            ) : null}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 px-2"
                disabled={page <= 1 || pagination.isFetching}
                onClick={() => pagination.onPageChange(page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[4.5rem] text-center text-xs font-medium text-navy">
                {page} / {pageCount}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 px-2"
                disabled={page >= pageCount || pagination.isFetching}
                onClick={() => pagination.onPageChange(page + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className={cn(tableShellClass, 'space-y-2 p-3')}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-8 animate-pulse rounded bg-surface-muted"
          style={{ animationDelay: `${i * 40}ms` }}
        />
      ))}
    </div>
  );
}
