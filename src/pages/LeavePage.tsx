import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/data-table';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

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

function statusTone(s: string): 'warning' | 'success' | 'danger' | 'neutral' {
  if (s === 'PENDING') return 'warning';
  if (s === 'APPROVED') return 'success';
  if (s === 'REJECTED') return 'danger';
  return 'neutral';
}

export function LeavePage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
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
    queryFn: () => apiFetch<LeaveRow[]>('/api/leave', { accessToken }),
  });

  const apply = useMutation({
    mutationFn: () =>
      apiFetch('/api/leave', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          fromDate: form.fromDate,
          toDate: form.toDate,
          type: form.type,
          reason: form.reason.trim() || null,
        }),
      }),
    onSuccess: () => {
      setForm({ fromDate: '', toDate: '', type: 'CASUAL', reason: '' });
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

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    apply.mutate();
  };

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
            onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))}
          />
        </div>
        <div>
          <Label>To</Label>
          <Input
            className="mt-1"
            type="date"
            required
            value={form.toDate}
            onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))}
          />
        </div>
        <div>
          <Label>Type</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="CASUAL">Casual</option>
            <option value="SICK">Sick</option>
            <option value="EARNED">Earned</option>
            <option value="UNPAID">Unpaid</option>
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
              {(list.data ?? []).map((row) => (
                <tr key={row.id} className="border-b border-border/70">
                  {isManager ? (
                    <td className="px-3 py-2 font-medium text-navy">
                      {row.user.name}
                    </td>
                  ) : null}
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(row.fromDate).toLocaleDateString()} –{' '}
                    {new Date(row.toDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">{row.type}</td>
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
                            onClick={() =>
                              decide.mutate({ id: row.id, action: 'approve' })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              decide.mutate({ id: row.id, action: 'reject' })
                            }
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
              {!list.data?.length ? (
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
