import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
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
import { useAuthStore } from '@/stores/auth';
import {
  normalizeListEnvelope,
  type ListEnvelope,
} from '@/hooks/useTablePagination';

type Summary = {
  from: string;
  to: string;
  totals: {
    calls: number;
    meetings: number;
    visits: number;
    salesCount: number;
    revenue: number;
    commission: number;
  };
  leaderboard: {
    userId: string;
    name: string;
    calls: number;
    meetings: number;
    visits: number;
    whatsapp: number;
    emails: number;
    salesCount: number;
    revenue: number;
    commission: number;
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
    closedAt: string;
    user: { id: string; name: string };
    lead: { id: string; name: string };
  }[];
};

type UserRow = { id: string; name: string };

export function PerformancePage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const isManager = role === 'SUPERADMIN' || role === 'MANAGER';
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
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
    amount: '',
    commission: '0',
    notes: '',
  });

  const summary = useQuery({
    queryKey: ['performance-summary', userId],
    queryFn: () => {
      const sp = new URLSearchParams();
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
      apiFetch('/api/performance/targets', {
        method: 'POST',
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
      }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['performance-summary'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const recordSale = useMutation({
    mutationFn: () =>
      apiFetch('/api/performance/sales', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          leadId: saleForm.leadId.trim(),
          amount: Number(saleForm.amount) || 0,
          commission: Number(saleForm.commission) || 0,
          notes: saleForm.notes || null,
        }),
      }),
    onSuccess: () => {
      setSaleForm({ leadId: '', amount: '', commission: '0', notes: '' });
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
        calls: r.calls,
        meetings: r.meetings,
        visits: r.visits,
        sales: r.salesCount,
      })),
    [summary.data],
  );

  const totals = summary.data?.totals;

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
        description="Targets, activity volume, and closed sales"
        actions={
          isManager ? (
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
          ) : undefined
        }
      />

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
                ['Calls', totals?.calls ?? 0],
                ['Meetings', totals?.meetings ?? 0],
                ['Visits', totals?.visits ?? 0],
                ['Sales', totals?.salesCount ?? 0],
                [
                  'Revenue',
                  `₹${((totals?.revenue ?? 0) / 100000).toFixed(1)}L`,
                ],
                [
                  'Commission',
                  `₹${((totals?.commission ?? 0) / 1000).toFixed(0)}k`,
                ],
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
                <Bar dataKey="calls" fill="#3b82f6" name="Calls" />
                <Bar dataKey="meetings" fill="#0ea5e9" name="Meetings" />
                <Bar dataKey="visits" fill="#64748b" name="Visits" />
                <Bar dataKey="sales" fill="#10b981" name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-auto rounded-lg border border-border bg-surface-raised shadow-panel">
              <div className="border-b border-border px-3 py-2 text-sm font-semibold text-navy">
                Leaderboard
              </div>
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Agent</th>
                    <th className="px-3 py-2">Calls</th>
                    <th className="px-3 py-2">Sales</th>
                    <th className="px-3 py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary.data?.leaderboard ?? []).map((r) => (
                    <tr key={r.userId} className="border-t border-border/70">
                      <td className="px-3 py-2 font-medium text-navy">
                        {r.name}
                      </td>
                      <td className="px-3 py-2">{r.calls}</td>
                      <td className="px-3 py-2">{r.salesCount}</td>
                      <td className="px-3 py-2">
                        ₹{r.revenue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {!summary.data?.leaderboard.length ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        No activity in this period.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="overflow-auto rounded-lg border border-border bg-surface-raised shadow-panel">
              <div className="border-b border-border px-3 py-2 text-sm font-semibold text-navy">
                Active targets
              </div>
              <ul className="divide-y divide-border text-sm">
                {(summary.data?.targets ?? []).map((t) => (
                  <li key={t.id} className="px-3 py-2">
                    <div className="font-medium text-navy">
                      {t.user?.name ?? 'Team'} · {t.period}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.periodStart).toLocaleDateString()} –{' '}
                      {new Date(t.periodEnd).toLocaleDateString()} · calls{' '}
                      {t.callsTarget} · sales {t.salesTarget} · ₹
                      {t.revenueTarget.toLocaleString('en-IN')}
                    </div>
                  </li>
                ))}
                {!summary.data?.targets.length ? (
                  <li className="px-3 py-6 text-center text-muted-foreground">
                    No targets set.
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={onSale}
          className="space-y-3 rounded-lg border border-border bg-surface-raised p-4 shadow-panel"
        >
          <h3 className="text-sm font-semibold text-navy">Record a sale</h3>
          <div>
            <Label>Lead ID</Label>
            <Input
              className="mt-1"
              required
              placeholder="UUID from lead detail URL"
              value={saleForm.leadId}
              onChange={(e) =>
                setSaleForm((f) => ({ ...f, leadId: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Amount (₹)</Label>
              <Input
                className="mt-1"
                type="number"
                required
                value={saleForm.amount}
                onChange={(e) =>
                  setSaleForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Commission (₹)</Label>
              <Input
                className="mt-1"
                type="number"
                value={saleForm.commission}
                onChange={(e) =>
                  setSaleForm((f) => ({ ...f, commission: e.target.value }))
                }
              />
            </div>
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
            Close sale
          </Button>
        </form>

        {isManager ? (
          <form
            onSubmit={onTarget}
            className="space-y-3 rounded-lg border border-border bg-surface-raised p-4 shadow-panel"
          >
            <h3 className="text-sm font-semibold text-navy">Set target</h3>
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
              Save target
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
