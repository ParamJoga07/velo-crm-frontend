import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { apiFetch } from '@/lib/api';
import { TableSkeleton } from '@/components/ui/data-table';
import { LEAD_STAGE_LABELS } from '@velo/shared';
import { cn } from '@/lib/utils';

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
    booked: number;
    lost: number;
    openFollowups: number;
    missedFollowups: number;
  };
  funnel: { stage: string; count: number }[];
  sources: { source: string; count: number }[];
  byTeam: { teamId: string | null; name: string; count: number }[];
  byOwner: { userId: string | null; name: string; count: number }[];
  leadsTrend: { date: string; count: number }[];
  attendance: {
    present: number;
    absent: number;
    halfDay: number;
    recorded: number;
  };
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

const STAGE_ORDER = [
  'INCOMING',
  'PROSPECT',
  'OPPORTUNITY',
  'BOOKED',
  'UNQUALIFIED',
  'LOST',
] as const;

const CHART = {
  steel: '#3d5a80',
  steelLight: '#7a9bbf',
  green: '#5b9a78',
  amber: '#c4a035',
  rose: '#c46b6b',
  slate: '#6b7280',
  navy: '#2a4a6b',
  mist: '#93b0cf',
};

const PIE_COLORS = [
  CHART.steel,
  CHART.steelLight,
  CHART.green,
  CHART.amber,
  CHART.rose,
  CHART.slate,
  CHART.navy,
  CHART.mist,
];

