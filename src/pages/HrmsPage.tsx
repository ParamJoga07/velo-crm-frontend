import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, FormSection } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/data-table';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useConfirm } from '@/lib/confirm';
import { EmployeeDocuments } from '@/components/EmployeeDocuments';
import { cn } from '@/lib/utils';

type Profile = {
  id: string;
  employeeNumber: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
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
  userId: string | null;
  selfEditEnabled: boolean;
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
  employeeNumber: number;
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  role: string | null;
  team: { id: string; name: string } | null;
  hasLogin: boolean;
  selfEditEnabled?: boolean;
};

function toDateInput(v: string | null | undefined) {
  if (!v) return '';
  return v.slice(0, 10);
}

export function HrmsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const myId = useAuthStore((s) => s.user?.id);
  const confirm = useConfirm();
  const isManager = role === 'SUPERADMIN' || role === 'MANAGER';
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    params.get('employee'),
  );
  const employeeParam = params.get('employee');

  useEffect(() => {
    if (employeeParam) setSelectedId(employeeParam);
  }, [employeeParam]);
  const [search, setSearch] = useState(() => params.get('q') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [newEmp, setNewEmp] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    designation: '',
    joiningDate: '',
  });

  const employees = useQuery({
    queryKey: ['hrms-employees'],
    enabled: isManager,
    queryFn: () => apiFetch<Employee[]>('/api/hrms/employees', { accessToken }),
  });

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = employees.data ?? [];
    if (!q) return rows;
    return rows.filter((e) =>
      [e.name, e.email, e.phone, e.designation, e.team?.name, String(e.employeeNumber)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [employees.data, search]);

  useEffect(() => {
    if (!isManager || selectedId) return;
    const rows = employees.data ?? [];
    const q = search.trim().toLowerCase();
    const match = q
      ? rows.find((e) =>
          [e.name, e.email, e.phone, e.designation, e.team?.name, String(e.employeeNumber)]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        )
      : undefined;
    const mine = rows.find((e) => e.userId === myId);
    setSelectedId(match?.id ?? mine?.id ?? rows[0]?.id ?? null);
  }, [isManager, selectedId, employees.data, myId, search]);

  const profile = useQuery({
    queryKey: ['hrms-profile', isManager ? selectedId : myId],
    enabled: isManager ? !!selectedId : !!myId,
    queryFn: () =>
      apiFetch<Profile>(
        isManager ? `/api/hrms/employees/${selectedId}` : '/api/hrms/me',
        { accessToken },
      ),
  });

  const targetId = profile.data?.id ?? selectedId;

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setForm({
      firstName: p.firstName ?? '',
      lastName: p.lastName ?? '',
      phone: p.phone ?? p.user.phone ?? '',
      email: p.email ?? p.user.email ?? '',
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
      void qc.invalidateQueries({ queryKey: ['hrms-profile'] });
      void qc.invalidateQueries({ queryKey: ['hrms-employees'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleSelfEdit = useMutation({
    mutationFn: (enabled: boolean) =>
      apiFetch(`/api/hrms/employees/${targetId}`, {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({ selfEditEnabled: enabled }),
      }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['hrms-profile'] });
      void qc.invalidateQueries({ queryKey: ['hrms-employees'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const addEmployee = useMutation({
    mutationFn: () =>
      apiFetch<Employee>('/api/hrms/employees', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          firstName: newEmp.firstName.trim(),
          lastName: newEmp.lastName.trim() || null,
          email: newEmp.email.trim(),
          phone: newEmp.phone.trim() || null,
          designation: newEmp.designation.trim() || null,
          joiningDate: newEmp.joiningDate || null,
        }),
      }),
    onSuccess: (created) => {
      setAddOpen(false);
      setNewEmp({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        designation: '',
        joiningDate: '',
      });
      setSelectedId(created.id);
      setError(null);
      void qc.invalidateQueries({ queryKey: ['hrms-employees'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const removeEmployee = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/hrms/employees/${id}`, {
        method: 'DELETE',
        accessToken,
      }),
    onSuccess: (_ok, deletedId) => {
      setError(null);
      const remaining = (employees.data ?? []).filter((e) => e.id !== deletedId);
      setSelectedId(remaining[0]?.id ?? null);
      void qc.invalidateQueries({ queryKey: ['hrms-employees'] });
      void qc.invalidateQueries({ queryKey: ['hrms-profile'] });
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const askDelete = async (emp: { id: string; name: string; hasLogin: boolean; userId: string | null }) => {
    if (emp.userId === myId) {
      setError('You cannot delete your own HRMS record');
      return;
    }
    const ok = await confirm({
      title: `Delete ${emp.name}?`,
      description: emp.hasLogin
        ? 'This removes them from HRMS and deactivates their CRM login. Leads they already own stay in the system.'
        : 'This permanently removes the employee from HRMS. This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    removeEmployee.mutate(emp.id);
  };

  const canEdit = isManager || Boolean(profile.data?.selfEditEnabled);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    const ok = await confirm({
      title: 'Save profile changes?',
      description: 'This updates the employee record in HRMS.',
      confirmLabel: 'Save',
    });
    if (!ok) return;
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
        description="Employee records and documents. Add people here first, then grant CRM login in User Management."
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
                Grant CRM login →
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
          <h2 className="text-sm font-semibold text-navy">Add employee</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Create the person in HRMS first. Then open User Management to grant
            a CRM login and add them to a team.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>First name</Label>
              <Input
                className="mt-1.5"
                value={newEmp.firstName}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Last name</Label>
              <Input
                className="mt-1.5"
                value={newEmp.lastName}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, lastName: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                className="mt-1.5"
                type="email"
                value={newEmp.email}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, email: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                className="mt-1.5"
                value={newEmp.phone}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, phone: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Designation</Label>
              <Input
                className="mt-1.5"
                placeholder="e.g. Sales Executive"
                value={newEmp.designation}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, designation: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Joining date</Label>
              <Input
                className="mt-1.5"
                type="date"
                value={newEmp.joiningDate}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, joiningDate: e.target.value })
                }
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={
                  addEmployee.isPending ||
                  !newEmp.firstName.trim() ||
                  !newEmp.email.trim()
                }
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Create this employee?',
                    description: 'They will appear in HRMS. Grant a CRM login later from User Management.',
                    confirmLabel: 'Create',
                  });
                  if (!ok) return;
                  addEmployee.mutate();
                }}
              >
                {addEmployee.isPending ? 'Adding…' : 'Create employee'}
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <div className={cn('grid gap-4', isManager && 'lg:grid-cols-[240px_1fr]')}>
        {isManager ? (
          <aside className="rounded-lg border border-border bg-surface-raised p-2 shadow-panel">
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-8 pl-8 text-sm"
                placeholder="Search employees…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="mb-2 grid grid-cols-[44px_1fr] gap-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Id</span>
              <span>Employee</span>
            </p>
            {employees.isLoading ? (
              <TableSkeleton rows={5} />
            ) : (
              <ul className="max-h-[60vh] space-y-0.5 overflow-auto">
                {filteredEmployees.map((u) => (
                  <li key={u.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setSelectedId(u.id)}
                      className={cn(
                        'grid w-full grid-cols-[44px_1fr] items-start gap-2 rounded-md px-2.5 py-2 pr-8 text-left text-sm',
                        selectedId === u.id
                          ? 'bg-primary-muted font-semibold text-primary-dark'
                          : 'hover:bg-surface-muted',
                      )}
                    >
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {u.employeeNumber}
                      </span>
                      <span>
                        <div className="text-navy">{u.name}</div>
                        <div className="text-[11px] font-normal text-muted-foreground">
                          {u.designation || (u.hasLogin ? u.role : 'No CRM login')}
                          {u.team ? ` · ${u.team.name}` : ''}
                          {u.selfEditEnabled ? ' · Edit on' : ' · Edit off'}
                        </div>
                      </span>
                    </button>
                    {u.userId !== myId ? (
                      <button
                        type="button"
                        title={`Delete ${u.name}`}
                        className="absolute right-1 top-1.5 rounded p-1 text-muted-foreground opacity-0 hover:bg-rose-500/10 hover:text-rose-700 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          void askDelete(u);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </li>
                ))}
                {!filteredEmployees.length ? (
                  <li className="px-2.5 py-6 text-center text-xs text-muted-foreground">
                    No employees match that search.
                  </li>
                ) : null}
              </ul>
            )}
          </aside>
        ) : null}


        <div className="min-w-0">
          {profile.isLoading ? (
            <TableSkeleton rows={8} />
          ) : !profile.data ? (
            <p className="rounded-lg border border-border bg-surface-raised p-6 text-sm text-muted-foreground">
              {isManager
                ? 'No employees yet. Use Add employee to create someone in HRMS first.'
                : 'Your HR profile is not available yet.'}
            </p>
          ) : (
            <div className="space-y-4">
              {isManager ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised px-4 py-3 shadow-panel">
                  <div>
                    <p className="text-sm font-medium text-navy">Allow employee to edit</p>
                    <p className="text-xs text-muted-foreground">
                      When off, this person can view their HRMS details but cannot change them.
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={Boolean(profile.data.selfEditEnabled)}
                      disabled={toggleSelfEdit.isPending || !targetId}
                      onChange={(e) => toggleSelfEdit.mutate(e.target.checked)}
                    />
                    {profile.data.selfEditEnabled ? 'On' : 'Off'}
                  </label>
                </div>
              ) : !canEdit ? (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900">
                  Editing is turned off. Ask an admin if you need to update your details.
                </p>
              ) : null}
              <form
                onSubmit={onSubmit}
                className="space-y-6 rounded-lg border border-border bg-surface-raised p-4 shadow-panel"
              >
              <fieldset disabled={!canEdit} className="space-y-6">
              <FormSection title="Identity">
                <div>
                  <Label>Id</Label>
                  <Input
                    className="mt-1 font-mono"
                    value={String(profile.data.employeeNumber ?? '')}
                    readOnly
                  />
                </div>
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

              </fieldset>
              <div className="flex justify-end gap-2">
                {isManager && profile.data.userId !== myId ? (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={removeEmployee.isPending}
                    onClick={() =>
                      void askDelete({
                        id: profile.data.id,
                        name:
                          [profile.data.firstName, profile.data.lastName]
                            .filter(Boolean)
                            .join(' ') || profile.data.user.name,
                        hasLogin: Boolean(profile.data.userId),
                        userId: profile.data.userId,
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {removeEmployee.isPending ? 'Deleting…' : 'Delete employee'}
                  </Button>
                ) : null}
                {isManager && !profile.data.userId ? (
                  <Link
                    to="/admin/users"
                    className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs font-medium text-primary hover:bg-surface-muted"
                  >
                    Grant CRM login
                  </Link>
                ) : null}
                {canEdit ? (
                  <Button type="submit" disabled={save.isPending || !targetId}>
                    {save.isPending ? 'Saving…' : 'Save profile'}
                  </Button>
                ) : null}
              </div>
            </form>
            <section className="mt-4 rounded-lg border border-border bg-surface-raised p-3 shadow-panel">
              <h3 className="text-sm font-semibold text-navy">Documents</h3>
              <p className="mb-2 text-xs text-muted-foreground">
                Request, upload, and download employee documents here.
              </p>
              <EmployeeDocuments employeeProfileId={profile.data.id} />
            </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
