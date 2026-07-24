import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, TableSkeleton } from '@/components/ui/data-table';
import { apiFetch } from '@/lib/api';
import { downloadWithAuth } from '@/lib/api-form';
import { useAuthStore } from '@/stores/auth';

type ImportRow = {
  id: string;
  createdAt: string;
  fileName: string;
  status: string;
  totalLeads: number;
  existingLeads: number;
  errorLeads: number;
  uploadedLeads: number;
  allowReEngage: boolean;
  campaignName: string | null;
  assignedToNames: string[];
  initiatedBy: { name: string; email: string };
  outputFileS3Key: string | null;
};

const TITLE: Record<string, string> = {
  leads: 'Import Leads',
  site_visits: 'Import Site Visits',
  followups: 'Import Follow-ups',
};

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'UPLOADED') return 'success';
  if (status === 'ERROR') return 'danger';
  if (['PROCESSING', 'PARSING', 'AWAITING_MAPPING', 'PENDING'].includes(status))
    return 'warning';
  return 'neutral';
}

export function ImportHistoryPage() {
  const { type = 'leads' } = useParams();
  const apiType = type.toUpperCase().replace('-', '_');
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const query = useQuery({
    queryKey: ['imports', apiType, statusFilter],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      const res = await apiFetch<{
        data: ImportRow[];
        meta: { total?: number; hasMore?: boolean };
        error: null;
      }>(`/api/imports/${apiType}?${qs.toString()}`, { accessToken });

      if (Array.isArray(res)) {
        return {
          data: res as unknown as ImportRow[],
          meta: { total: (res as unknown as ImportRow[]).length },
        };
      }
      if (res && Array.isArray(res.data)) {
        return { data: res.data, meta: res.meta ?? { total: res.data.length } };
      }
      return { data: [] as ImportRow[], meta: { total: 0 } };
    },
    refetchInterval: 4000,
  });

  const rerun = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/imports/job/${id}/rerun`, {
        method: 'POST',
        accessToken,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imports', apiType] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/imports/job/${id}`, {
        method: 'DELETE',
        accessToken,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imports', apiType] }),
  });

  const columns = useMemo<ColumnDef<ImportRow>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Upload Date',
        cell: ({ getValue }) =>
          new Date(String(getValue())).toLocaleString(),
      },
      {
        id: 'counts',
        header: 'Detailed Leads Count',
        cell: ({ row }) => (
          <div className="space-y-0.5 text-[12px] leading-snug">
            <div>Total Leads: {row.original.totalLeads}</div>
            <div>Existing Leads: {row.original.existingLeads}</div>
            <div>Leads With Errors: {row.original.errorLeads}</div>
            <div>Uploaded Leads: {row.original.uploadedLeads}</div>
            <div>Campaign: {row.original.campaignName ?? '—'}</div>
          </div>
        ),
      },
      {
        id: 'initiatedBy',
        header: 'Initiated By',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.initiatedBy.name}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.initiatedBy.email}
            </div>
          </div>
        ),
      },
      {
        id: 'assignedTo',
        header: 'Assigned To',
        cell: ({ row }) =>
          row.original.assignedToNames.length
            ? row.original.assignedToNames.join(', ')
            : '—',
      },
      {
        id: 'files',
        header: 'Files',
        cell: ({ row }) => (
          <div className="space-y-1 text-xs">
            <button
              type="button"
              className="block text-primary hover:underline"
              onClick={() =>
                downloadWithAuth(
                  `/api/imports/job/${row.original.id}/files/import`,
                  row.original.fileName,
                )
              }
            >
              Import File
            </button>
            {row.original.outputFileS3Key ? (
              <button
                type="button"
                className="block text-primary hover:underline"
                onClick={() =>
                  downloadWithAuth(
                    `/api/imports/job/${row.original.id}/files/output`,
                    `output-${row.original.fileName}.xlsx`,
                  )
                }
              >
                Output File
              </button>
            ) : (
              <span className="text-muted-foreground">Output: N/A</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge tone={statusTone(String(getValue()))}>
            {String(getValue())}
          </Badge>
        ),
      },
      {
        accessorKey: 'allowReEngage',
        header: 'Allow to Re-engage',
        cell: ({ getValue }) => (getValue() ? 'Yes' : 'No'),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="relative">
            <details className="group">
              <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded hover:bg-surface-muted">
                <MoreHorizontal className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 z-20 mt-1 w-40 rounded-md border border-border bg-surface-raised p-1 shadow-crm">
                <button
                  type="button"
                  className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-surface-muted"
                  onClick={() => rerun.mutate(row.original.id)}
                >
                  Re-run
                </button>
                <button
                  type="button"
                  className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-surface-muted"
                  disabled={!row.original.outputFileS3Key}
                  onClick={() =>
                    downloadWithAuth(
                      `/api/imports/job/${row.original.id}/files/output`,
                      `output-${row.original.fileName}.xlsx`,
                    )
                  }
                >
                  Download output
                </button>
                <button
                  type="button"
                  className="block w-full rounded px-2 py-1.5 text-left text-xs text-danger hover:bg-surface-muted"
                  onClick={() => {
                    if (confirm('Delete this import job?')) {
                      remove.mutate(row.original.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </details>
          </div>
        ),
      },
    ],
    [remove, rerun],
  );

  const rows = query.data?.data ?? [];
  const total = query.data?.meta?.total ?? rows.length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={TITLE[type] ?? 'Imports'}
        description={`${total} items`}
        actions={
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border border-border bg-surface-raised px-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="UPLOADED">Uploaded</option>
              <option value="PROCESSING">Processing</option>
              <option value="ERROR">Error</option>
            </select>
            <Button asChild>
              <Link to={`/admin/imports/${type}/new`}>
                <Plus className="h-4 w-4" />
                New Upload
              </Link>
            </Button>
          </div>
        }
      />
      <div className="text-xs">
        <Link to="/admin/imports" className="text-primary hover:underline">
          ← Back to Imports
        </Link>
      </div>
      {query.isLoading ? (
        <TableSkeleton />
      ) : (
        <DataTable columns={columns} data={rows} emptyMessage="No imports yet" />
      )}
    </div>
  );
}