function formatDay(iso: string) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function shortName(name: string, max = 14) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export function DashboardPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const gridStroke = isDark ? '#1a1e27' : '#e2e6ec';
  const axisStroke = isDark ? '#8b93a1' : '#6b7280';
  const tooltipStyle = {
    background: isDark ? '#151a24' : '#ffffff',
    border: `1px solid ${isDark ? '#0e1117' : '#d5dae1'}`,
    borderRadius: 8,
    color: isDark ? '#e8eaef' : '#1c1f26',
    fontSize: 12,
  };

  const query = useQuery({
    queryKey: ['dashboard-summary'],
    staleTime: 60_000,
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

  const funnelData = useMemo(() => {
    const map = new Map(
      (query.data?.funnel ?? []).map((f) => [f.stage, f.count]),
    );
    return STAGE_ORDER.map((stage) => ({
      stage,
      label: LEAD_STAGE_LABELS[stage] ?? stage,
      count: map.get(stage) ?? 0,
    })).filter((r) => r.count > 0 || ['INCOMING', 'PROSPECT', 'OPPORTUNITY'].includes(r.stage));
  }, [query.data?.funnel]);

  const outcomeData = useMemo(() => {
    if (!query.data) return [];
    const pipeline = Math.max(
      0,
      query.data.totals.leads -
        query.data.totals.booked -
        query.data.totals.lost,
    );
    return [
      { name: 'Pipeline', value: pipeline, color: CHART.steelLight },
      { name: 'Booked', value: query.data.totals.booked, color: CHART.green },
      { name: 'Lost / Unqual.', value: query.data.totals.lost, color: CHART.rose },
    ].filter((d) => d.value > 0);
  }, [query.data]);

  const attendancePie = useMemo(() => {
    if (!query.data) return [];
    return [
      { name: 'Present', value: query.data.attendance.present, color: CHART.green },
      {
        name: 'Half day',
        value: query.data.attendance.halfDay,
        color: CHART.amber,
      },
      { name: 'Absent', value: query.data.attendance.absent, color: CHART.rose },
    ].filter((d) => d.value > 0);
  }, [query.data]);

  const importPie = useMemo(() => {
    if (!query.data) return [];
    const ok = Math.max(
      0,
      query.data.imports.rowsUploaded - query.data.imports.rowsErrored,
    );
    return [
      { name: 'Uploaded OK', value: ok, color: CHART.green },
      {
        name: 'Errored rows',
        value: query.data.imports.rowsErrored,
        color: CHART.rose,
      },
    ].filter((d) => d.value > 0);
  }, [query.data]);

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Dashboard" description="Loading live metrics…" />
        <TableSkeleton rows={8} />
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
  const quotaUsedPct =
    data.tenant.leadLimit && data.tenant.leadLimit > 0
      ? Math.min(
          100,
          Math.round(
            ((data.tenant.leadsUsed ?? 0) / data.tenant.leadLimit) * 100,
          ),
        )
      : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ops Dashboard"
        description={
          user?.role === 'SUPERADMIN'
            ? `${data.tenant.name} · organization performance`
            : `${data.tenant.name} · team performance`
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Leads in scope" value={data.totals.leads} />
        <StatCard label="Unassigned" value={data.totals.unassigned} warn={data.totals.unassigned > 0} />
        <StatCard label="Booked" value={data.totals.booked} tone="success" />
        <StatCard
          label="Missed follow-ups"
          value={data.totals.missedFollowups}
          warn={data.totals.missedFollowups > 0}
        />
        <StatCard label="Active users" value={data.totals.users} />
        <StatCard label="Teams" value={data.totals.teams} />
        <StatCard label="Open follow-ups" value={data.totals.openFollowups} />
        <StatCard
          label="Lead quota used"
          value={`${quotaUsedPct}%`}
          hint={
            data.tenant.leadLimit != null
              ? `${(data.tenant.leadsUsed ?? 0).toLocaleString()} / ${data.tenant.leadLimit.toLocaleString()}`
              : undefined
          }
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ChartCard
          title="Lead intake (14 days)"
          subtitle="New leads created per day"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.leadsTrend}>
              <defs>
                <linearGradient id="intakeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.steelLight} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={CHART.steelLight} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDay}
                tick={{ fill: axisStroke, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: axisStroke, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(v) => formatDay(String(v))}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Leads"
                stroke={CHART.steelLight}
                fill="url(#intakeFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pipeline outcomes" subtitle="Booked vs lost vs active">
          {outcomeData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={outcomeData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {outcomeData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: 12, color: axisStroke }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Lead funnel" subtitle="Count by stage">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fill: axisStroke, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={100}
                tick={{ fill: axisStroke, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Leads" fill={CHART.steel} radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Leads by source" subtitle="Top intake channels">
          {data.sources.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.sources}
                  dataKey="count"
                  nameKey="source"
                  outerRadius={92}
                  paddingAngle={1}
                >
                  {data.sources.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  verticalAlign="bottom"
                  height={48}
                  wrapperStyle={{ fontSize: 11, color: axisStroke }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Team workload" subtitle="Leads owned by team">
          {data.byTeam.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.byTeam.map((t) => ({
                  ...t,
                  short: shortName(t.name),
                }))}
              >
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="short"
                  tick={{ fill: axisStroke, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: axisStroke, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, payload) =>
                    String(payload?.[0]?.payload?.name ?? '')
                  }
                />
                <Bar dataKey="count" name="Leads" fill={CHART.navy} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Agent workload" subtitle="Top assignees by lead count">
          {data.byOwner.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.byOwner.map((o) => ({
                  ...o,
                  short: shortName(o.name),
                }))}
                layout="vertical"
                margin={{ left: 8 }}
              >
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: axisStroke, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="short"
                  width={90}
                  tick={{ fill: axisStroke, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, payload) =>
                    String(payload?.[0]?.payload?.name ?? '')
                  }
                />
                <Bar dataKey="count" name="Leads" fill={CHART.steelLight} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ChartCard title="Attendance today" subtitle="Present / half / absent">
          {attendancePie.length === 0 ? (
            <EmptyChart label="No attendance logged today" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={attendancePie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {attendancePie.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: 12, color: axisStroke }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Import quality" subtitle="Uploaded vs errored rows">
          {importPie.length === 0 ? (
            <EmptyChart label="No import rows yet" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={importPie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {importPie.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: 12, color: axisStroke }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Import jobs" subtitle="Batch processing snapshot">
          <dl className="mt-2 space-y-2 text-sm">
            <MetricRow label="Jobs run" value={data.imports.jobs} />
            <MetricRow label="Rows total" value={data.imports.rowsTotal} />
            <MetricRow label="Rows uploaded" value={data.imports.rowsUploaded} />
            <MetricRow label="Rows with errors" value={data.imports.rowsErrored} />
            <MetricRow label="Failed jobs" value={data.imports.failedJobs} />
            <MetricRow
              label="Lead balance left"
              value={data.tenant.leadBalance.toLocaleString()}
            />
          </dl>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface-raised p-4 shadow-crm dark:border-[#0e1117]',
        className,
      )}
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ label = 'No data yet' }: { label?: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  warn,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  warn?: boolean;
  tone?: 'success';
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4 shadow-crm dark:border-[#0e1117]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-2xl font-bold tabular-nums text-navy',
          warn && 'text-rose-600 dark:text-rose-400',
          tone === 'success' && 'text-emerald-700 dark:text-emerald-400',
        )}
      >
        {value}
      </div>
      {hint ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-table-border py-1.5 last:border-0 dark:border-[#0e1117]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums text-navy">{value}</dd>
    </div>
  );
}
