import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { DataTable, TableSkeleton } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { LEAD_STAGE_LABELS, type LeadStage } from '@velo/shared';

type LeadRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  stage: string;
  source: string;
  score: number;
  assignedToId: string | null;
  createdAt: string;
  assignedTo: { id: string; name: string; email: string } | null;
  team: { id: string; name: string } | null;
  campaign: { id: string; name: string } | null;
  _count?: { tasks: number };
};

const SMART_LISTS = [
  { id: '', label: 'All leads' },
  { id: 'new', label: 'New enquiries' },
  { id: 'untouched', label: 'Untouched leads' },
  { id: 'missed_followups', label: 'Missed followups' },
  { id: 'no_future_activity', label: 'No future activity' },
  { id: 'reassigned_to_me', label: 'Reassigned to me' },
] as const;

export function LeadsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [params, setParams] = useSearchParams();
  const smart = params.get('smart') ?? '';
  const [q, setQ] = useState(params.get('q') ?? '');

  const query = useQuery({
    queryKey: ['leads', user?.id, smart, q],
    refetchInterval: 20_000,
    queryFn: async () => {
      const sp = new URLSearchParams({ limit: '50' });
      if (smart) sp.set('smart', smart);
      if (q.trim()) sp.set('q', q.trim());
      const envelope = await apiFetch<{
        data: LeadRow[];
        meta: { cursor: string | null; hasMore: boolean; total?: number };
        error: null;
      }>(`/api/leads?${sp}`, { accessToken });
      const rows = Array.isArray(
        (envelope as unknown as { data: LeadRow[] }).data,
      )
        ? (envelope as unknown as { data: LeadRow[]; meta: { total?: number } })
        : {
            data: envelope as unknown as LeadRow[],
            meta: {},
          };
      return rows;
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

  const columns: ColumnDef<LeadRow>[] = useMemo(
    () => [
      {
        accessorKey: 'score',
        header: 'Score',
        cell: ({ getValue }) => (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-muted font-mono text-xs font-semibold text-navy">
            {Number(getValue() ?? 0)}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Lead',
        cell: ({ row }) => (
          <Link to={`/leads/${row.original.id}`} className="block hover:opacity-90">
            <div className="font-medium text-navy">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.assignedTo?.name ?? 'Unassigned'}
              {row.original.phone ? ` · ${row.original.phone}` : ''}
            </div>
          </Link>
        ),
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
          </span>
        ),
      },
      {
        accessorKey: 'stage',
        header: 'Stage',
        cell: ({ getValue }) => {
          const stage = String(getValue());
          const tone =
            stage === 'INCOMING'
              ? 'new'
              : stage === 'PROSPECT'
                ? 'accent'
                : stage === 'OPPORTUNITY'
                  ? 'warning'
                  : stage === 'BOOKED'
                    ? 'success'
                    : stage === 'LOST' || stage === 'UNQUALIFIED'
                      ? 'danger'
                      : 'neutral';
          return (
            <Badge tone={tone}>
              {LEAD_STAGE_LABELS[stage as LeadStage] ??
                stage.replace(/_/g, ' ')}
            </Badge>
          );
        },
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
          <Button asChild size="sm" variant="secondary">
            <Link to={`/leads/${row.original.id}`}>Open</Link>
          </Button>
        ),
      },
    ],
    [],
  );

  const total = query.data?.meta?.total ?? query.data?.data?.length ?? 0;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-56">
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Smart lists
          </p>
          <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
            {SMART_LISTS.map((item) => {
              if (item.id === 'reassigned_to_me' && user?.role !== 'USER') {
                return null;
              }
              const active = smart === item.id;
              return (
                <button
                  key={item.id || 'all'}
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    if (item.id) next.set('smart', item.id);
                    else next.delete('smart');
                    setParams(next);
                  }}
                  className={cn(
                    'shrink-0 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors',
                    active
                      ? 'bg-primary-muted font-semibold text-primary-dark'
                      : 'border border-border text-navy/80 hover:bg-surface-muted lg:border-0',
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <PageHeader
          title="All Leads"
          description={`${total} lead(s)${
            smart
              ? ` · ${SMART_LISTS.find((s) => s.id === smart)?.label ?? smart}`
              : ''
          }`}
          actions={
            user?.role !== 'USER' ? (
              <Button asChild>
                <Link to="/admin/imports/leads/new">Import leads</Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="secondary">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            )
          }
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
        </div>

        {latestAssignment ? (
          <div className="rounded-md border border-primary/30 bg-primary-muted px-4 py-3 text-sm">
            <div className="font-semibold text-primary-dark">
              {latestAssignment.title}
            </div>
            <p className="mt-0.5 text-navy/80">{latestAssignment.body}</p>
          </div>
        ) : null}

        {query.isLoading ? (
          <TableSkeleton />
        ) : (
          <DataTable
            columns={columns}
            data={query.data?.data ?? []}
            emptyMessage="No leads in this list."
          />
        )}
      </div>
    </div>
  );
}
