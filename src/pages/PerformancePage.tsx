import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/data-table';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import {
  normalizeListEnvelope,
  type ListEnvelope,
} from '@/hooks/useTablePagination';

type Period = 'DAILY' | 'WEEKLY' | 'MONTHLY';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

type Summary = {
  period: Period | null;
  from: string;
  to: string;
  totals: {
    /** Phone numbers handed to the dialpad from a lead. */
    dialled: number;
    calls: number;
    meetings: number;
    meetingsDone: number;
    meetingsLogged: number;
    visits: number;
    salesCount: number;
    revenue: number;
    commission: number;
    leadsAssigned: number;
    prospects: number;
    prospectHot: number;
    prospectWarm: number;
    prospectCold: number;
    revenueTarget: number;
    revenueAchieved: number;
    revenueBalance: number;
    leadUpdates?: number;
    meetingsBookedWeek?: number;
    meetingsDoneWeek?: number;
    prevQuarterRevenue?: number;
    prevQuarterPct?: number | null;
    halfYearRevenueTarget?: number;
    halfYearRevenueAchieved?: number;
    weeklyActivity?: number;
  };
  leaderboard: {
    userId: string;
    name: string;
    dialled: number;
    calls: number;
    meetings: number;
    meetingsDone: number;
    meetingsLogged: number;
    visits: number;
    whatsapp: number;
    emails: number;
    salesCount: number;
    revenue: number;
    commission: number;
    meetingPoints?: number;
  }[];
  targets: {
    id: string;
    period: string;
    periodStart: string;
    periodEnd: string;
    callsTarget: number;
    meetingsTarget: number;
    visitsTarget: number;
    salesTarget: number;
    revenueTarget: number;
    user: { id: string; name: string } | null;
  }[];
  sales: {
    id: string;
    amount: number;
    commission: number;
    commissionPercent: number | null;
    baseValue: number | null;
    pricePerSqft: number | null;
    customerName: string | null;
    customerPhone: string | null;
    developer: string | null;
    project: string | null;
    unitNo: string | null;
    closedAt: string;
    user: { id: string; name: string };
    lead: { id: string; name: string } | null;
  }[];
};

type UserRow = { id: string; name: string };

