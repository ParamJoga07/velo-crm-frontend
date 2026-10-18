import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Phone } from 'lucide-react';
import {
  LEAD_STAGE_LABELS,
  PROSPECT_FIELD_LABEL,
  isProspectRatingEditable,
} from '@velo/shared';
import { apiDownload, apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { DataTable, TableSkeleton } from '@/components/ui/data-table';
import { LeadPriorityBadge, LeadStageBadge } from '@/components/LeadStatusBadges';
import { LeadPhoneLink } from '@/components/LeadPhoneLink';
import { LeadDialpad } from '@/components/LeadDialpad';
import { formatLeadNo } from '@/lib/lead-number';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/lib/confirm';
import { cn } from '@/lib/utils';
import {
  normalizeListEnvelope,
  useTablePagination,
  type ListEnvelope,
} from '@/hooks/useTablePagination';

type LeadRow = {
  id: string;
  leadNo: number;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  priority: string;
  stage: string;
  source: string;
  score: number;
  assignedToId: string | null;
  createdAt: string;
  assignedTo: { id: string; name: string; email: string } | null;
  team: { id: string; name: string } | null;
  campaign: { id: string; name: string } | null;
  _count?: { tasks: number };
  tasks?: { scheduledAt: string; kind: string; title: string }[];
  meetings?: { status: string; startAt: string }[];
};

const ALL_LISTS = [
  { id: '', label: 'All leads' },
  { id: 'incoming', label: 'Incoming' },
  { id: 'missed_followups', label: 'Missed Follow-ups' },
  { id: 'no_future_activity', label: 'No Future Activity' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'prospect', label: 'Prospect' },
  { id: 'deal', label: 'Deal' },
] as const;

const PERSONAL_LISTS = [
  { id: '', label: 'Personal leads' },
  { id: 'personal_prospect', label: 'Prospect' },
  { id: 'personal_deal', label: 'Deal' },
] as const;

function isPersonalSmart(smart: string) {
  return smart === 'personal' || smart.startsWith('personal_');
}

export function LeadsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const smart = params.get('smart') ?? '';
  const appliedQ = params.get('q') ?? '';
  const source = params.get('source') ?? '';
  const stageFilter = params.get('stage') ?? '';
  const mine = params.get('mine') === '1';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const [q, setQ] = useState(appliedQ);
  const { page, limit, setPage, setLimit, resetPage } = useTablePagination(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignToId, setAssignToId] = useState('');
  const [exportFormat, setExportFormat] = useState<'XLSX' | 'CSV'>('XLSX');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [dialpadOpen, setDialpadOpen] = useState(false);

  useEffect(() => {
    resetPage();
  }, [smart, appliedQ, source, stageFilter, resetPage]);

  const clock = useQuery({
    queryKey: ['attendance-status'],
    enabled: user?.role === 'USER',
    refetchInterval: 30_000,
    queryFn: () =>
      apiFetch<{ clockedIn: boolean; loginAt: string | null }>(
        '/api/attendance/status',
        { accessToken },
      ),
  });

  const catalog = useQuery({
    queryKey: ['lead-catalog'],
    queryFn: () =>
      apiFetch<{ sources: string[] }>('/api/lead-settings/catalog', {
        accessToken,
      }),
  });

  const clockIn = useMutation({
    mutationFn: () =>
      apiFetch('/api/attendance/clock-in', { method: 'POST', accessToken }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attendance-status'] });
    },
  });

  const leadsLocked =
    user?.role === 'USER' && !clock.isLoading && clock.data?.clockedIn !== true;

  const query = useQuery({
    queryKey: ['leads', user?.id, smart, appliedQ, source, stageFilter, mine, from, to, page, limit],
    enabled: !leadsLocked,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchInterval: page === 1 ? 60_000 : false,
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (smart) sp.set('smart', smart);
      if (appliedQ.trim()) sp.set('q', appliedQ.trim());
      if (source) sp.set('source', source);
      if (stageFilter) sp.set('stage', stageFilter);
      if (mine) sp.set('mine', '1');
      if (from) sp.set('from', from);
      if (to) sp.set('to', to);
      const envelope = await apiFetch<ListEnvelope<LeadRow>>(
        `/api/leads?${sp}`,
        { accessToken },
      );
      return normalizeListEnvelope(envelope);
    },
  });

  const assignmentNotices = useQuery({
    queryKey: ['notifications', 'leads-banner'],
    enabled: user?.role === 'USER',
    queryFn: () =>
      apiFetch<{
        items: {
          id: string;
          type: string;
          title: string;
          body: string;
          createdAt: string;
          meta: { count?: number } | null;
        }[];
      }>('/api/notifications?limit=5', { accessToken }),
  });

  const latestAssignment = (assignmentNotices.data?.items ?? []).find(
    (n) => n.type === 'LEADS_ASSIGNED',
  );

  // The banner is an arrival notice, not a permanent fixture — it clears itself
  // a few seconds after the page settles so it stops eating the list.
  const [assignmentDismissed, setAssignmentDismissed] = useState(false);
  useEffect(() => {
    if (!latestAssignment?.id) return;
    setAssignmentDismissed(false);
    const timer = setTimeout(() => setAssignmentDismissed(true), 4000);
    return () => clearTimeout(timer);
  }, [latestAssignment?.id]);

  const removeLead = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/leads/${id}`, { method: 'DELETE', accessToken }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const purgeAll = useMutation({
    mutationFn: () =>
      apiFetch('/api/leads/purge-all', { method: 'POST', accessToken }),
    onSuccess: () => {
      setSelected(new Set());
      void qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch<{ deleted: number }>('/api/leads/bulk-delete', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      setSelected(new Set());
      void qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const bulkExport = useMutation({
    mutationFn: (payload: { ids: string[]; format: 'CSV' | 'XLSX' }) =>
      apiDownload('/api/exports/leads/selected', {
        accessToken,
        body: payload,
        fallbackFileName: `leads-selected.${payload.format.toLowerCase()}`,
      }),
    onError: (e: Error) => setBulkError(e.message),
    onSuccess: () => setBulkError(null),
  });

  const bulkAssign = useMutation({
    mutationFn: (payload: { leadIds: string[]; toUserId: string }) =>
      apiFetch<{ updated: number }>('/api/reassign', {
        method: 'POST',
        accessToken,
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setSelected(new Set());
      setAssignToId('');
      void qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const assignUsers = useQuery({
    queryKey: ['users', 'lead-assign'],
    enabled: user?.role === 'SUPERADMIN' || user?.role === 'MANAGER',
    queryFn: async () => {
      const envelope = await apiFetch<
        ListEnvelope<{ id: string; name: string; email: string; role: string }>
      >('/api/users?limit=100', { accessToken });
      return normalizeListEnvelope(envelope);
    },
  });

  const canDelete = user?.role !== 'USER';
  const canAssign = user?.role === 'SUPERADMIN' || user?.role === 'MANAGER';
  const rows = query.data?.data ?? [];
  const pageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const columns: ColumnDef<LeadRow>[] = useMemo(
    () => [
      ...(canDelete || canAssign
        ? [
            {
              id: 'select',
              header: () => (
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <input
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageSelected && !allPageSelected;
                    }}
                    onChange={toggleAllOnPage}
                  />
                  All
                </label>
              ),
              cell: ({ row }) => (
                <input
                  type="checkbox"
                  aria-label={`Select ${row.original.name}`}
                  checked={selected.has(row.original.id)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(row.original.id);
                    else next.delete(row.original.id);
                    setSelected(next);
                  }}
                />
              ),
            } satisfies ColumnDef<LeadRow>,
          ]
        : []),
      {
        accessorKey: 'leadNo',
        header: 'ID',
        size: 64,
        cell: ({ row }) => (
          <Link
            to={`/leads/${row.original.id}`}
            className="font-mono text-[11px] font-semibold text-primary hover:underline"
          >
            {formatLeadNo(row.original.leadNo)}
          </Link>
        ),
      },
      {
        accessorKey: 'score',
        header: 'Sc',
        size: 48,
        cell: ({ getValue }) => (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-table-border bg-surface-muted font-mono text-[10px] font-semibold text-navy">
            {Number(getValue() ?? 0)}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Lead',
        cell: ({ row }) => (
          <div>
            <Link
              to={`/leads/${row.original.id}`}
              className="text-base font-medium text-navy hover:opacity-90"
            >
              {row.original.name}
            </Link>
            <div className="text-xs text-muted-foreground">
              {row.original.phone ? (
                <LeadPhoneLink
                  leadId={row.original.id}
                  phone={row.original.phone}
                  className="text-xs"
                />
              ) : (
                '—'
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'owner',
        header: 'Owner',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.assignedTo?.name ?? 'Unassigned'}
          </span>
        ),
      },
      {
        id: 'followup',
        header: 'Next follow-up',
        cell: ({ row }) => {
          const next = row.original.tasks?.[0];
          return (
            <span className="text-xs text-muted-foreground">
              {next
                ? new Date(next.scheduledAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : '—'}
            </span>
          );
        },
      },
      {
        id: 'meeting',
        header: 'Meeting',
        cell: ({ row }) => {
          const m = row.original.meetings?.[0];
          return (
            <span className="text-xs text-muted-foreground">
              {m ? m.status.replace('_', ' ') : '—'}
            </span>
          );
        },
      },
      {
        accessorKey: 'source',
        header: 'Tags',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.source}
            {row.original.campaign?.name
              ? ` · ${row.original.campaign.name}`
              : ''}
            {row.original.city ? ` · ${row.original.city}` : ''}
          </span>
        ),
      },
      {
        accessorKey: 'priority',
        header: PROSPECT_FIELD_LABEL,
        cell: ({ row }) =>
          isProspectRatingEditable(row.original.stage) ? (
            <LeadPriorityBadge priority={String(row.original.priority ?? 'WARM')} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
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
        accessorKey: 'createdAt',
        header: 'Received on',
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(String(getValue())).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button asChild size="sm" variant="secondary">
              <Link to={`/leads/${row.original.id}`}>Open</Link>
            </Button>
            {canDelete ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-danger"
                disabled={removeLead.isPending}
                onClick={async () => {
                  const ok = await confirm({
                    title: `Delete ${row.original.name}?`,
                    description:
                      'This permanently removes the lead and cannot be undone.',
                    confirmLabel: 'Delete',
                    variant: 'danger',
                  });
                  if (!ok) return;
                  removeLead.mutate(row.original.id);
                }}
              >
                Delete
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [
      allPageSelected,
      canAssign,
      canDelete,
      confirm,
      removeLead,
      selected,
      somePageSelected,
    ],
  );

  const total = query.data?.meta?.total ?? query.data?.data?.length ?? 0;

  const setSmart = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set('smart', id);
    else next.delete('smart');
    setParams(next);
  };

  if (leadsLocked) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface-raised p-8 text-center shadow-panel">
        <p className="text-lg font-semibold text-navy">Clock in to open leads</p>
        <p className="max-w-md text-sm text-muted-foreground">
          The leads page stays disabled until you clock in for the day.
        </p>
        <Button
          size="lg"
          disabled={clockIn.isPending}
          onClick={() => clockIn.mutate()}
        >
          {clockIn.isPending ? 'Clocking in…' : 'Clock in'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="min-w-0 flex-1 space-y-4">
        <PageHeader
          title="Leads"
          description={`${total} lead(s)${
            mine ? ' · My leads' : ' · All leads'
          }${
            smart
              ? ` · ${
                  [...ALL_LISTS, ...PERSONAL_LISTS].find((s) => s.id === smart)
                    ?.label ?? smart
                }`
              : ''
          }`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setDialpadOpen(true)}>
                <Phone className="mr-1.5 h-3.5 w-3.5" />
                Dialpad
              </Button>
              {user?.role !== 'USER' ? (
              <>
              <Button asChild>
                <Link to="/leads/new">Add lead</Link>
              </Button>
                  <Button asChild variant="secondary">
                    <Link to="/admin/imports/leads/new">Import</Link>
                  </Button>
                  <Button
                    variant="secondary"
                    className="text-danger"
                    disabled={purgeAll.isPending || total === 0}
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Delete ALL leads?',
                        description:
                          'This permanently removes every lead in this workspace, including activities and follow-ups. This cannot be undone.',
                        confirmLabel: 'Delete all leads',
                        variant: 'danger',
                      });
                      if (!ok) return;
                      purgeAll.mutate();
                    }}
                  >
                    {purgeAll.isPending ? 'Deleting…' : 'Delete all'}
                  </Button>
              </>
              ) : null}
            </div>
          }
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
            <button
              type="button"
              className={cn(
                'h-8 rounded px-3 text-xs font-semibold',
                !mine ? 'bg-primary text-primary-foreground' : 'text-navy hover:bg-surface-muted',
              )}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.delete('mine');
                if (isPersonalSmart(smart)) next.delete('smart');
                setParams(next);
              }}
            >
              All leads
            </button>
            <button
              type="button"
              className={cn(
                'h-8 rounded px-3 text-xs font-semibold',
                mine ? 'bg-primary text-primary-foreground' : 'text-navy hover:bg-surface-muted',
              )}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set('mine', '1');
                setParams(next);
              }}
            >
              My leads
            </button>
          </div>
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={isPersonalSmart(smart) ? '' : smart}
            onChange={(e) => setSmart(e.target.value)}
            aria-label="Pipeline list"
          >
            {ALL_LISTS.map((item) => (
              <option key={item.id || 'all'} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <Input
            type="date"
            className="h-9 w-auto"
            value={from}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set('from', e.target.value);
              else next.delete('from');
              setParams(next);
            }}
          />
          <Input
            type="date"
            className="h-9 w-auto"
            value={to}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set('to', e.target.value);
              else next.delete('to');
              setParams(next);
            }}
          />
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={source}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set('source', e.target.value);
              else next.delete('source');
              setParams(next);
            }}
          >
            <option value="">All sources</option>
            {(catalog.data?.sources ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={stageFilter}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set('stage', e.target.value);
              else next.delete('stage');
              setParams(next);
            }}
          >
            <option value="">All stages</option>
            {Object.entries(LEAD_STAGE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <Input
            className="w-full sm:max-w-xs"
            placeholder="Quick find name / phone / email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const next = new URLSearchParams(params);
                if (q.trim()) next.set('q', q.trim());
                else next.delete('q');
                setParams(next);
              }
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const next = new URLSearchParams(params);
              if (q.trim()) next.set('q', q.trim());
              else next.delete('q');
              setParams(next);
            }}
          >
            Search
          </Button>
          {pageIds.length > 0 && (canDelete || canAssign) ? (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={toggleAllOnPage}
            >
              {allPageSelected ? 'Clear page' : `Select all (${pageIds.length})`}
            </button>
          ) : null}
        </div>

        {selected.size > 0 ? (
          <div className="flex flex-col gap-2 rounded-md border border-primary/30 bg-primary-muted px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="text-sm font-medium text-primary-dark">
              {selected.size} selected
            </span>
            {canAssign ? (
              <>
                <select
                  className="h-8 rounded-md border border-border bg-surface px-2 text-sm"
                  value={assignToId}
                  onChange={(e) => setAssignToId(e.target.value)}
                >
                  <option value="">Reassign to…</option>
                  {(assignUsers.data?.data ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={!assignToId || bulkAssign.isPending}
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Reassign ${selected.size} lead${selected.size === 1 ? '' : 's'}?`,
                      description: 'Ownership will move to the selected user.',
                      confirmLabel: 'Reassign',
                    });
                    if (!ok) return;
                    bulkAssign.mutate({
                      leadIds: [...selected],
                      toUserId: assignToId,
                    });
                  }}
                >
                  {bulkAssign.isPending ? 'Reassigning…' : 'Reassign'}
                </Button>
              </>
            ) : null}
            {canAssign ? (
              <>
                <select
                  className="h-8 rounded-md border border-border bg-surface px-2 text-sm"
                  value={exportFormat}
                  onChange={(e) =>
                    setExportFormat(e.target.value as 'XLSX' | 'CSV')
                  }
                  aria-label="Export format"
                >
                  <option value="XLSX">Excel (.xlsx)</option>
                  <option value="CSV">CSV (.csv)</option>
                </select>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={bulkExport.isPending}
                  onClick={() =>
                    bulkExport.mutate({
                      ids: [...selected],
                      format: exportFormat,
                    })
                  }
                >
                  {bulkExport.isPending ? 'Exporting…' : 'Export selected'}
                </Button>
              </>
            ) : null}
            {canDelete ? (
              <Button
                size="sm"
                variant="danger"
                disabled={bulkDelete.isPending}
                onClick={async () => {
                  const ok = await confirm({
                    title: `Delete ${selected.size} selected lead${selected.size === 1 ? '' : 's'}?`,
                    description: 'This permanently removes the selected leads and cannot be undone.',
                    confirmLabel: 'Delete selected',
                    variant: 'danger',
                  });
                  if (!ok) return;
                  bulkDelete.mutate([...selected]);
                }}
              >
                {bulkDelete.isPending ? 'Deleting…' : 'Delete selected'}
              </Button>
            ) : null}
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline sm:ml-auto"
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </button>
            {bulkError ? (
              <p className="w-full text-xs text-danger">{bulkError}</p>
            ) : null}
          </div>
        ) : null}

        {latestAssignment && !assignmentDismissed ? (
          <div className="flex items-start justify-between gap-3 rounded-md border border-primary/30 bg-primary-muted px-4 py-3 text-sm transition-opacity duration-500">
            <div>
              <div className="font-semibold text-primary-dark">
                {latestAssignment.title}
              </div>
              <p className="mt-0.5 text-navy/80">{latestAssignment.body}</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              className="shrink-0 text-muted-foreground hover:text-navy"
              onClick={() => setAssignmentDismissed(true)}
            >
              ✕
            </button>
          </div>
        ) : null}

        <LeadDialpad
          open={dialpadOpen}
          onClose={() => setDialpadOpen(false)}
          onCreated={() => {
            void qc.invalidateQueries({ queryKey: ['leads'] });
          }}
        />

        {query.isLoading ? (
          <TableSkeleton />
        ) : (
          <DataTable
            columns={columns}
            data={query.data?.data ?? []}
            emptyMessage="No leads in this list."
            cellClassName="px-4 py-3.5 text-[15px]"
            maxHeightClass="max-h-[min(72vh,calc(100dvh-12rem))] md:max-h-[calc(100dvh-11rem)]"
            pagination={{
              page,
              limit,
              total,
              pageCount: query.data?.meta.pageCount,
              onPageChange: setPage,
              onLimitChange: setLimit,
              isFetching: query.isFetching,
            }}
          />
        )}
      </div>
    </div>
  );
}
