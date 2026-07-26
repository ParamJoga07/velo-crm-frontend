import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';

/** Shared shell — matches User Management tables */
export const tableShellClass =
  'overflow-hidden rounded border border-border bg-surface-raised shadow-panel';

export const tableHeadClass =
  'border-b border-border bg-surface-muted text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground';

export const tableRowClass =
  'border-b border-border/70 last:border-0 hover:bg-surface-muted/60';

export const tableCellClass = 'px-3 py-2 align-middle';

type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
  title?: string;
  description?: string;
};

export function DataTable<T>({
  columns,
  data,
  emptyMessage = 'No records found',
  className,
  title,
  description,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={cn(tableShellClass, className)}>
      {title || description ? (
        <div className="border-b border-border px-3 py-2.5">
          {title ? (
            <p className="text-sm font-semibold text-navy">{title}</p>
          ) : null}
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-auto">
        <table className="w-full min-w-[560px] border-collapse text-table sm:min-w-[640px]">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className={tableHeadClass}>
                {hg.headers.map((header) => (
                  <th key={header.id} className={tableCellClass}>
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
