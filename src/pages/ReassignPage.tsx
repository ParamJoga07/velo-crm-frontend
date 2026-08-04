import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { LeadStageBadge } from '@/components/LeadStatusBadges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { DataTable, TableSkeleton } from '@/components/ui/data-table';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import {
  normalizeListEnvelope,
  useTablePagination,
  type ListEnvelope,
} from '@/hooks/useTablePagination';

type LeadOption = {
  id: string;
  name: string;
  phone: string;
  stage: string;
  assignedTo: { id: string; name: string } | null;
};

type Options = {
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    teamId: string | null;
  }[];
  teams: { id: string; name: string }[];
  leads: LeadOption[];
  meta?: ListEnvelope<LeadOption>['meta'];
};

type HistoryRow = {
  id: string;
  entityId: string;
  createdAt: string;
  actor: { id: string; name: string; email: string };
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

export function ReassignPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toUserId, setToUserId] = useState('');
  const [toTeamId, setToTeamId] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leadQ, setLeadQ] = useState('');
  const [appliedLeadQ, setAppliedLeadQ] = useState('');
  const leadsPager = useTablePagination(25);
  const historyPager = useTablePagination(25);

  useEffect(() => {
    leadsPager.resetPage();
  }, [appliedLeadQ, leadsPager.resetPage]);

  const options = useQuery({
    queryKey: [
      'reassign-options',
      leadsPager.page,
      leadsPager.limit,
      appliedLeadQ,
    ],
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(leadsPager.page),
        limit: String(leadsPager.limit),
      });
      if (appliedLeadQ.trim()) sp.set('q', appliedLeadQ.trim());
      return apiFetch<Options>(`/api/reassign/options?${sp}`, { accessToken });
    },
  });

  const history = useQuery({
    queryKey: ['reassign-history', historyPager.page, historyPager.limit],
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiFetch<ListEnvelope<HistoryRow>>(
        `/api/reassign/history?page=${historyPager.page}&limit=${historyPager.limit}`,
        { accessToken },
      );
      return normalizeListEnvelope(res);
    },
  });

  const mutate = useMutation({
    mutationFn: () =>
      apiFetch<{ updated: number }>('/api/reassign', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          leadIds: [...selected],
          toUserId,
          toTeamId: toTeamId || null,
          note: note || null,
        }),
      }),
    onSuccess: (res) => {
      setMessage(`Reassigned ${res.updated} lead(s)`);
      setError(null);
      setSelected(new Set());
      void qc.invalidateQueries({ queryKey: ['reassign-options'] });
      void qc.invalidateQueries({ queryKey: ['reassign-history'] });
      void qc.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (e: Error) => {
      setError(e.message);
      setMessage(null);
    },
  });

  const leads = options.data?.leads ?? [];
  const allIds = useMemo(() => leads.map((l) => l.id), [leads]);

  const columns: ColumnDef<LeadOption>[] = useMemo(
    () => [
      {
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            aria-label="Select all"
            checked={allIds.length > 0 && selected.size === allIds.length}
            onChange={() =>
              setSelected(
                selected.size === allIds.length ? new Set() : new Set(allIds),
              )
            }
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selected.has(row.original.id)}
            onChange={(e) => {
              const next = new Set(selected);
              if (e.target.checked) next.add(row.original.id);
              else next.delete(row.original.id);
              setSelected(next);
            }}
          />
        ),
      },
      {
        accessorKey: 'name',
        header: 'Lead',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-navy">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.phone}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'stage',
        header: 'Stage',
        cell: ({ getValue }) => (
          <LeadStageBadge stage={String(getValue())} />
        ),
      },
      {
        id: 'assignee',
        header: 'Assignee',
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.assignedTo?.name ?? 'Unassigned'}
          </span>
        ),
      },
    ],
    [allIds, selected],
  );

  const historyColumns: ColumnDef<HistoryRow>[] = useMemo(
    () => [
      {
        id: 'lead',
        header: 'Lead',
        cell: ({ row }) => (
          <div className="font-medium text-navy">
            {String(row.original.after?.leadName ?? row.original.entityId)}
          </div>
        ),
      },
      {
        id: 'to',
        header: 'Assigned to',
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {String(row.original.after?.toUserName ?? 'user')}
          </span>
        ),
      },
      {
        id: 'by',
        header: 'By',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-navy">{row.original.actor.name}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(row.original.createdAt).toLocaleString()}
            </div>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reassign Leads"
        description="Bulk move leads to another assignee within your scope"
      />

      <section className="rounded-md border border-border bg-surface-raised p-4 shadow-panel">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Assign to user</Label>
            <select
              className="mt-1.5 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
            >
              <option value="">Select user…</option>
              {(options.data?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Team (optional)</Label>
            <select
              className="mt-1.5 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
              value={toTeamId}
              onChange={(e) => setToTeamId(e.target.value)}
            >
              <option value="">Keep / inherit</option>
              {(options.data?.teams ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Note</Label>
            <Input
              className="mt-1.5"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason (optional)"
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={!toUserId || selected.size === 0 || mutate.isPending}
              onClick={() => mutate.mutate()}
            >
              Reassign {selected.size || ''} selected
            </Button>
          </div>
        </div>
        {message ? <p className="mt-2 text-sm text-success">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </section>

      <section className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-navy">Leads in scope</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-8 w-full sm:w-48"
              placeholder="Search leads…"
              value={leadQ}
              onChange={(e) => setLeadQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setAppliedLeadQ(leadQ.trim());
              }}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setAppliedLeadQ(leadQ.trim())}
            >
              Search
            </Button>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() =>
                setSelected(
                  selected.size === allIds.length ? new Set() : new Set(allIds),
                )
              }
            >
              {selected.size === allIds.length ? 'Clear all' : 'Select page'}
            </button>
          </div>
        </div>
        {options.isLoading ? (
          <TableSkeleton rows={5} />
        ) : (
          <DataTable
            columns={columns}
            data={leads}
            emptyMessage="No leads available."
            title={`${options.data?.meta?.total ?? leads.length} lead(s)`}
            description={
              selected.size
                ? `${selected.size} selected for reassignment`
                : 'Select leads, then choose an assignee above'
            }
            pagination={{
              page: leadsPager.page,
              limit: leadsPager.limit,
              total: options.data?.meta?.total ?? leads.length,
              pageCount: options.data?.meta?.pageCount,
              onPageChange: leadsPager.setPage,
              onLimitChange: leadsPager.setLimit,
              isFetching: options.isFetching,
            }}
          />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-navy">Recent history</h2>
        {history.isLoading ? (
          <TableSkeleton rows={3} />
        ) : (
          <DataTable
            columns={historyColumns}
            data={history.data?.data ?? []}
            emptyMessage="No reassignments yet."
            pagination={{
              page: historyPager.page,
              limit: historyPager.limit,
              total: history.data?.meta.total ?? 0,
              pageCount: history.data?.meta.pageCount,
              onPageChange: historyPager.setPage,
              onLimitChange: historyPager.setLimit,
              isFetching: history.isFetching,
            }}
          />
        )}
      </section>
    </div>
  );
}
