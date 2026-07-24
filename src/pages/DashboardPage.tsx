import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { useAuthStore } from '@/stores/auth';
import { apiFetch } from '@/lib/api';
import { TableSkeleton } from '@/components/ui/data-table';

type DashboardSummary = {
  tenant: {
    id: string;
    name: string;
    timezone: string;
    leadBalance: number;
    leadLimit?: number;
    leadsUsed?: number;
  };
  totals: {
    leads: number;
    unassigned: number;
    teams: number;
    users: number;
  };
  funnel: { stage: string; count: number }[];
  sources: { source: string; count: number }[];
  imports: {
    jobs: number;
    rowsUploaded: number;
    rowsErrored: number;
    rowsTotal: number;
    failedJobs: number;
  };
  myStats: {
    assignedLeads: number;
    openTasks: number;
    attendance: {
      status: string;
      workedSec: number;
      firstLoginAt: string | null;
      loginCount: number;
    } | null;
  } | null;
};

function formatHours(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

export function DashboardPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () =>
      apiFetch<DashboardSummary>('/api/dashboard/summary', { accessToken }),
  });

  useEffect(() => {
    const tenant = query.data?.tenant;
    if (!tenant) return;
    useAuthStore.setState({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        timezone: tenant.timezone,
        leadBalance: tenant.leadBalance,
        leadLimit: tenant.leadLimit,
        leadsUsed: tenant.leadsUsed,
      },
    });
  }, [query.data?.tenant]);

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Dashboard" description="Loading live metrics…" />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Dashboard" />
        <p className="text-sm text-danger">Unable to load dashboard data.</p>
      </div>
    );
  }

  const data = query.data;
  const maxFunnel = Math.max(1, ...data.funnel.map((f) => f.count));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description={
          user?.role === 'SUPERADMIN'
            ? `${data.tenant.name} · org-wide live metrics`
            : `${data.tenant.name} · team-scoped live metrics`
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Leads in scope" value={data.totals.leads} />
        <StatCard label="Unassigned" value={data.totals.unassigned} />
        <StatCard label="Active users" value={data.totals.users} />
        <StatCard label="Teams" value={data.totals.teams} />
      </div>

      {data.myStats ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="My assigned leads"
            value={data.myStats.assignedLeads}
          />
          <StatCard label="My open tasks" value={data.myStats.openTasks} />
          <StatCard
            label="Attendance today"
            value={
              data.myStats.attendance
                ? `${data.myStats.attendance.status} · ${formatHours(data.myStats.attendance.workedSec)}`
                : 'No session'
            }
          />
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-border bg-surface-raised p-4 shadow-crm lg:col-span-2">
          <h3 className="text-sm font-semibold text-navy">Lead funnel</h3>
          {data.funnel.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No leads yet. Import leads to populate the funnel.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {data.funnel.map((row) => (
                <div key={row.stage} className="flex items-center gap-3 text-sm">
                  <div className="w-36 shrink-0 font-mono text-xs text-muted-foreground">
                    {row.stage}
                  </div>
                  <div className="h-2 flex-1 rounded bg-surface-muted">
                    <div
                      className="h-2 rounded bg-primary"
                      style={{
                        width: `${Math.max(4, (row.count / maxFunnel) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="w-10 text-right font-semibold">{row.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-border bg-surface-raised p-4 shadow-crm">
          <h3 className="text-sm font-semibold text-navy">Import activity</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Jobs" value={data.imports.jobs} />
            <Row label="Rows uploaded" value={data.imports.rowsUploaded} />
            <Row label="Rows with errors" value={data.imports.rowsErrored} />
            <Row label="Failed jobs" value={data.imports.failedJobs} />
          </dl>
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface-raised p-4 shadow-crm">
        <h3 className="text-sm font-semibold text-navy">Leads by source</h3>
        {data.sources.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No source data yet.</p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {data.sources.map((s) => (
              <div
                key={s.source}
                className="rounded border border-border bg-surface px-3 py-2"
              >
                <div className="text-xs text-muted-foreground">{s.source}</div>
                <div className="text-lg font-semibold text-navy">{s.count}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-surface-raised p-4 shadow-crm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-navy">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border/70 py-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-navy">{value}</dd>
    </div>
  );
}
