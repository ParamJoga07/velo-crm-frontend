import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, TableSkeleton } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  team: { id: string; name: string } | null;
  createdAt: string;
};

type TeamRow = {
  id: string;
  name: string;
  department: { id: string; name: string } | null;
  _count: { members: number; users: number; managers: number };
  managers: {
    manager: { id: string; name: string; email: string };
  }[];
};

type TeamDetail = {
  id: string;
  name: string;
  department: { id: string; name: string } | null;
  roster: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone: string | null;
    isActive: boolean;
    isManager: boolean;
  }[];
  attendanceToday: {
    userId: string;
    status: string;
    workedSec: number;
    firstLoginAt: string | null;
    loginCount: number;
  }[];
};

function formatHours(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

export function UsersPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const me = useAuthStore((s) => s.user);
  const startImpersonation = useAuthStore((s) => s.startImpersonation);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<string | null>(null);

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: 'Password123!',
    role: 'USER',
    teamId: '',
    phone: '',
  });
  const [teamForm, setTeamForm] = useState({
    name: '',
    departmentName: 'Sales',
  });
  const [memberForm, setMemberForm] = useState({
    name: '',
    email: '',
    password: 'Password123!',
    role: 'USER',
    asManager: false,
    existingUserId: '',
  });

  const usersQuery = useQuery({
    queryKey: ['users', selectedTeamId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (selectedTeamId) params.set('teamId', selectedTeamId);
      const res = await apiFetch<{ data: UserRow[]; meta: { total?: number } }>(
        `/api/users?${params}`,
        { accessToken },
      );
      return Array.isArray((res as { data?: UserRow[] }).data)
        ? (res as { data: UserRow[]; meta: { total?: number } })
        : { data: res as unknown as UserRow[], meta: {} };
    },
  });

  const allUsersQuery = useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const res = await apiFetch<{ data: UserRow[]; meta: { total?: number } }>(
        '/api/users?limit=100',
        { accessToken },
      );
      return Array.isArray((res as { data?: UserRow[] }).data)
        ? (res as { data: UserRow[]; meta: { total?: number } })
        : { data: res as unknown as UserRow[], meta: {} };
    },
  });

  const teamsQuery = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiFetch<TeamRow[]>('/api/users/teams', { accessToken }),
  });

  const teamDetail = useQuery({
    queryKey: ['team-detail', selectedTeamId],
    enabled: !!selectedTeamId,
    queryFn: () =>
      apiFetch<TeamDetail>(`/api/users/teams/${selectedTeamId}`, {
        accessToken,
      }),
  });

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ['users'] });
    void qc.invalidateQueries({ queryKey: ['teams'] });
    void qc.invalidateQueries({ queryKey: ['team-detail'] });
  };

  const createUser = useMutation({
    mutationFn: () =>
      apiFetch('/api/users', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          name: userForm.name,
          email: userForm.email,
          password: userForm.password,
          role: userForm.role,
          phone: userForm.phone || null,
          teamId: userForm.teamId || selectedTeamId || null,
        }),
      }),
    onSuccess: () => {
      setShowUserForm(false);
      setUserForm({
        name: '',
        email: '',
        password: 'Password123!',
        role: 'USER',
        teamId: '',
        phone: '',
      });
      setError(null);
      invalidateAll();
    },
    onError: (e: Error) => setError(e.message),
  });

  const createTeam = useMutation({
    mutationFn: () =>
      apiFetch<TeamRow>('/api/users/teams', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          name: teamForm.name,
          departmentName: teamForm.departmentName || 'Sales',
        }),
      }),
    onSuccess: (team) => {
      setShowTeamForm(false);
      setTeamForm({ name: '', departmentName: 'Sales' });
      setSelectedTeamId(team.id);
      setError(null);
      invalidateAll();
    },
    onError: (e: Error) => setError(e.message),
  });

  const addMember = useMutation({
    mutationFn: () =>
      apiFetch(`/api/users/teams/${selectedTeamId}/members`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify(
          memberForm.existingUserId
            ? {
                userId: memberForm.existingUserId,
                asManager: memberForm.asManager,
              }
            : {
                name: memberForm.name,
                email: memberForm.email,
                password: memberForm.password,
                role: memberForm.role,
                asManager: memberForm.asManager,
              },
        ),
      }),
    onSuccess: () => {
      setMemberForm({
        name: '',
        email: '',
        password: 'Password123!',
        role: 'USER',
        asManager: false,
        existingUserId: '',
      });
      setError(null);
      invalidateAll();
    },
    onError: (e: Error) => setError(e.message),
  });

  const attendanceByUser = useMemo(() => {
    const map = new Map<string, TeamDetail['attendanceToday'][number]>();
    for (const row of teamDetail.data?.attendanceToday ?? []) {
      map.set(row.userId, row);
    }
    return map;
  }, [teamDetail.data]);

  const unassignedUsers = useMemo(() => {
    const rosterIds = new Set(
      (teamDetail.data?.roster ?? []).map((r) => r.id),
    );
    return (allUsersQuery.data?.data ?? []).filter((u) => !rosterIds.has(u.id));
  }, [allUsersQuery.data, teamDetail.data]);

  type RosterRow = TeamDetail['roster'][number];

  const rosterColumns: ColumnDef<RosterRow>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Member',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-navy">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.email}
            </div>
          </div>
        ),
      },
      {
        id: 'role',
        header: 'Role',
        cell: ({ row }) => (
          <Badge tone={row.original.isManager ? 'accent' : 'neutral'}>
            {row.original.isManager ? 'Manager' : row.original.role}
          </Badge>
        ),
      },
      {
        id: 'today',
        header: 'Today',
        cell: ({ row }) => {
          const att = attendanceByUser.get(row.original.id);
          return att ? (
            <Badge tone="success">{att.status}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
      },
      {
        id: 'hours',
        header: 'Hours',
        cell: ({ row }) => {
          const att = attendanceByUser.get(row.original.id);
          return (
            <span className="text-muted-foreground">
              {att ? formatHours(att.workedSec) : '—'}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="text-right">
            <button
              type="button"
              className="text-xs text-danger hover:underline"
              onClick={() =>
                void apiFetch(
                  `/api/users/teams/${selectedTeamId}/members/${row.original.id}`,
                  { method: 'DELETE', accessToken },
                ).then(invalidateAll)
              }
            >
              Remove
            </button>
          </div>
        ),
      },
    ],
    [attendanceByUser, selectedTeamId, accessToken],
  );

  const columns: ColumnDef<UserRow>[] = [
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.email}
          </div>
        </div>
      ),
    },
    { accessorKey: 'role', header: 'Role' },
    {
      id: 'team',
      header: 'Team',
      cell: ({ row }) => row.original.team?.name ?? '—',
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() =>
            void apiFetch(`/api/users/${row.original.id}`, {
              method: 'PATCH',
              accessToken,
              body: JSON.stringify({ isActive: !row.original.isActive }),
            }).then(invalidateAll)
          }
        >
          <Badge tone={row.original.isActive ? 'success' : 'danger'}>
            {row.original.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </button>
      ),
    },
    {
      id: 'actions',
      header: 'Admin',
      cell: ({ row }) => {
        const u = row.original;
        if (u.id === me?.id) {
          return <span className="text-xs text-muted-foreground">You</span>;
        }
        return (
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              className="h-7"
              disabled={!u.isActive}
              onClick={() => {
                void startImpersonation(u.id)
                  .then(() => {
                    void qc.clear();
                    navigate('/dashboard');
                  })
                  .catch((e: Error) => setError(e.message));
              }}
            >
              View as
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-7"
              onClick={() => {
                const custom = window.prompt(
                  `Reset password for ${u.email}. Leave blank to auto-generate.`,
                  '',
                );
                if (custom === null) return;
                void apiFetch<{
                  ok: boolean;
                  temporaryPassword: string;
                  email: string;
                }>(`/api/users/${u.id}/reset-password`, {
                  method: 'POST',
                  accessToken,
                  body: JSON.stringify(
                    custom.trim() ? { password: custom.trim() } : {},
                  ),
                })
                  .then((res) => {
                    setResetInfo(
                      `Password for ${res.email}: ${res.temporaryPassword}`,
                    );
                    setError(null);
                  })
                  .catch((e: Error) => setError(e.message));
              }}
            >
              Reset password
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Create teams, add members, and manage attendance scope"
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowTeamForm((v) => !v);
                setShowUserForm(false);
              }}
            >
              {showTeamForm ? 'Cancel' : 'New team'}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowUserForm((v) => !v);
                setShowTeamForm(false);
                if (selectedTeamId) {
                  setUserForm((f) => ({ ...f, teamId: selectedTeamId }));
                }
              }}
            >
              {showUserForm ? 'Cancel' : 'Add user'}
            </Button>
          </div>
        }
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {resetInfo ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          {resetInfo}
          <button
            type="button"
            className="ml-3 text-xs underline"
            onClick={() => setResetInfo(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {showTeamForm ? (
        <section className="rounded-md border border-border bg-surface-raised p-4 shadow-panel">
          <h2 className="text-sm font-semibold text-navy">Create team</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Team name</Label>
              <Input
                className="mt-1.5"
                value={teamForm.name}
                onChange={(e) =>
                  setTeamForm({ ...teamForm, name: e.target.value })
                }
                placeholder="e.g. North Sales"
              />
            </div>
            <div>
              <Label>Department</Label>
              <Input
                className="mt-1.5"
                value={teamForm.departmentName}
                onChange={(e) =>
                  setTeamForm({ ...teamForm, departmentName: e.target.value })
                }
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={!teamForm.name || createTeam.isPending}
                onClick={() => createTeam.mutate()}
              >
                Create team
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {showUserForm ? (
        <section className="rounded-md border border-border bg-surface-raised p-4 shadow-panel">
          <h2 className="text-sm font-semibold text-navy">Create user</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Name</Label>
              <Input
                className="mt-1.5"
                value={userForm.name}
                onChange={(e) =>
                  setUserForm({ ...userForm, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                className="mt-1.5"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                className="mt-1.5"
                value={userForm.password}
                onChange={(e) =>
                  setUserForm({ ...userForm, password: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Role</Label>
              <select
                className="mt-1.5 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                value={userForm.role}
                onChange={(e) =>
                  setUserForm({ ...userForm, role: e.target.value })
                }
              >
                <option value="USER">USER</option>
                <option value="MANAGER">MANAGER</option>
                <option value="SUPERADMIN">SUPERADMIN</option>
              </select>
            </div>
            <div>
              <Label>Team</Label>
              <select
                className="mt-1.5 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                value={userForm.teamId || selectedTeamId || ''}
                onChange={(e) =>
                  setUserForm({ ...userForm, teamId: e.target.value })
                }
              >
                <option value="">None</option>
                {(teamsQuery.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={createUser.isPending}
                onClick={() => createUser.mutate()}
              >
                Create user
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-navy">Teams</h2>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setSelectedTeamId(null)}
            >
              All users
            </button>
          </div>
          {teamsQuery.isLoading ? (
            <TableSkeleton rows={3} />
          ) : (teamsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No teams yet. Create one to get started.
            </p>
          ) : (
            <div className="space-y-1">
              {(teamsQuery.data ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTeamId(t.id)}
                  className={cn(
                    'w-full rounded-md border px-3 py-2.5 text-left transition-colors',
                    selectedTeamId === t.id
                      ? 'border-primary bg-primary-muted'
                      : 'border-border bg-surface-raised hover:bg-surface-muted',
                  )}
                >
                  <div className="font-semibold text-navy">{t.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {t.department?.name ?? 'No dept'} ·{' '}
                    {t._count.members + t._count.users} people ·{' '}
                    {t._count.managers} mgr
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="space-y-4 min-w-0">
          {selectedTeamId && teamDetail.data ? (
            <section className="rounded-md border border-border bg-surface-raised p-4 shadow-panel">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-navy">
                    {teamDetail.data.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {teamDetail.data.department?.name ?? 'No department'} ·{' '}
                    {teamDetail.data.roster.length} members
                  </p>
                </div>
                <Link
                  to={`/admin/attendance?teamId=${selectedTeamId}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View team attendance →
                </Link>
              </div>

              <div className="mt-4">
                <DataTable
                  columns={rosterColumns}
                  data={teamDetail.data.roster}
                  emptyMessage="No members in this team yet."
                />
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-navy">
                  Add member to this team
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Label>Existing user (optional)</Label>
                    <select
                      className="mt-1.5 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                      value={memberForm.existingUserId}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          existingUserId: e.target.value,
                        })
                      }
                    >
                      <option value="">Create new user below…</option>
                      {unassignedUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  {!memberForm.existingUserId ? (
                    <>
                      <div>
                        <Label>Name</Label>
                        <Input
                          className="mt-1.5"
                          value={memberForm.name}
                          onChange={(e) =>
                            setMemberForm({
                              ...memberForm,
                              name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          className="mt-1.5"
                          value={memberForm.email}
                          onChange={(e) =>
                            setMemberForm({
                              ...memberForm,
                              email: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Password</Label>
                        <Input
                          className="mt-1.5"
                          value={memberForm.password}
                          onChange={(e) =>
                            setMemberForm({
                              ...memberForm,
                              password: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Role</Label>
                        <select
                          className="mt-1.5 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                          value={memberForm.role}
                          onChange={(e) =>
                            setMemberForm({
                              ...memberForm,
                              role: e.target.value,
                            })
                          }
                        >
                          <option value="USER">USER</option>
                          <option value="MANAGER">MANAGER</option>
                        </select>
                      </div>
                    </>
                  ) : null}
                  <div className="flex items-end gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={memberForm.asManager}
                        onChange={(e) =>
                          setMemberForm({
                            ...memberForm,
                            asManager: e.target.checked,
                          })
                        }
                      />
                      Team manager
                    </label>
                    <Button
                      className="ml-auto"
                      disabled={addMember.isPending}
                      onClick={() => addMember.mutate()}
                    >
                      Add to team
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <div>
            <h2 className="mb-2 text-sm font-semibold text-navy">
              {selectedTeamId ? 'Users in selected team' : 'All users'}
            </h2>
            {usersQuery.isLoading ? (
              <TableSkeleton />
            ) : (
              <DataTable
                columns={columns}
                data={usersQuery.data?.data ?? []}
                emptyMessage="No users found"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
