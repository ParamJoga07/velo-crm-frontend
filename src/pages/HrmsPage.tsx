import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, FormSection } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/data-table';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import {
  normalizeListEnvelope,
  type ListEnvelope,
} from '@/hooks/useTablePagination';

type Profile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  permanentAddress: string | null;
  presentAddress: string | null;
  parentsName: string | null;
  emergencyContact: string | null;
  aadhar: string | null;
  pan: string | null;
  joiningDate: string | null;
  designation: string | null;
  salary: number | null;
  bankName: string | null;
  bankAccount: string | null;
  bankIfsc: string | null;
  dateOfBirth: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    team: { id: string; name: string } | null;
  };
};

type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  team: { id: string; name: string } | null;
  employeeProfile: Profile | null;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  team: { id: string; name: string } | null;
};

function toDateInput(v: string | null | undefined) {
  if (!v) return '';
  return v.slice(0, 10);
}

export function HrmsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const myId = useAuthStore((s) => s.user?.id);
  const isManager = role === 'SUPERADMIN' || role === 'MANAGER';
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [pickedUserId, setPickedUserId] = useState('');

  const employees = useQuery({
    queryKey: ['hrms-employees'],
    enabled: isManager,
    queryFn: () => apiFetch<Employee[]>('/api/hrms/employees', { accessToken }),
  });

  const directoryUsers = useQuery({
    queryKey: ['users', 'hrms-picker'],
    enabled: isManager && addOpen,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiFetch<ListEnvelope<UserRow>>(
        '/api/users?limit=100&page=1',
        { accessToken },
      );
      return normalizeListEnvelope(res);
    },
  });

  const suggestions = useMemo(() => {
    const listed = new Set((employees.data ?? []).map((e) => e.id));
    const q = userQuery.trim().toLowerCase();
    return (directoryUsers.data?.data ?? [])
      .filter((u) => u.isActive)
      .filter((u) => !listed.has(u.id) || !employees.data?.find((e) => e.id === u.id)?.employeeProfile)
      .filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.team?.name ?? '').toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [directoryUsers.data, employees.data, userQuery]);

  const targetId = isManager ? selectedId ?? myId ?? null : myId ?? null;

  useEffect(() => {
    if (isManager && !selectedId && myId) setSelectedId(myId);
  }, [isManager, selectedId, myId]);

  const profile = useQuery({
    queryKey: ['hrms-profile', targetId],
    enabled: !!targetId,
    queryFn: () =>
      apiFetch<Profile>(
        targetId === myId ? '/api/hrms/me' : `/api/hrms/employees/${targetId}`,
        { accessToken },
      ),
  });

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setForm({
      firstName: p.firstName ?? '',
      lastName: p.lastName ?? '',
      phone: p.user.phone ?? '',
      email: p.user.email ?? '',
      designation: p.designation ?? '',
      permanentAddress: p.permanentAddress ?? '',
      presentAddress: p.presentAddress ?? '',
      parentsName: p.parentsName ?? '',
      emergencyContact: p.emergencyContact ?? '',
      dateOfBirth: toDateInput(p.dateOfBirth),
      joiningDate: toDateInput(p.joiningDate),
      aadhar: p.aadhar ?? '',
      pan: p.pan ?? '',
      salary: p.salary != null ? String(p.salary) : '',
      bankName: p.bankName ?? '',
      bankAccount: p.bankAccount ?? '',
      bankIfsc: p.bankIfsc ?? '',
    });
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/api/hrms/employees/${targetId}`, {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({
          firstName: form.firstName || null,
          lastName: form.lastName || null,
          phone: form.phone || null,
          email: form.email || null,
          designation: form.designation || null,
          permanentAddress: form.permanentAddress || null,
          presentAddress: form.presentAddress || null,
          parentsName: form.parentsName || null,
          emergencyContact: form.emergencyContact || null,
          dateOfBirth: form.dateOfBirth || null,
          joiningDate: form.joiningDate || null,
          aadhar: form.aadhar || null,
          pan: form.pan || null,
          salary: form.salary ? Number(form.salary) : null,
          bankName: form.bankName || null,
          bankAccount: form.bankAccount || null,
          bankIfsc: form.bankIfsc || null,
        }),
      }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['hrms-profile', targetId] });
      void qc.invalidateQueries({ queryKey: ['hrms-employees'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const addEmployee = useMutation({
    mutationFn: async (userId: string) => {
      // GET creates profile if missing (get-or-create on backend)
      await apiFetch<Profile>(`/api/hrms/employees/${userId}`, {
        accessToken,
      });
      return userId;
    },
    onSuccess: (userId) => {
      setAddOpen(false);
      setUserQuery('');
      setPickedUserId('');
      setSelectedId(userId);
      setError(null);
      void qc.invalidateQueries({ queryKey: ['hrms-employees'] });
      void qc.invalidateQueries({ queryKey: ['hrms-profile', userId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  const set =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="HRMS"
        description="Employee profiles linked to User Management accounts"
        actions={
          isManager ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setAddOpen((v) => !v)}
              >
                {addOpen ? 'Cancel' : 'Add employee'}
              </Button>
              <Link
                to="/admin/users"
                className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-primary hover:bg-surface-muted"
              >
                User Management →
              </Link>
            </div>
          ) : undefined
        }
      />

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {addOpen && isManager ? (
        <section className="rounded-md border border-border bg-surface-raised p-4 shadow-panel">
          <h2 className="text-sm font-semibold text-navy">
            Add employee from User Management
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Search and select an existing user — do not type names manually.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label>Search</Label>
              <Input
                className="mt-1.5"
                placeholder="Name, email, or team…"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label>Select user</Label>
              <select
                className="mt-1.5 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                value={pickedUserId}
                onChange={(e) => setPickedUserId(e.target.value)}
              >
                <option value="">Choose…</option>
                {suggestions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.email}
                    {u.team ? ` · ${u.team.name}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={!pickedUserId || addEmployee.isPending}
                onClick={() => addEmployee.mutate(pickedUserId)}
              >
                {addEmployee.isPending ? 'Adding…' : 'Open profile'}
              </Button>
            </div>
          </div>
          {userQuery.trim() && suggestions.length > 0 ? (
            <ul className="mt-3 max-h-40 space-y-1 overflow-auto rounded-md border border-border p-2">
              {suggestions.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-muted',
                      pickedUserId === u.id && 'bg-primary-muted',
                    )}
                    onClick={() => setPickedUserId(u.id)}
                  >
                    <span className="font-medium text-navy">{u.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {u.email}
                      {u.team ? ` · ${u.team.name}` : ''} · {u.role}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {!directoryUsers.isLoading && suggestions.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              No matching users.{' '}
              <Link to="/admin/users" className="text-primary underline">
                Create them in User Management
              </Link>{' '}
              first.
            </p>
          ) : null}
        </section>
      ) : null}

      <div className={cn('grid gap-4', isManager && 'lg:grid-cols-[240px_1fr]')}>
        {isManager ? (
          <aside className="rounded-lg border border-border bg-surface-raised p-2 shadow-panel">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Employees
            </p>
            {employees.isLoading ? (
              <TableSkeleton rows={5} />
            ) : (
              <ul className="max-h-[60vh] space-y-0.5 overflow-auto">
                {(employees.data ?? []).map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(u.id)}
                      className={cn(
                        'w-full rounded-md px-2.5 py-2 text-left text-sm',
                        selectedId === u.id
                          ? 'bg-primary-muted font-semibold text-primary-dark'
                          : 'hover:bg-surface-muted',
                      )}
                    >
                      <div className="text-navy">{u.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {u.role}
                        {u.team ? ` · ${u.team.name}` : ''}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        ) : null}

        <div className="min-w-0">
          {profile.isLoading ? (
            <TableSkeleton rows={8} />
          ) : (
            <form
              onSubmit={onSubmit}
              className="space-y-6 rounded-lg border border-border bg-surface-raised p-4 shadow-panel"
            >
              <FormSection title="Identity">
                <div>
                  <Label>First name</Label>
                  <Input className="mt-1" value={form.firstName ?? ''} onChange={set('firstName')} />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input className="mt-1" value={form.lastName ?? ''} onChange={set('lastName')} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input className="mt-1" value={form.phone ?? ''} onChange={set('phone')} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input className="mt-1" type="email" value={form.email ?? ''} onChange={set('email')} />
                </div>
                <div>
                  <Label>Designation</Label>
                  <Input className="mt-1" value={form.designation ?? ''} onChange={set('designation')} />
                </div>
                <div>
                  <Label>Date of birth</Label>
                  <Input className="mt-1" type="date" value={form.dateOfBirth ?? ''} onChange={set('dateOfBirth')} />
                </div>
              </FormSection>

              <FormSection title="Address & emergency">
                <div className="md:col-span-2">
                  <Label>Present address</Label>
                  <textarea
                    className="mt-1 min-h-[72px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    value={form.presentAddress ?? ''}
                    onChange={set('presentAddress')}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Permanent address</Label>
                  <textarea
                    className="mt-1 min-h-[72px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    value={form.permanentAddress ?? ''}
                    onChange={set('permanentAddress')}
                  />
                </div>
                <div>
                  <Label>Parents / guardian</Label>
                  <Input className="mt-1" value={form.parentsName ?? ''} onChange={set('parentsName')} />
                </div>
                <div>
                  <Label>Emergency contact</Label>
                  <Input className="mt-1" value={form.emergencyContact ?? ''} onChange={set('emergencyContact')} />
                </div>
              </FormSection>

              {(isManager || role !== 'USER') && (
                <FormSection title="Employment & KYC (admin)">
                  <div>
                    <Label>Joining date</Label>
                    <Input className="mt-1" type="date" value={form.joiningDate ?? ''} onChange={set('joiningDate')} />
                  </div>
                  <div>
                    <Label>Salary</Label>
                    <Input className="mt-1" type="number" value={form.salary ?? ''} onChange={set('salary')} />
                  </div>
                  <div>
                    <Label>Aadhar</Label>
                    <Input className="mt-1" value={form.aadhar ?? ''} onChange={set('aadhar')} />
                  </div>
                  <div>
                    <Label>PAN</Label>
                    <Input className="mt-1" value={form.pan ?? ''} onChange={set('pan')} />
                  </div>
                  <div>
                    <Label>Bank name</Label>
                    <Input className="mt-1" value={form.bankName ?? ''} onChange={set('bankName')} />
                  </div>
                  <div>
                    <Label>Account</Label>
                    <Input className="mt-1" value={form.bankAccount ?? ''} onChange={set('bankAccount')} />
                  </div>
                  <div>
                    <Label>IFSC</Label>
                    <Input className="mt-1" value={form.bankIfsc ?? ''} onChange={set('bankIfsc')} />
                  </div>
                </FormSection>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={save.isPending || !targetId}>
                  {save.isPending ? 'Saving…' : 'Save profile'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
