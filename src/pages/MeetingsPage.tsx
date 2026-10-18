import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarPlus, Pencil, Trash2, Trophy } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { DataTable, TableSkeleton } from '@/components/ui/data-table';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useConfirm } from '@/lib/confirm';
import { LeadRegistrationPanel } from '@/pages/LeadRegistrationsPage';
import { cn } from '@/lib/utils';
import {
  normalizeListEnvelope,
  useTablePagination,
  type ListEnvelope,
} from '@/hooks/useTablePagination';

type MeetingRow = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  altPhone: string | null;
  email: string | null;
  developer: string | null;
  project: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  status: string;
  comments: string | null;
  user: { id: string; name: string; email: string } | null;
  lead: { id: string; name: string; leadNo: number } | null;
};

type UserRow = { id: string; name: string };

type MeetingStats = {
  period: Period | null;
  from: string;
  to: string;
  totals: {
    total: number;
    completed: number;
    scheduled: number;
    cancelled: number;
    noShow: number;
  };
  top: { userId: string; name: string; total: number; completed: number } | null;
  leaderboard: {
    userId: string;
    name: string;
    total: number;
    completed: number;
    scheduled: number;
    cancelled: number;
    noShow: number;
  }[];
  trend: { date: string; count: number }[];
};

type Period = 'DAILY' | 'WEEKLY' | 'MONTHLY';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'DAILY', label: 'Today' },
  { value: 'WEEKLY', label: 'This week' },
  { value: 'MONTHLY', label: 'This month' },
];

/** Leader gets the accent fill, everyone else the muted one. */
const BAR_LEAD = '#10b981';
const BAR_REST = '#7a9bbf';

const STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:
    'border-sky-600/40 bg-sky-500/15 text-sky-800 dark:border-sky-400/30 dark:text-sky-200',
  COMPLETED:
    'border-emerald-600/40 bg-emerald-500/15 text-emerald-800 dark:border-emerald-400/30 dark:text-emerald-200',
  CANCELLED:
    'border-slate-500/40 bg-slate-500/15 text-slate-700 dark:border-slate-400/30 dark:text-slate-200',
  NO_SHOW:
    'border-rose-600/40 bg-rose-500/15 text-rose-800 dark:border-rose-400/30 dark:text-rose-200',
};

type MeetingForm = {
  userId: string;
  customerName: string;
  customerPhone: string;
  altPhone: string;
  email: string;
  developer: string;
  project: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  comments: string;
};

const EMPTY_FORM: MeetingForm = {
  userId: '',
  customerName: '',
  customerPhone: '',
  altPhone: '',
  email: '',
  developer: '',
  project: '',
  location: '',
  date: '',
  startTime: '10:00',
  endTime: '11:00',
  status: 'SCHEDULED',
  comments: '',
};