function rupee(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(0)}k`;
  return `${sign}₹${abs.toLocaleString('en-IN')}`;
}

export function PerformancePage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const isManager = role === 'SUPERADMIN' || role === 'MANAGER';
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'calls';
  const [userId, setUserId] = useState('');
  const [period, setPeriod] = useState<Period>('MONTHLY');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [targetForm, setTargetForm] = useState({
    userId: '',
    period: 'MONTHLY',
    periodStart: '',
    periodEnd: '',
    callsTarget: '50',
    meetingsTarget: '10',
    visitsTarget: '5',
    salesTarget: '2',
    revenueTarget: '1000000',
  });
  const [saleForm, setSaleForm] = useState({
    leadId: '',
    customerName: '',
    customerPhone: '',
    developer: '',
    project: '',
    unitNo: '',
    pricePerSqft: '',
    baseValue: '',
    amount: '',
    commissionPercent: '',
    notes: '',
  });
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);

  const summary = useQuery({
    queryKey: ['performance-summary', userId, period, from, to],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (!from && !to) sp.set('period', period);
      if (from) sp.set('from', from);
      if (to) sp.set('to', `${to}T23:59:59`);
      if (userId) sp.set('userId', userId);
      return apiFetch<Summary>(`/api/performance/summary?${sp}`, {
        accessToken,
      });
    },
  });

  const users = useQuery({
    queryKey: ['users-agents'],
    enabled: isManager,
    queryFn: async () => {
      const res = await apiFetch<ListEnvelope<UserRow>>(
        '/api/users?limit=100&page=1',
        { accessToken },
      );
      return normalizeListEnvelope(res).data;
    },
  });

  const createTarget = useMutation({
    mutationFn: () =>
      apiFetch(
        editingTargetId
          ? `/api/performance/targets/${editingTargetId}`
          : '/api/performance/targets',
        {
        method: editingTargetId ? 'PATCH' : 'POST',
        accessToken,
        body: JSON.stringify({
          userId: targetForm.userId || null,
          period: targetForm.period,
          periodStart: targetForm.periodStart,
          periodEnd: targetForm.periodEnd,
          callsTarget: Number(targetForm.callsTarget) || 0,
          meetingsTarget: Number(targetForm.meetingsTarget) || 0,
          visitsTarget: Number(targetForm.visitsTarget) || 0,
          salesTarget: Number(targetForm.salesTarget) || 0,
          revenueTarget: Number(targetForm.revenueTarget) || 0,
        }),
      },
      ),
    onSuccess: () => {
      setError(null);
      setEditingTargetId(null);
      void qc.invalidateQueries({ queryKey: ['performance-summary'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteTarget = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/performance/targets/${id}`, {
        method: 'DELETE',
        accessToken,
      }),
    onSuccess: () => {
      setError(null);
      setEditingTargetId(null);
      void qc.invalidateQueries({ queryKey: ['performance-summary'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  /** Loads an existing target into the form so Save issues a PATCH. */
  const startEditTarget = (t: Summary['targets'][number]) => {
    setEditingTargetId(t.id);
    setTargetForm({
      userId: t.user?.id ?? '',
      period: t.period,
      periodStart: t.periodStart.slice(0, 10),
      periodEnd: t.periodEnd.slice(0, 10),
      callsTarget: String(t.callsTarget),
      meetingsTarget: String(t.meetingsTarget),
      visitsTarget: String(t.visitsTarget),
      salesTarget: String(t.salesTarget),
      revenueTarget: String(t.revenueTarget),
    });
    setError(null);
  };

  const num = (v: string) => (v.trim() ? Number(v) : null);

  const recordSale = useMutation({
    mutationFn: () =>
      apiFetch('/api/performance/sales', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          leadId: saleForm.leadId.trim() || null,
          customerName: saleForm.customerName.trim() || null,
          customerPhone: saleForm.customerPhone.trim() || null,
          developer: saleForm.developer.trim() || null,
          project: saleForm.project.trim() || null,
          unitNo: saleForm.unitNo.trim() || null,
          pricePerSqft: num(saleForm.pricePerSqft),
          baseValue: num(saleForm.baseValue),
          commissionPercent: num(saleForm.commissionPercent),
          amount: Number(saleForm.amount) || 0,
          notes: saleForm.notes || null,
        }),
      }),
    onSuccess: () => {
      setSaleForm({
        leadId: '',
        customerName: '',
        customerPhone: '',
        developer: '',
        project: '',
        unitNo: '',
        pricePerSqft: '',
        baseValue: '',
        amount: '',
        commissionPercent: '',
        notes: '',
      });
      setError(null);
      void qc.invalidateQueries({ queryKey: ['performance-summary'] });
      void qc.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const chartData = useMemo(
    () =>
      (summary.data?.leaderboard ?? []).slice(0, 12).map((r) => ({
        name: r.name.split(' ')[0],
        dialled: r.dialled,
        calls: r.calls,
        meetings: r.meetings,
        visits: r.visits,
        sales: r.salesCount,
      })),
    [summary.data],
  );

  // Mirrors the server's calculation so the number is never a surprise.
  const commissionPreview = useMemo(() => {
    const pct = Number(saleForm.commissionPercent);
    const base =
      Number(saleForm.baseValue) || Number(saleForm.amount) || 0;
    if (!pct || !base) return '₹0';
    return `₹${Math.round((base * pct) / 100).toLocaleString('en-IN')}`;
  }, [saleForm.commissionPercent, saleForm.baseValue, saleForm.amount]);

  const totals = summary.data?.totals;
  const rangeLabel = summary.data
    ? `${new Date(summary.data.from).toLocaleDateString()} – ${new Date(summary.data.to).toLocaleDateString()}`
    : null;

  const onTarget = (e: FormEvent) => {
    e.preventDefault();
    createTarget.mutate();
  };

  const onSale = (e: FormEvent) => {
    e.preventDefault();
    recordSale.mutate();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Performance"
        description={
          rangeLabel
            ? `Targets, activity volume, and closed sales · ${rangeLabel}`
            : 'Targets, activity volume, and closed sales'
        }
        actions={
          <>
            <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  className={cn(
                    'h-8 rounded px-3 text-xs font-semibold',
                    period === p.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-navy hover:bg-surface-muted',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Input
              type="date"
              className="h-9 w-auto"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input
              type="date"
              className="h-9 w-auto"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            {isManager ? (
              <select
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                <option value="">All agents</option>
                {(users.data ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface-raised p-1 shadow-panel">
        {(
          [
            ['calls', 'Calls'],
            ['prospects', 'Prospects'],
            ['meetings', 'Meetings'],
            ['sales', 'Sales'],
            ['revenue', 'Revenue'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set('tab', id);
              setParams(next);
            }}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-semibold',
              tab === id
                ? 'bg-primary text-primary-foreground'
                : 'text-navy hover:bg-surface-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {summary.isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {(
              [
                [
                  'Target achievement',
                  `${totals?.revenueTarget ? Math.round(((totals.revenueAchieved ?? totals.revenue ?? 0) / totals.revenueTarget) * 100) : 0}%`,
                ],
                ['Calls logged', totals?.calls ?? 0],
                ['Site visits', (totals?.visits ?? 0) + (totals?.meetingsDone ?? 0)],
                ['Bookings', totals?.salesCount ?? 0],
                [
                  'Half-yearly progress',
                  `${totals?.halfYearRevenueTarget ? Math.round(((totals.halfYearRevenueAchieved ?? 0) / totals.halfYearRevenueTarget) * 100) : 0}%`,
                ],
                ['Weekly activity', totals?.weeklyActivity ?? 0],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-xl font-semibold text-navy">{value}</p>
              </div>
            ))}
          </div>

          {tab === 'calls' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Number of calls
                </p>
                <p className="mt-1 text-2xl font-semibold text-navy">{totals?.calls ?? 0}</p>
                <p className="text-xs text-muted-foreground">Dialled {totals?.dialled ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Number of lead updates
                </p>
                <p className="mt-1 text-2xl font-semibold text-navy">{totals?.leadUpdates ?? 0}</p>
              </div>
            </div>
          ) : null}

          {tab === 'prospects' ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ['Hot', totals?.prospectHot ?? 0],
                  ['Warm', totals?.prospectWarm ?? 0],
                  ['Cold', totals?.prospectCold ?? 0],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {label} prospects
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-navy">{value}</p>
                </div>
              ))}
            </div>
          ) : null}

          {tab === 'meetings' ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ['Meetings booked this week', totals?.meetingsBookedWeek ?? 0],
                  ['Meetings booked (period)', totals?.meetings ?? 0],
                  ['Meetings completed this week', totals?.meetingsDoneWeek ?? 0],
                  ['Meetings completed (period)', totals?.meetingsDone ?? 0],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-navy">{value}</p>
                </div>
              ))}
            </div>
          ) : null}

          {tab === 'sales' ? (
            <div className="overflow-auto rounded-lg border border-border bg-surface-raised shadow-panel">
              <div className="border-b border-border px-3 py-2 text-sm font-semibold text-navy">
                Sales booked · {totals?.salesCount ?? 0}
              </div>
              <ul className="divide-y divide-border text-sm">
                {(summary.data?.sales ?? []).map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-3 px-3 py-2">
                    <div>
                      <p className="font-medium text-navy">
                        {s.customerName ?? s.lead?.name ?? 'Sale'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.user.name}
                        {s.project ? ` · ${s.project}` : ''}
                        {' · '}
                        {new Date(s.closedAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <p className="font-semibold text-navy">
                      ₹{s.amount.toLocaleString('en-IN')}
                    </p>
                  </li>
                ))}
                {!summary.data?.sales.length ? (
                  <li className="px-3 py-6 text-center text-muted-foreground">
                    No sales in this period.
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {tab === 'revenue' ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-primary/40 bg-surface-raised p-3 shadow-panel">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Total revenue target
                </p>
                <p className="mt-1 text-2xl font-semibold text-navy">
                  {rupee(totals?.revenueTarget ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Achieved revenue
                </p>
                <p className="mt-1 text-2xl font-semibold text-navy">
                  {rupee(totals?.revenueAchieved ?? totals?.revenue ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Previous-quarter achievement
                </p>
                <p className="mt-1 text-2xl font-semibold text-navy">
                  {totals?.prevQuarterPct != null ? `${totals.prevQuarterPct}%` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  vs {rupee(totals?.prevQuarterRevenue ?? 0)} last quarter
                </p>
              </div>
            </div>
          ) : null}

          {tab === 'calls' || tab === 'meetings' || tab === 'sales' ? (
          <div className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel">
            <h3 className="mb-2 text-sm font-semibold text-navy">
              Team activity
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                {tab === 'calls' ? (
                  <>
                    <Bar dataKey="dialled" fill="#8b5cf6" name="Dialled" />
                    <Bar dataKey="calls" fill="#3b82f6" name="Calls logged" />
                  </>
                ) : null}
                {tab === 'meetings' ? (
                  <>
                    <Bar dataKey="meetings" fill="#0ea5e9" name="Meetings" />
                    <Bar dataKey="visits" fill="#64748b" name="Visits" />
                  </>
                ) : null}
                {tab === 'sales' ? (
                  <Bar dataKey="sales" fill="#10b981" name="Sales" />
                ) : null}
              </BarChart>
            </ResponsiveContainer>
          </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-auto rounded-lg border border-border bg-surface-raised shadow-panel">
              <div className="border-b border-border px-3 py-2 text-sm font-semibold text-navy">
                Leaderboard
              </div>
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Agent</th>
                    {tab === 'calls' ? (
                      <>
                        <th className="px-3 py-2">Dialled</th>
                        <th className="px-3 py-2">Calls</th>
                      </>
                    ) : null}
                    {tab === 'meetings' ? (
                      <>
                        <th className="px-3 py-2">Meetings</th>
                        <th className="px-3 py-2">Completed</th>
                        <th className="px-3 py-2">Points</th>
                      </>
                    ) : null}
                    {tab === 'sales' || tab === 'revenue' ? (
                      <>
                        <th className="px-3 py-2">Sales</th>
                        <th className="px-3 py-2">Revenue</th>
                      </>
                    ) : null}
                    {tab === 'prospects' ? (
                      <th className="px-3 py-2">Calls</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {(summary.data?.leaderboard ?? []).map((r) => (
                    <tr key={r.userId} className="border-t border-border/70">
                      <td className="px-3 py-2 font-medium text-navy">
                        {r.name}
                      </td>
                      {tab === 'calls' ? (
                        <>
                          <td className="px-3 py-2 font-semibold text-navy">
                            {r.dialled}
                          </td>
                          <td className="px-3 py-2">{r.calls}</td>
                        </>
                      ) : null}
                      {tab === 'meetings' ? (
                        <>
                          <td className="px-3 py-2">{r.meetings}</td>
                          <td className="px-3 py-2">{r.meetingsDone}</td>
                          <td className="px-3 py-2">{r.meetingPoints ?? 0}</td>
                        </>
                      ) : null}
                      {tab === 'sales' || tab === 'revenue' ? (
                        <>
                          <td className="px-3 py-2">{r.salesCount}</td>
                          <td className="px-3 py-2">
                            ₹{r.revenue.toLocaleString('en-IN')}
                          </td>
                        </>
                      ) : null}
                      {tab === 'prospects' ? (
                        <td className="px-3 py-2">{r.calls}</td>
                      ) : null}
                    </tr>
                  ))}
                  {!summary.data?.leaderboard.length ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        No activity in this period.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {tab === 'revenue' ? (
            <div className="overflow-auto rounded-lg border border-border bg-surface-raised shadow-panel">
              <div className="border-b border-border px-3 py-2 text-sm font-semibold text-navy">
                Active targets
              </div>
              <ul className="divide-y divide-border text-sm">
                {(summary.data?.targets ?? []).map((t) => (
                  <li
                    key={t.id}
                    className={cn(
                      'flex items-start justify-between gap-3 px-3 py-2',
                      editingTargetId === t.id && 'bg-primary-muted',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-navy">
                        {t.user?.name ?? 'Team'} · {t.period}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(t.periodStart).toLocaleDateString()} –{' '}
                        {new Date(t.periodEnd).toLocaleDateString()} · calls{' '}
                        {t.callsTarget} · meetings {t.meetingsTarget} · sales{' '}
                        {t.salesTarget} · ₹
                        {t.revenueTarget.toLocaleString('en-IN')}
                      </div>
                    </div>
                    {isManager ? (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startEditTarget(t)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          disabled={deleteTarget.isPending}
                          onClick={() => deleteTarget.mutate(t.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
                {!summary.data?.targets.length ? (
                  <li className="px-3 py-6 text-center text-muted-foreground">
                    No targets set.
                  </li>
                ) : null}
              </ul>
            </div>
            ) : null}
          </div>
        </>
      )}

      {tab === 'sales' || tab === 'revenue' ? (
      <div className="grid gap-4 lg:grid-cols-2">
        {tab === 'sales' ? (
        <form
          onSubmit={onSale}
          className="space-y-3 rounded-lg border border-border bg-surface-raised p-4 shadow-panel"
        >
          <h3 className="text-sm font-semibold text-navy">Record a sale</h3>

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['customerName', 'Customer name', 'text', true],
                ['customerPhone', 'Customer number', 'text', false],
                ['developer', 'Developer', 'text', false],
                ['project', 'Project', 'text', false],
                ['unitNo', 'Unit no', 'text', false],
                ['pricePerSqft', 'Per sqft price (₹)', 'number', false],
                ['baseValue', 'Base value (₹)', 'number', false],
                ['amount', 'Total sale value (₹)', 'number', true],
                ['commissionPercent', 'Commission %', 'number', false],
              ] as const
            ).map(([key, label, type, required]) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  className="mt-1"
                  type={type}
                  required={required}
                  step={key === 'commissionPercent' ? '0.01' : undefined}
                  value={saleForm[key]}
                  onChange={(e) =>
                    setSaleForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Commission is worked out as {commissionPreview} — the percentage of
            the base value, or of the total sale value when no base is given.
          </p>

          <div>
            <Label>Lead ID (optional)</Label>
            <Input
              className="mt-1"
              placeholder="UUID from the lead detail URL"
              value={saleForm.leadId}
              onChange={(e) =>
                setSaleForm((f) => ({ ...f, leadId: e.target.value }))
              }
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Input
              className="mt-1"
              value={saleForm.notes}
              onChange={(e) =>
                setSaleForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>
          <Button type="submit" disabled={recordSale.isPending}>
            {recordSale.isPending ? 'Saving…' : 'Close sale'}
          </Button>
        </form>
        ) : null}

        {tab === 'revenue' && isManager ? (
          <form
            onSubmit={onTarget}
            className="space-y-3 rounded-lg border border-border bg-surface-raised p-4 shadow-panel"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy">
                {editingTargetId ? 'Edit target' : 'Set target'}
              </h3>
              {editingTargetId ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => setEditingTargetId(null)}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
            <div>
              <Label>Period</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                value={targetForm.period}
                onChange={(e) =>
                  setTargetForm((f) => ({ ...f, period: e.target.value }))
                }
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Agent</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                value={targetForm.userId}
                onChange={(e) =>
                  setTargetForm((f) => ({ ...f, userId: e.target.value }))
                }
              >
                <option value="">Team-wide</option>
                {(users.data ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Period start</Label>
                <Input
                  className="mt-1"
                  type="date"
                  required
                  value={targetForm.periodStart}
                  onChange={(e) =>
                    setTargetForm((f) => ({
                      ...f,
                      periodStart: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Period end</Label>
                <Input
                  className="mt-1"
                  type="date"
                  required
                  value={targetForm.periodEnd}
                  onChange={(e) =>
                    setTargetForm((f) => ({ ...f, periodEnd: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(
                [
                  ['callsTarget', 'Calls'],
                  ['meetingsTarget', 'Meetings'],
                  ['visitsTarget', 'Visits'],
                  ['salesTarget', 'Sales'],
                  ['revenueTarget', 'Revenue ₹'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    value={targetForm[key]}
                    onChange={(e) =>
                      setTargetForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            <Button type="submit" disabled={createTarget.isPending}>
              {createTarget.isPending
                ? 'Saving…'
                : editingTargetId
                  ? 'Save changes'
                  : 'Save target'}
            </Button>
          </form>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
