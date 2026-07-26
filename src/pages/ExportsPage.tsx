import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { DataTable, TableSkeleton } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import {
  normalizeListEnvelope,
  useTablePagination,
  type ListEnvelope,
} from '@/hooks/useTablePagination';

type ExportJob = {
  id: string;
  entity: string;
  format: string;
  status: string;
  rowCount: number;
  outputFileS3Key: string | null;
  createdAt: string;
  filterSpec: Record<string, unknown>;
  initiatedBy: { id: string; name: string; email: string };
};

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function ExportsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [format, setFormat] = useState<'XLSX' | 'CSV'>('XLSX');
  const [stage, setStage] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { page, limit, setPage, setLimit } = useTablePagination(25);

  const query = useQuery({
    queryKey: ['exports', page, limit],
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    queryFn: async () => {
      const res = await apiFetch<ListEnvelope<ExportJob>>(
        `/api/exports?page=${page}&limit=${limit}`,
        { accessToken },
      );
      return normalizeListEnvelope(res);
    },
    refetchInterval: (q) => {
      const rows = q.state.data?.data ?? [];
      const busy = rows.some((r) =>
        ['PENDING', 'PROCESSING'].includes(r.status),
      );
      return busy ? 5000 : false;
    },
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch<ExportJob>('/api/exports', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          entity: 'LEADS',
          format,
          stage: stage || null,
          source: source || null,
        }),
      }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['exports'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const columns: ColumnDef<ExportJob>[] = [
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => new Date(String(getValue())).toLocaleString(),
    },
    { accessorKey: 'format', header: 'Format' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const s = String(getValue());
        const tone =
          s === 'COMPLETED' ? 'success' : s === 'FAILED' ? 'danger' : 'accent';
        return <Badge tone={tone}>{s}</Badge>;
      },
    },
    { accessorKey: 'rowCount', header: 'Rows' },
    {
      id: 'by',
      header: 'By',
      cell: ({ row }) => row.original.initiatedBy.name,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.status === 'COMPLETED' && row.original.outputFileS3Key ? (
          <a
            className="text-sm font-medium text-primary hover:underline"
            href={`${API_BASE}/api/exports/job/${row.original.id}/download`}
            onClick={async (e) => {
              e.preventDefault();
              const res = await fetch(
                `${API_BASE}/api/exports/job/${row.original.id}/download`,
                {
                  credentials: 'include',
                  headers: accessToken
                    ? { Authorization: `Bearer ${accessToken}` }
                    : {},
                },
              );
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `export.${row.original.format === 'CSV' ? 'csv' : 'xlsx'}`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download
          </a>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exports"
        description="Export scoped leads to Excel or CSV"
      />

      <section className="rounded-md border border-border bg-surface-raised p-4 shadow-panel">
        <h2 className="text-sm font-semibold text-navy">New export</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Format</Label>
            <select
              className="mt-1.5 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
              value={format}
              onChange={(e) => setFormat(e.target.value as 'XLSX' | 'CSV')}
            >
              <option value="XLSX">Excel (.xlsx)</option>
              <option value="CSV">CSV</option>
            </select>
          </div>
          <div>
            <Label>Stage filter</Label>
            <Input
              className="mt-1.5"
              placeholder="e.g. NEW"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            />
          </div>
          <div>
            <Label>Source filter</Label>
            <Input
              className="mt-1.5"
              placeholder="e.g. Facebook"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Starting…' : 'Start export'}
            </Button>
          </div>
        </div>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </section>

      {query.isLoading ? (
        <TableSkeleton />
      ) : (
        <DataTable
          columns={columns}
          data={query.data?.data ?? []}
          emptyMessage="No export jobs yet"
          pagination={{
            page,
            limit,
            total: query.data?.meta.total ?? 0,
            pageCount: query.data?.meta.pageCount,
            onPageChange: setPage,
            onLimitChange: setLimit,
            isFetching: query.isFetching,
          }}
        />
      )}
    </div>
  );
}
