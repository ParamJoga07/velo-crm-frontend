import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, TableSkeleton, tableShellClass, tableHeadClass, tableRowClass, tableCellClass } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import type { WeekAvailability, WeekDay } from '@velo/shared';

type AttendanceRow = {
  id: string;
  date: string;
  status: string;
  workedSec: number;
  firstLoginAt: string | null;
  lastLogoutAt: string | null;
  loginCount: number;
  user: { id: string; name: string; email: string; role: string };
};

type Summary = {
  today: {
    records: number;
    present: number;
    absent: number;
    workedSec: number;
  };
};

type TeamRow = { id: string; name: string };

type AvailabilityResponse = {
  days: WeekDay[];
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    team: { id: string; name: string } | null;
    availability: WeekAvailability;
  }[];
};

const DAY_LABELS: Record<WeekDay, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function formatHours(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

export function AttendancePage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const isManager = role === 'SUPERADMIN' || role === 'MANAGER';
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<'availability' | 'logs'>(
    isManager ? 'availability' : 'logs',
  );
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const teamId = searchParams.get('teamId') ?? '';
  const qc = useQueryClient();

  const teamsQuery = useQuery({
    queryKey: ['teams'],
    enabled: role !== 'USER',
    queryFn: () => apiFetch<TeamRow[]>('/api/users/teams', { accessToken }),
  });

  const selectedTeamName = useMemo(
    () => teamsQuery.data?.find((t) => t.id === teamId)?.name,
    [teamsQuery.data, teamId],
  );

  const availability = useQuery({
    queryKey: ['attendance-availability', teamId],
    enabled: isManager && tab === 'availability',
    queryFn: () => {
      const params = new URLSearchParams();
      if (teamId) params.set('teamId', teamId);
      return apiFetch<AvailabilityResponse>(
        `/api/attendance/availability?${params}`,
        { accessToken },
      );
    },
  });

  const toggleDay = useMutation({
    mutationFn: (input: { userId: string; day: WeekDay; available: boolean }) =>
      apiFetch(`/api/attendance/availability/${input.userId}`, {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({
          day: input.day,
          available: input.available,
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attendance-availability'] });
    },
  });

  const summary = useQuery({
    queryKey: ['attendance-summary'],
    enabled: tab === 'logs',
    queryFn: () =>
      apiFetch<Summary>('/api/attendance/summary', { accessToken }),
  });

  const query = useQuery({
    queryKey: ['attendance-records', from, to, status, teamId],
    enabled: tab === 'logs',
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (status) params.set('status', status);
      if (teamId) params.set('teamId', teamId);
      const res = await apiFetch<{
        data: AttendanceRow[];
        meta: { total?: number };
      }>(`/api/attendance/records?${params}`, { accessToken });
      return Array.isArray((res as { data?: AttendanceRow[] }).data)
        ? (res as { data: AttendanceRow[]; meta: { total?: number } })
        : { data: res as unknown as AttendanceRow[], meta: {} };
    },
  });

  const columns: ColumnDef<AttendanceRow>[] = [
    {
      id: 'user',
      header: 'User',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.user.name}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.user.email}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ getValue }) =>
        new Date(String(getValue())).toLocaleDateString(),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <Badge tone="accent">{String(getValue())}</Badge>,
    },
    {
      accessorKey: 'workedSec',
      header: 'Hours',
      cell: ({ getValue }) => formatHours(Number(getValue())),
    },
    {
      accessorKey: 'firstLoginAt',
      header: 'First login',
      cell: ({ getValue }) =>
        getValue() ? new Date(String(getValue())).toLocaleTimeString() : '—',
    },
    {
      accessorKey: 'lastLogoutAt',
      header: 'Last logout',
      cell: ({ getValue }) =>
        getValue() ? new Date(String(getValue())).toLocaleTimeString() : '—',
    },
    { accessorKey: 'loginCount', header: 'Logins' },
  ];

  const today = summary.data?.today;
  const days = availability.data?.days ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Attendance & Availability"
        description={
          selectedTeamName
            ? `Team: ${selectedTeamName}`
            : isManager
              ? 'Toggle who can receive leads each day of the week'
              : 'Your attendance sessions (auto-tracked from login/logout)'
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {isManager ? (
          <>
            <button
              type="button"
              onClick={() => setTab('availability')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium',
                tab === 'availability'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-surface text-navy',
              )}
            >
              Availability
            </button>
            <button
              type="button"
              onClick={() => setTab('logs')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium',
                tab === 'logs'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-surface text-navy',
              )}
            >
              Attendance logs
            </button>
          </>
        ) : null}
        {isManager ? (
          <div className="w-full sm:ml-auto sm:w-auto">
            <Label className="sr-only">Team</Label>
            <select
              className="h-9 w-full rounded-md border border-border bg-surface px-2 text-sm sm:w-auto"
              value={teamId}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams);
                if (e.target.value) next.set('teamId', e.target.value);
                else next.delete('teamId');
                setSearchParams(next);
              }}
            >
              <option value="">All teams</option>
              {(teamsQuery.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {tab === 'availability' && isManager ? (
        availability.isLoading ? (
          <TableSkeleton rows={8} />
        ) : (
          <div className={tableShellClass}>
            <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-navy">
                  Weekly availability
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Green = can receive leads · Grey = skipped for that day
                </p>
              </div>
              <div className="hidden items-center gap-3 text-[11px] sm:flex">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  On
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  Off
                </span>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="min-w-full border-collapse text-table">
                <thead>
                  <tr className={tableHeadClass}>
                    <th
                      className={cn(
                        tableCellClass,
                        'sticky left-0 z-20 min-w-[140px] border-r border-border bg-surface-muted sm:min-w-[200px]',
                      )}
                    >
                      Name
                    </th>
                    {days.map((d) => (
                      <th
                        key={d}
                        className={cn(tableCellClass, 'min-w-[88px] text-center')}
                      >
                        <span className="hidden lg:inline">{DAY_LABELS[d]}</span>
                        <span className="lg:hidden">
                          {DAY_LABELS[d].slice(0, 3)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(availability.data?.users ?? []).map((u) => (
                    <tr key={u.id} className={tableRowClass}>
                      <td
                        className={cn(
                          tableCellClass,
                          'sticky left-0 z-10 border-r border-border bg-surface-raised',
                        )}
                      >
                        <div className="font-medium text-navy">{u.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.team?.name ?? 'No team'} · {u.role}
                        </div>
                      </td>
                      {days.map((d) => {
                        const on = u.availability[d] !== false;
                        return (
                          <td key={d} className={cn(tableCellClass, 'text-center')}>
                            <button
                              type="button"
                              title={`${u.name} · ${DAY_LABELS[d]}: ${on ? 'Available' : 'Off'}`}
                              disabled={toggleDay.isPending}
                              onClick={() =>
                                toggleDay.mutate({
                                  userId: u.id,
                                  day: d,
                                  available: !on,
                                })
                              }
                              className={cn(
                                'mx-auto inline-flex h-6 w-11 items-center rounded-full p-0.5 transition-colors',
                                on ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600',
                                toggleDay.isPending && 'opacity-60',
                              )}
                            >
                              <span
                                className={cn(
                                  'inline-block h-5 w-5 rounded-full bg-white shadow transition',
                                  on ? 'translate-x-[18px]' : 'translate-x-0',
                                )}
                              />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {!availability.data?.users.length ? (
                    <tr>
                      <td
                        colSpan={(days.length || 7) + 1}
                        className="px-3 py-10 text-center text-sm text-muted-foreground"
                      >
                        No users in scope. Create team members first.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              Users toggled off for today are skipped during lead import
              round-robin assignment.
            </div>
          </div>
        )
      ) : (
        <>
          {today ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Today records" value={today.records} />
              <Stat label="Present" value={today.present} />
              <Stat label="Absent" value={today.absent} />
              <Stat label="Hours logged" value={formatHours(today.workedSec)} />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 rounded-md border border-border bg-surface-raised p-3 shadow-panel">
            <div>
              <Label>From</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>To</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div>
              <Label>Status</Label>
              <select
                className="mt-1.5 h-9 rounded-md border border-border bg-surface px-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="PRESENT">PRESENT</option>
                <option value="ABSENT">ABSENT</option>
                <option value="HALF_DAY">HALF_DAY</option>
              </select>
            </div>
          </div>

          {query.isLoading ? (
            <TableSkeleton />
          ) : (
            <DataTable
              columns={columns}
              data={query.data?.data ?? []}
              emptyMessage="No attendance records yet. Records appear after login."
            />
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-surface-raised p-3 shadow-panel">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-navy">{value}</div>
    </div>
  );
}
