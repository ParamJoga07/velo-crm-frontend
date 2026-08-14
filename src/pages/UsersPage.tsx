import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
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
import {
  normalizeListEnvelope,
  useTablePagination,
  type ListEnvelope,
} from '@/hooks/useTablePagination';

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

type HrmsEmployee = {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  role: string | null;
  team: { id: string; name: string } | null;
  hasLogin: boolean;
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
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editingTeam, setEditingTeam] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');

  const [userForm, setUserForm] = useState({
    employeeId: '',
    password: 'Password123!',
    role: 'USER',
    teamId: '',
  });
  const [teamForm, setTeamForm] = useState({
    name: '',
    departmentName: 'Sales',
  });
  const [editTeamForm, setEditTeamForm] = useState({
    name: '',
    departmentName: '',
  });
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    role: 'USER',
    phone: '',
    teamId: '',
    isActive: true,
  });
  const [memberForm, setMemberForm] = useState({
    employeeId: '',
    password: 'Password123!',
    asManager: false,
  });

  const { page, limit, setPage, setLimit, resetPage } = useTablePagination(25);

  useEffect(() => {
    resetPage();
  }, [selectedTeamId, resetPage]);

  const usersQuery = useQuery({
    queryKey: ['users', selectedTeamId, page, limit],
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (selectedTeamId) params.set('teamId', selectedTeamId);
      const res = await apiFetch<ListEnvelope<UserRow>>(
        `/api/users?${params}`,
        { accessToken },
      );
      return normalizeListEnvelope(res);
    },
  });

  const hrmsEmployees = useQuery({
    queryKey: ['hrms-employees'],
    staleTime: 60_000,
    queryFn: () =>
      apiFetch<HrmsEmployee[]>('/api/hrms/employees', { accessToken }),
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

  useEffect(() => {
    if (!teamDetail.data) return;
    setEditTeamForm({
      name: teamDetail.data.name,
      departmentName: teamDetail.data.department?.name ?? 'Sales',
    });
    setEditingTeam(false);
  }, [teamDetail.data]);

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ['users'] });
    void qc.invalidateQueries({ queryKey: ['teams'] });
    void qc.invalidateQueries({ queryKey: ['team-detail'] });
    void qc.invalidateQueries({ queryKey: ['hrms-employees'] });
  };

  const createUser = useMutation({
    mutationFn: () =>
      apiFetch('/api/users/from-employee', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          employeeId: userForm.employeeId,
          password: userForm.password,
          role: userForm.role,
          teamId: userForm.teamId || selectedTeamId || null,
        }),
      }),
    onSuccess: () => {
      setShowUserForm(false);
      setUserForm({
        employeeId: '',
        password: 'Password123!',
        role: 'USER',
        teamId: '',
      });
      setEmployeeSearch('');
      setError(null);
      invalidateAll();
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateUser = useMutation({
    mutationFn: () =>
      apiFetch(`/api/users/${editingUser!.id}`, {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({
          name: editUserForm.name,
          role: editUserForm.role,
          phone: editUserForm.phone || null,
          teamId: editUserForm.teamId || null,
          isActive: editUserForm.isActive,
        }),
      }),
    onSuccess: () => {
      setEditingUser(null);
      setError(null);
      invalidateAll();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/users/${id}`, { method: 'DELETE', accessToken }),
    onSuccess: () => {
      setEditingUser(null);
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

  const updateTeam = useMutation({
    mutationFn: () =>
      apiFetch(`/api/users/teams/${selectedTeamId}`, {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({
          name: editTeamForm.name,
          departmentName: editTeamForm.departmentName || 'Sales',
        }),
      }),
    onSuccess: () => {
      setEditingTeam(false);
      setError(null);
      invalidateAll();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteTeam = useMutation({
    mutationFn: () =>
      apiFetch(`/api/users/teams/${selectedTeamId}`, {
        method: 'DELETE',
        accessToken,
      }),
    onSuccess: () => {
      setSelectedTeamId(null);
      setError(null);
      invalidateAll();
    },
    onError: (e: Error) => setError(e.message),
  });

  const addMember = useMutation({
    mutationFn: () => {
      const emp = (hrmsEmployees.data ?? []).find(
        (e) => e.id === memberForm.employeeId,
      );
      return apiFetch(`/api/users/teams/${selectedTeamId}/members`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          employeeId: memberForm.employeeId,
          asManager: memberForm.asManager,
          ...(!emp?.hasLogin ? { password: memberForm.password } : {}),
        }),
      });
    },
    onSuccess: () => {
      setMemberForm({
        employeeId: '',
        password: 'Password123!',
        asManager: false,
      });
      setMemberSearch('');
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

  const unassignedEmployees = useMemo(() => {
    const rosterIds = new Set(
      (teamDetail.data?.roster ?? []).map((r) => r.id),
    );
    const q = memberSearch.trim().toLowerCase();
    return (hrmsEmployees.data ?? []).filter((e) => {
      if (e.userId && rosterIds.has(e.userId)) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.designation ?? '').toLowerCase().includes(q)
      );
    });
  }, [hrmsEmployees.data, teamDetail.data, memberSearch]);

  const employeesWithoutLogin = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    return (hrmsEmployees.data ?? []).filter((e) => {
      if (e.hasLogin) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.designation ?? '').toLowerCase().includes(q)
      );
    });
  }, [hrmsEmployees.data, employeeSearch]);

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
        <Badge tone={row.original.isActive ? 'success' : 'danger'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Admin',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              className="h-7"
              onClick={() => {
                setEditingUser(u);
                setEditUserForm({
                  name: u.name,
                  role: u.role,
                  phone: u.phone ?? '',
                  teamId: u.team?.id ?? '',
                  isActive: u.isActive,
                });
                setShowUserForm(false);
                setShowTeamForm(false);
              }}
            >
              Edit
            </Button>
            {u.id !== me?.id ? (
              <>
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
              </>
            ) : (
              <span className="text-xs text-muted-foreground">You</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Grant CRM logins to HRMS employees and assign them to teams"
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowTeamForm((v) => !v);
                setShowUserForm(false);
                setEditingUser(null);
              }}
            >
              {showTeamForm ? 'Cancel' : 'New team'}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowUserForm((v) => !v);
                setShowTeamForm(false);
                setEditingUser(null);
                if (selectedTeamId) {
                  setUserForm((f) => ({ ...f, teamId: selectedTeamId }));
                }
              }}
            >
              {showUserForm ? 'Cancel' : 'Add from HRMS'}
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
        <section className="rounded-md border border-border bg-surface-raised dark:border-[#0e1117] p-4 shadow-panel">
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
        <section className="rounded-md border border-border bg-surface-raised dark:border-[#0e1117] p-4 shadow-panel">
          <h2 className="text-sm font-semibold text-navy">
            Add user from HRMS
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick an employee created in HRMS, then set a password, role, and
            team. Names are not typed here.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Search employees</Label>
              <Input
                className="mt-1.5"
                placeholder="Name, email, or designation…"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Select employee</Label>
              <select
                className="mt-1.5 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                value={userForm.employeeId}
                onChange={(e) =>
                  setUserForm({ ...userForm, employeeId: e.target.value })
                }
              >
                <option value="">Choose an HRMS employee…</option>
                {employeesWithoutLogin.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} · {e.email}
                    {e.designation ? ` · ${e.designation}` : ''}
                  </option>
                ))}
              </select>
              {employeesWithoutLogin.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  No employees waiting for a login.{' '}
                  <Link to="/hrms" className="text-primary underline">
                    Add them in HRMS
                  </Link>{' '}
                  first.
                </p>
              ) : null}
            </div>
            {employeeSearch.trim() && employeesWithoutLogin.length > 0 ? (
              <ul className="sm:col-span-2 lg:col-span-3 max-h-36 space-y-1 overflow-auto rounded-md border border-border p-2">
                {employeesWithoutLogin.slice(0, 12).map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      className={cn(
                        'w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-muted',
                        userForm.employeeId === e.id && 'bg-primary-muted',
                      )}
                      onClick={() =>
                        setUserForm({ ...userForm, employeeId: e.id })
                      }
                    >
                      <span className="font-medium text-navy">{e.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {e.email}
                        {e.designation ? ` · ${e.designation}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
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
                disabled={createUser.isPending || !userForm.employeeId}
                onClick={() => createUser.mutate()}
              >
                Grant CRM login
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {editingUser ? (
        <section className="rounded-md border border-border bg-surface-raised dark:border-[#0e1117] p-4 shadow-panel">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-navy">
              Edit agent · {editingUser.email}
            </h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditingUser(null)}
            >
              Cancel
            </Button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Name</Label>
              <Input
                className="mt-1.5"
                value={editUserForm.name}
                onChange={(e) =>
                  setEditUserForm({ ...editUserForm, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Role</Label>
              <select
                className="mt-1.5 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                value={editUserForm.role}
                onChange={(e) =>
                  setEditUserForm({ ...editUserForm, role: e.target.value })
                }
              >
                <option value="USER">USER</option>
                <option value="MANAGER">MANAGER</option>
                <option value="SUPERADMIN">SUPERADMIN</option>
              </select>
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                className="mt-1.5"
                value={editUserForm.phone}
                onChange={(e) =>
                  setEditUserForm({ ...editUserForm, phone: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Team</Label>
              <select
                className="mt-1.5 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                value={editUserForm.teamId}
                onChange={(e) =>
                  setEditUserForm({ ...editUserForm, teamId: e.target.value })
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
            <div>
              <Label>Status</Label>
              <select
                className="mt-1.5 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                value={editUserForm.isActive ? '1' : '0'}
                onChange={(e) =>
                  setEditUserForm({
                    ...editUserForm,
                    isActive: e.target.value === '1',
                  })
                }
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                className="flex-1"
                disabled={updateUser.isPending}
                onClick={() => updateUser.mutate()}
              >
                Save changes
              </Button>
              {editingUser.id !== me?.id && me?.role === 'SUPERADMIN' ? (
                <Button
                  variant="secondary"
                  className="text-danger"
                  disabled={deleteUser.isPending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Deactivate and remove ${editingUser.name} from teams?`,
                      )
                    ) {
                      return;
                    }
                    deleteUser.mutate(editingUser.id);
                  }}
                >
                  Delete
                </Button>
              ) : null}
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
            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
              {(teamsQuery.data ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTeamId(t.id)}
                  className={cn(
                    'min-w-[200px] shrink-0 rounded-md border px-3 py-2.5 text-left transition-colors lg:min-w-0 lg:w-full',
                    selectedTeamId === t.id
                      ? 'border-primary bg-primary-muted'
                      : 'border-border bg-surface-raised hover:bg-surface-muted dark:border-[#0e1117]',
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
            <section className="rounded-md border border-border bg-surface-raised dark:border-[#0e1117] p-4 shadow-panel">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {editingTeam ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <Label>Team name</Label>
                        <Input
                          className="mt-1"
                          value={editTeamForm.name}
                          onChange={(e) =>
                            setEditTeamForm({
                              ...editTeamForm,
                              name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Department</Label>
                        <Input
                          className="mt-1"
                          value={editTeamForm.departmentName}
                          onChange={(e) =>
                            setEditTeamForm({
                              ...editTeamForm,
                              departmentName: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-base font-semibold text-navy">
                        {teamDetail.data.name}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {teamDetail.data.department?.name ?? 'No department'} ·{' '}
                        {teamDetail.data.roster.length} members
                      </p>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {editingTeam ? (
                    <>
                      <Button
                        size="sm"
                        disabled={updateTeam.isPending}
                        onClick={() => updateTeam.mutate()}
                      >
                        Save team
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingTeam(false)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingTeam(true)}
                      >
                        Edit team
                      </Button>
                      {me?.role === 'SUPERADMIN' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-danger"
                          disabled={deleteTeam.isPending}
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Delete team “${teamDetail.data.name}”? Members stay as users but leave this team.`,
                              )
                            ) {
                              return;
                            }
                            deleteTeam.mutate();
                          }}
                        >
                          Delete team
                        </Button>
                      ) : null}
                      <Link
                        to={`/admin/attendance?teamId=${selectedTeamId}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View team attendance →
                      </Link>
                    </>
                  )}
                </div>
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
                  Add member from HRMS
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick an employee from HRMS. If they do not have a CRM login
                  yet, set a password to grant one.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label>Search employees</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="Filter by name or email…"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Select employee</Label>
                    <select
                      className="mt-1.5 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                      value={memberForm.employeeId}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          employeeId: e.target.value,
                        })
                      }
                    >
                      <option value="">Choose an HRMS employee…</option>
                      {unassignedEmployees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} · {e.email}
                          {e.hasLogin ? '' : ' · needs login'}
                          {e.team ? ` · ${e.team.name}` : ''}
                        </option>
                      ))}
                    </select>
                    {unassignedEmployees.length === 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        No available employees.{' '}
                        <Link to="/hrms" className="text-primary underline">
                          Add them in HRMS
                        </Link>{' '}
                        first.
                      </p>
                    ) : null}
                  </div>
                  {(() => {
                    const picked = unassignedEmployees.find(
                      (e) => e.id === memberForm.employeeId,
                    );
                    if (!picked || picked.hasLogin) return null;
                    return (
                      <div>
                        <Label>Password (new CRM login)</Label>
                        <Input
                          type="password"
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
                    );
                  })()}
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
                      disabled={
                        addMember.isPending || !memberForm.employeeId
                      }
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
                pagination={{
                  page,
                  limit,
                  total: usersQuery.data?.meta.total ?? 0,
                  pageCount: usersQuery.data?.meta.pageCount,
                  onPageChange: setPage,
                  onLimitChange: setLimit,
                  isFetching: usersQuery.isFetching,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