/** "2026-09-17" + "10:00" -> ISO instant, or null when the date is missing. */
function toIso(date: string, time: string) {
  if (!date) return null;
  const parsed = new Date(`${date}T${time || '00:00'}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function splitIso(iso: string | null) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function MeetingsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const isManager = role === 'SUPERADMIN' || role === 'MANAGER';
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'register' ? 'register' : 'meetings';
  const confirm = useConfirm();
  const qc = useQueryClient();
  const { page, limit, setPage, setLimit, resetPage } = useTablePagination(25);
  const [period, setPeriod] = useState<Period>('MONTHLY');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MeetingForm>(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (key: keyof MeetingForm) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const query = useQuery({
    queryKey: ['meetings', statusFilter, ownerFilter, page, limit],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter) sp.set('status', statusFilter);
      if (ownerFilter) sp.set('userId', ownerFilter);
      const envelope = await apiFetch<ListEnvelope<MeetingRow>>(
        `/api/meetings?${sp}`,
        { accessToken },
      );
      return normalizeListEnvelope(envelope);
    },
  });

  const stats = useQuery({
    queryKey: ['meeting-stats', period, ownerFilter],
    queryFn: () => {
      const sp = new URLSearchParams({ period });
      if (ownerFilter) sp.set('userId', ownerFilter);
      return apiFetch<MeetingStats>(`/api/meetings/stats?${sp}`, {
        accessToken,
      });
    },
  });

  const catalog = useQuery({
    queryKey: ['lead-catalog'],
    queryFn: () =>
      apiFetch<{ projects: { id: string; name: string }[] }>(
        '/api/lead-settings/catalog',
        { accessToken },
      ),
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

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const save = useMutation({
    mutationFn: () => {
      const startAt = toIso(form.date, form.startTime);
      if (!startAt) throw new Error('Pick a date and start time');
      const body = {
        ...(isManager && form.userId ? { userId: form.userId } : {}),
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim() || null,
        altPhone: form.altPhone.trim() || null,
        email: form.email.trim() || null,
        developer: form.developer.trim() || null,
        project: form.project.trim() || null,
        location: form.location.trim() || null,
        startAt,
        endAt: form.endTime ? toIso(form.date, form.endTime) : null,
        status: form.status,
        comments: form.comments.trim() || null,
      };
      return apiFetch<MeetingRow>(
        editingId ? `/api/meetings/${editingId}` : '/api/meetings',
        {
          method: editingId ? 'PATCH' : 'POST',
          accessToken,
          body: JSON.stringify(body),
        },
      );
    },
    onSuccess: () => {
      closeForm();
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: ['meeting-stats'] });
      void qc.invalidateQueries({ queryKey: ['performance-summary'] });
      void qc.invalidateQueries({ queryKey: ['lead-registrations'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/meetings/${id}`, { method: 'DELETE', accessToken }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: ['meeting-stats'] });
      void qc.invalidateQueries({ queryKey: ['performance-summary'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const startEdit = (row: MeetingRow) => {
    const start = splitIso(row.startAt);
    const end = splitIso(row.endAt);
    setEditingId(row.id);
    setForm({
      userId: row.user?.id ?? '',
      customerName: row.customerName,
      customerPhone: row.customerPhone ?? '',
      altPhone: row.altPhone ?? '',
      email: row.email ?? '',
      developer: row.developer ?? '',
      project: row.project ?? '',
      location: row.location ?? '',
      date: start.date,
      startTime: start.time,
      endTime: end.time,
      status: row.status,
      comments: row.comments ?? '',
    });
    setFormOpen(true);
    setError(null);
  };

  const columns: ColumnDef<MeetingRow>[] = useMemo(
    () => [
      {
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-navy">
              {row.original.customerName}
            </div>
            {row.original.customerPhone ? (
              <a
                href={`tel:${row.original.customerPhone.replace(/[^\d+]/g, '')}`}
                className="text-xs text-primary hover:underline"
              >
                {row.original.customerPhone}
              </a>
            ) : null}
          </div>
        ),
      },
      {
        id: 'user',
        header: 'User',
        cell: ({ row }) => (
          <span className="text-xs text-navy">
            {row.original.user?.name ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'project',
        header: 'Project',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.project || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'location',
        header: 'Location',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.location || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'startAt',
        header: 'Start time',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.startAt).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        accessorKey: 'endAt',
        header: 'End time',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.endAt
              ? new Date(row.original.endAt).toLocaleString('en-IN', {
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              STATUS_COLORS[row.original.status] ??
                'border-border bg-muted text-muted-foreground',
            )}
          >
            {STATUS_LABELS[row.original.status] ?? row.original.status}
          </span>
        ),
      },
      {
        accessorKey: 'comments',
        header: 'Comments',
        cell: ({ row }) => (
          <span
            className="block max-w-[220px] truncate text-xs text-muted-foreground"
            title={row.original.comments ?? undefined}
          >
            {row.original.comments || '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => startEdit(row.original)}
            >
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              disabled={remove.isPending}
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete meeting with ${row.original.customerName}?`,
                  description: 'This cannot be undone.',
                  confirmLabel: 'Delete',
                  variant: 'danger',
                });
                if (!ok) return;
                remove.mutate(row.original.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ),
      },
    ],
    [confirm, remove],
  );

  const total = query.data?.meta?.total ?? query.data?.data?.length ?? 0;
  const board = stats.data?.leaderboard ?? [];
  const topTotal = board[0]?.total ?? 0;

  const boardChart = useMemo(
    () =>
      board.slice(0, 12).map((r) => ({
        name: r.name.split(' ')[0],
        meetings: r.total,
        isLeader: r.total === topTotal && topTotal > 0,
      })),
    [board, topTotal],
  );

  const trendChart = useMemo(
    () =>
      (stats.data?.trend ?? []).map((t) => ({
        label: new Date(`${t.date}T00:00:00`).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        }),
        count: t.count,
      })),
    [stats.data?.trend],
  );

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
        <button
          type="button"
          className={cn(
            'h-8 rounded px-3 text-xs font-semibold',
            tab === 'meetings'
              ? 'bg-primary text-primary-foreground'
              : 'text-navy hover:bg-surface-muted',
          )}
          onClick={() => {
            const next = new URLSearchParams(params);
            next.delete('tab');
            setParams(next, { replace: true });
          }}
        >
          Meetings
        </button>
        <button
          type="button"
          className={cn(
            'h-8 rounded px-3 text-xs font-semibold',
            tab === 'register'
              ? 'bg-primary text-primary-foreground'
              : 'text-navy hover:bg-surface-muted',
          )}
          onClick={() => {
            const next = new URLSearchParams(params);
            next.set('tab', 'register');
            setParams(next, { replace: true });
          }}
        >
          Lead registration
        </button>
      </div>

      {tab === 'register' ? (
        <LeadRegistrationPanel variant="agent" />
      ) : (
        <>
      <PageHeader
        title="Meetings"
        description={`${total} meeting(s) · counted in the performance dashboard`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
            <select
              className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                resetPage();
              }}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {isManager ? (
              <select
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
                value={ownerFilter}
                onChange={(e) => {
                  setOwnerFilter(e.target.value);
                  resetPage();
                }}
              >
                <option value="">All users</option>
                {(users.data ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            ) : null}
            <Button
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
                setFormOpen(true);
              }}
            >
              <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
              Add meeting
            </Button>
          </div>
        }
      />

      {error && !formOpen ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(
          [
            ['Total meetings', stats.data?.totals.total ?? 0],
            ['Completed', stats.data?.totals.completed ?? 0],
            ['Scheduled', stats.data?.totals.scheduled ?? 0],
            ['Cancelled', stats.data?.totals.cancelled ?? 0],
            ['No show', stats.data?.totals.noShow ?? 0],
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

      {stats.data?.top ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 shadow-[0_0_24px_-8px_rgba(16,185,129,0.6)]">
          <Trophy className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
              Highest meetings
            </p>
            <p className="text-sm font-semibold text-navy">
              {stats.data.top.name} · {stats.data.top.total} meeting
              {stats.data.top.total === 1 ? '' : 's'}
              <span className="ml-1.5 font-normal text-muted-foreground">
                ({stats.data.top.completed} completed)
              </span>
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel">
          <h3 className="mb-2 text-sm font-semibold text-navy">
            Meetings by user
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={boardChart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="meetings" name="Meetings" radius={[4, 4, 0, 0]}>
                {boardChart.map((entry, i) => (
                  <Cell
                    key={`${entry.name}-${i}`}
                    fill={entry.isLeader ? BAR_LEAD : BAR_REST}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel">
          <h3 className="mb-2 text-sm font-semibold text-navy">
            Meetings over time
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendChart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                name="Meetings"
                stroke={BAR_LEAD}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-border bg-surface-raised shadow-panel">
        <div className="border-b border-border px-3 py-2 text-sm font-semibold text-navy">
          Meetings leaderboard
        </div>
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Meetings</th>
              <th className="px-3 py-2">Completed</th>
              <th className="px-3 py-2">Scheduled</th>
              <th className="px-3 py-2">Cancelled</th>
              <th className="px-3 py-2">No show</th>
            </tr>
          </thead>
          <tbody>
            {board.map((r, i) => (
              <tr
                key={r.userId}
                className={cn(
                  'border-t border-border/70',
                  i === 0 && r.total > 0 && 'bg-emerald-500/10',
                )}
              >
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {i + 1}
                </td>
                <td className="px-3 py-2 font-medium text-navy">
                  {i === 0 && r.total > 0 ? (
                    <Trophy className="mr-1 inline h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                  ) : null}
                  {r.name}
                </td>
                <td className="px-3 py-2 font-semibold text-navy">{r.total}</td>
                <td className="px-3 py-2">{r.completed}</td>
                <td className="px-3 py-2">{r.scheduled}</td>
                <td className="px-3 py-2">{r.cancelled}</td>
                <td className="px-3 py-2">{r.noShow}</td>
              </tr>
            ))}
            {!board.length ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  No meetings in this period.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {query.isLoading ? (
        <TableSkeleton />
      ) : (
        <DataTable
          columns={columns}
          data={query.data?.data ?? []}
          emptyMessage="No meetings yet."
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

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <form
            className="max-h-[92vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-t-xl border border-border bg-surface-raised p-4 shadow-xl sm:rounded-lg"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-navy">
                {editingId ? 'Edit meeting' : 'Add meeting'}
              </h2>
              <button
                type="button"
                className="text-muted-foreground hover:text-navy"
                onClick={closeForm}
              >
                ✕
              </button>
            </div>

            {error ? (
              <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Client name</Label>
                <Input
                  className="mt-1"
                  required
                  value={form.customerName}
                  onChange={(e) => setField('customerName')(e.target.value)}
                />
              </div>
              <div>
                <Label>Number</Label>
                <Input
                  className="mt-1"
                  value={form.customerPhone}
                  onChange={(e) => setField('customerPhone')(e.target.value)}
                />
              </div>
              <div>
                <Label>Alternative number</Label>
                <Input
                  className="mt-1"
                  value={form.altPhone}
                  onChange={(e) => setField('altPhone')(e.target.value)}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  className="mt-1"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email')(e.target.value)}
                />
              </div>
              <div>
                <Label>Developer name</Label>
                <Input
                  className="mt-1"
                  value={form.developer}
                  onChange={(e) => setField('developer')(e.target.value)}
                />
              </div>
              <div>
                <Label>Project name</Label>
                {(catalog.data?.projects.length ?? 0) > 0 ? (
                  <select
                    multiple
                    className="mt-1 h-24 w-full rounded-md border border-border bg-surface px-2 text-sm"
                    value={form.project
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)}
                    onChange={(e) => {
                      const values = [...e.target.selectedOptions].map(
                        (o) => o.value,
                      );
                      setField('project')(values.join(', '));
                    }}
                  >
                    {catalog.data?.projects.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    className="mt-1"
                    value={form.project}
                    onChange={(e) => setField('project')(e.target.value)}
                  />
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Hold Cmd/Ctrl to select multiple projects.
                </p>
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  className="mt-1"
                  value={form.location}
                  onChange={(e) => setField('location')(e.target.value)}
                />
              </div>
              <div>
                <Label>Site visit date</Label>
                <Input
                  className="mt-1"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setField('date')(e.target.value)}
                />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                  value={form.status}
                  onChange={(e) => setField('status')(e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Site visit time</Label>
                <Input
                  className="mt-1"
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) => setField('startTime')(e.target.value)}
                />
              </div>
              <div>
                <Label>End time</Label>
                <Input
                  className="mt-1"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setField('endTime')(e.target.value)}
                />
              </div>
              {isManager ? (
                <div className="sm:col-span-2">
                  <Label>User</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                    value={form.userId}
                    onChange={(e) => setField('userId')(e.target.value)}
                  >
                    <option value="">Me</option>
                    {(users.data ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <Label>Comments</Label>
                <textarea
                  className="mt-1 min-h-[88px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={form.comments}
                  onChange={(e) => setField('comments')(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending
                  ? 'Saving…'
                  : editingId
                    ? 'Save changes'
                    : 'Add meeting'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
        </>
      )}
    </div>
  );
}
