import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/data-table';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useConfirm } from '@/lib/confirm';

type LeaveRow = {
  id: string;
  fromDate: string;
  toDate: string;
  type: string;
  reason: string | null;
  status: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  approvedBy: { id: string; name: string } | null;
};

type LeaveQuota = {
  used: number;
  limit: number;
  remaining: number;
  unpaidOnly: boolean;
  month: string;
};

type LeaveList = {
  requests: LeaveRow[];
  quota: LeaveQuota;
};

const QUOTA_TYPES = new Set(['CASUAL', 'SICK', 'PAID', 'EARNED', 'HALF_DAY']);

const LEAVE_TYPES: { value: string; label: string }[] = [
  { value: 'CASUAL', label: 'Casual' },
  { value: 'SICK', label: 'Sick' },
  { value: 'PAID', label: 'Paid' },
  { value: 'HALF_DAY', label: 'Half day' },
  { value: 'UNPAID', label: 'Unpaid' },
];

function typeLabel(type: string) {
  return LEAVE_TYPES.find((t) => t.value === type)?.label ?? type;
}

function statusTone(s: string): 'warning' | 'success' | 'danger' | 'neutral' {
  if (s === 'PENDING') return 'warning';
  if (s === 'APPROVED') return 'success';
  if (s === 'REJECTED') return 'danger';
  return 'neutral';
}

export function LeavePage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const confirm = useConfirm();
  const isManager = role === 'SUPERADMIN' || role === 'MANAGER';
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fromDate: '',
    toDate: '',
    type: 'CASUAL',
    reason: '',
  });

  const list = useQuery({
    queryKey: ['leave'],
    queryFn: async () => {
      const data = await apiFetch<LeaveRow[] | LeaveList>('/api/leave', {
        accessToken,
      });
      if (Array.isArray(data)) {
        return { requests: data, quota: null as LeaveQuota | null };
      }
      return data;
    },
  });

  const quota = list.data?.quota ?? null;
  const unpaidOnly = Boolean(quota?.unpaidOnly);
  const isHalfDay = form.type === 'HALF_DAY';

  useEffect(() => {
    if (unpaidOnly && form.type !== 'UNPAID') {
      setForm((f) => ({ ...f, type: 'UNPAID' }));
    }
  }, [unpaidOnly, form.type]);

  useEffect(() => {
    if (form.type === 'HALF_DAY' && form.fromDate && form.toDate !== form.fromDate) {
      setForm((f) => ({ ...f, toDate: f.fromDate }));
    }
  }, [form.type, form.fromDate, form.toDate]);

  const apply = useMutation({
    mutationFn: () =>
      apiFetch('/api/leave', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          fromDate: form.fromDate,
          toDate: isHalfDay ? form.fromDate : form.toDate,
          type: form.type,
          reason: form.reason.trim() || null,
        }),
      }),
    onSuccess: () => {
      setForm({
        fromDate: '',
        toDate: '',
        type: unpaidOnly ? 'UNPAID' : 'CASUAL',
        reason: '',
      });
      setError(null);
      void qc.invalidateQueries({ queryKey: ['leave'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      apiFetch(`/api/leave/${id}/${action}`, {
        method: 'PATCH',
        accessToken,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['leave'] }),
    onError: (e: Error) => setError(e.message),
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (unpaidOnly && QUOTA_TYPES.has(form.type)) {
      setError('You already used 2 leaves this month. Only unpaid leave is available.');
      return;
    }
    const ok = await confirm({
      title: 'Submit leave request?',
      description: 'Your manager will need to approve this request.',
      confirmLabel: 'Submit',
    });
    if (!ok) return;
    apply.mutate();
  };

  const rows = list.data?.requests ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leave"
        description="Apply for leave and track approvals"
      />

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {quota ? (
        <p className="text-sm text-muted-foreground">
          {unpaidOnly
            ? `You have used ${quota.used} of ${quota.limit} paid/casual/sick/half-day leaves this month. Only unpaid leave is available.`
            : `${quota.remaining} of ${quota.limit} paid/casual/sick/half-day leaves remaining this month. Unpaid leave is always available.`}
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-panel sm:grid-cols-2 lg:grid-cols-5"
      >
        <div>
          <Label>From</Label>
          <Input
            className="mt-1"
            type="date"
            required
            value={form.fromDate}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                fromDate: e.target.value,
                toDate: f.type === 'HALF_DAY' ? e.target.value : f.toDate,
              }))
            }
          />
        </div>
        <div>
          <Label>To</Label>
          <Input
            className="mt-1"
            type="date"
            required={!isHalfDay}
            disabled={isHalfDay}
            value={isHalfDay ? form.fromDate : form.toDate}
            onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))}
          />
        </div>
        <div>
          <Label>Type</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm disabled:opacity-50"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            {LEAVE_TYPES.map((t) => {
              const locked = unpaidOnly && QUOTA_TYPES.has(t.value);
              return (
                <option key={t.value} value={t.value} disabled={locked}>
                  {t.label}
                  {locked ? ' (limit reached)' : ''}
                </option>
              );
            })}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <Label>Reason</Label>
          <Input
            className="mt-1"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          />
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-5">
          <Button type="submit" disabled={apply.isPending}>
            Apply leave
          </Button>
        </div>
      </form>

      {list.isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="overflow-auto rounded-lg border border-border bg-surface-raised shadow-panel">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-surface-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {isManager ? <th className="px-3 py-2">Employee</th> : null}
                <th className="px-3 py-2">Dates</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Reason</th>
                {isManager ? <th className="px-3 py-2">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/70">
                  {isManager ? (
                    <td className="px-3 py-2 font-medium text-navy">
                      {row.user.name}
                    </td>
                  ) : null}
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.type === 'HALF_DAY'
                      ? `${new Date(row.fromDate).toLocaleDateString()} (half day)`
                      : `${new Date(row.fromDate).toLocaleDateString()} – ${new Date(row.toDate).toLocaleDateString()}`}
                  </td>
                  <td className="px-3 py-2">{typeLabel(row.type)}</td>
                  <td className="px-3 py-2">
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                    {row.reason || '—'}
                  </td>
                  {isManager ? (
                    <td className="px-3 py-2">
                      {row.status === 'PENDING' ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={async () => {
                              const ok = await confirm({
                                title: `Approve leave for ${row.user.name}?`,
                                confirmLabel: 'Approve',
                              });
                              if (!ok) return;
                              decide.mutate({ id: row.id, action: 'approve' });
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={async () => {
                              const ok = await confirm({
                                title: `Reject leave for ${row.user.name}?`,
                                confirmLabel: 'Reject',
                                variant: 'danger',
                              });
                              if (!ok) return;
                              decide.mutate({ id: row.id, action: 'reject' });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : row.approvedBy ? (
                        <span className="text-xs text-muted-foreground">
                          by {row.approvedBy.name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td
                    colSpan={isManager ? 6 : 4}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No leave requests yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
