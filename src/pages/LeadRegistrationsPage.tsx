import { FormEvent, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { DataTable, TableSkeleton } from '@/components/ui/data-table';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import {
  normalizeListEnvelope,
  useTablePagination,
  type ListEnvelope,
} from '@/hooks/useTablePagination';
import { formatLeadNo } from '@/lib/lead-number';
import { MEETING_STATUS_LABELS, PROJECT_NAMES } from '@velo/shared';

export type RegistrationRow = {
  id: string;
  clientName: string;
  clientNumber: string;
  altPhone: string | null;
  email: string | null;
  developer: string | null;
  projectName: string | null;
  parentId: string | null;
  parent?: { id: string; status: string; clientNumber: string; projectName: string | null } | null;
  visitAt: string | null;
  meetingStatus: string | null;
  takerIds?: string[];
  fromMeetingId?: string | null;
  status: 'PENDING' | 'REGISTERED' | 'DUPLICATE' | string;
  notes: string | null;
  createdAt: string;
  possibleDuplicate?: boolean;
  existingLead?: { id: string; leadNo: number; name: string } | null;
  submittedBy: { id: string; name: string; email: string };
  reviewedBy: { id: string; name: string } | null;
  lead: { id: string; leadNo: number; name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  REGISTERED: 'Lead registered',
  DUPLICATE: 'Duplicate lead',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:
    'border-amber-600/40 bg-amber-500/15 text-amber-800 dark:border-amber-400/30 dark:text-amber-200',
  REGISTERED:
    'border-emerald-600/40 bg-emerald-500/15 text-emerald-800 dark:border-emerald-400/30 dark:text-emerald-200',
  DUPLICATE:
    'border-rose-600/40 bg-rose-500/15 text-rose-800 dark:border-rose-400/30 dark:text-rose-200',
};

const GREEN_BTN =
  'bg-emerald-600 text-white hover:bg-emerald-700 shadow-none border-0';
const RED_BTN =
  'bg-rose-600 text-white hover:bg-rose-700 shadow-none border-0';

const EMPTY = {
  clientName: '',
  clientNumber: '',
  altPhone: '',
  email: '',
  developer: '',
  projectName: '',
  date: '',
  time: '',
};

type AgentRow = { id: string; name: string };

type Props = {
  variant: 'agent' | 'admin';
};

export function LeadRegistrationPanel({ variant }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const isManager = role === 'SUPERADMIN' || role === 'MANAGER';
  const qc = useQueryClient();
  const { page, limit, setPage, setLimit, resetPage } = useTablePagination(25);
  const [statusFilter, setStatusFilter] = useState(
    variant === 'admin' ? 'PENDING' : '',
  );
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [takerIds, setTakerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const [resubmitId, setResubmitId] = useState<string | null>(
    params.get('edit'),
  );
  const [altPhone, setAltPhone] = useState('');
  const [resubmitEmail, setResubmitEmail] = useState('');

  useEffect(() => {
    const edit = params.get('edit');
    if (edit) setResubmitId(edit);
  }, [params]);

  const agents = useQuery({
    queryKey: ['users-agents'],
    queryFn: async () => {
      const res = await apiFetch<ListEnvelope<AgentRow>>(
        '/api/users/directory',
        { accessToken },
      );
      return normalizeListEnvelope(res).data;
    },
  });

  const query = useQuery({
    queryKey: ['lead-registrations', statusFilter, appliedQ, page, limit],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter) sp.set('status', statusFilter);
      if (appliedQ.trim()) sp.set('q', appliedQ.trim());
      const envelope = await apiFetch<ListEnvelope<RegistrationRow>>(
        `/api/lead-registrations?${sp}`,
        { accessToken },
      );
      return normalizeListEnvelope(envelope);
    },
  });

  const submit = useMutation({
    mutationFn: () => {
      if (!form.clientName.trim() || !form.clientNumber.trim()) {
        throw new Error('Name and primary phone number are required');
      }
      const visitAt =
        form.date && form.time
          ? new Date(`${form.date}T${form.time}:00`).toISOString()
          : null;
      return apiFetch<RegistrationRow>('/api/lead-registrations', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          clientName: form.clientName.trim(),
          clientNumber: form.clientNumber.trim(),
          altPhone: form.altPhone.trim() || null,
          email: form.email.trim() || null,
          developer: form.developer.trim() || null,
          projectName: form.projectName.trim() || null,
          visitAt,
          takerIds,
        }),
      });
    },
    onSuccess: (row) => {
      setForm(EMPTY);
      setTakerIds([]);
      setError(null);
      setNotice(
        row.possibleDuplicate
          ? 'Submitted. This number already exists in CRM — admin can mark it Duplicate.'
          : 'Submitted. Admin will see it on the Lead Registration dashboard.',
      );
      void qc.invalidateQueries({ queryKey: ['lead-registrations'] });
    },
    onError: (e: Error) => {
      setNotice(null);
      setError(e.message);
    },
  });

  const resubmit = useMutation({
    mutationFn: (id: string) => {
      if (!altPhone.trim()) throw new Error('Enter an alternative number');
      return apiFetch<RegistrationRow>(`/api/lead-registrations/${id}/resubmit`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          altPhone: altPhone.trim(),
          email: resubmitEmail.trim() || null,
        }),
      });
    },
    onSuccess: () => {
      setError(null);
      setNotice(
        'Submitted as a new request. The original green/red records stay on this list.',
      );
      setResubmitId(null);
      setAltPhone('');
      setResubmitEmail('');
      const next = new URLSearchParams(params);
      next.delete('edit');
      setParams(next, { replace: true });
      void qc.invalidateQueries({ queryKey: ['lead-registrations'] });
    },
    onError: (e: Error) => {
      setNotice(null);
      setError(e.message);
    },
  });

  const meetingStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/lead-registrations/${id}/meeting-status`, {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lead-registrations'] });
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: ['performance-summary'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const review = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'register' | 'duplicate' }) =>
      apiFetch(`/api/lead-registrations/${id}/${action}`, {
        method: 'PATCH',
        accessToken,
      }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['lead-registrations'] });
      void qc.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit.mutate();
  };

  const columns: ColumnDef<RegistrationRow>[] = useMemo(() => {
    const cols: ColumnDef<RegistrationRow>[] = [
      {
        accessorKey: 'clientName',
        header: 'Client',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-navy">{row.original.clientName}</div>
            <a
              href={`tel:${row.original.clientNumber.replace(/[^\d+]/g, '')}`}
              className="text-xs text-primary hover:underline"
            >
              {row.original.clientNumber}
            </a>
            {row.original.altPhone ? (
              <p className="text-[11px] text-muted-foreground">
                Alt {row.original.altPhone}
              </p>
            ) : null}
            {row.original.parentId ? (
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                New request (resubmit)
              </p>
            ) : null}
            {row.original.possibleDuplicate ? (
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                Possible duplicate
                {row.original.existingLead
                  ? ` · ${row.original.existingLead.name}`
                  : ''}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'developer',
        header: 'Developer',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.developer || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'projectName',
        header: 'Project',
        cell: ({ row }) => (
          <span
            className={cn(
              'text-xs font-semibold',
              row.original.status === 'REGISTERED'
                ? 'text-emerald-700 dark:text-emerald-300'
                : row.original.status === 'DUPLICATE'
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-muted-foreground',
            )}
          >
            {row.original.projectName || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'visitAt',
        header: 'Visit',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.visitAt
              ? new Date(row.original.visitAt).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : 'Lead only'}
          </span>
        ),
      },
      {
        id: 'meetingStatus',
        header: 'Meeting',
        cell: ({ row }) =>
          row.original.fromMeetingId || row.original.meetingStatus ? (
            <select
              className="h-8 rounded-md border border-border bg-surface px-1 text-[11px]"
              value={row.original.meetingStatus || 'BOOKED'}
              onChange={(e) =>
                meetingStatus.mutate({
                  id: row.original.id,
                  status: e.target.value,
                })
              }
            >
              {['BOOKED', 'COMPLETED', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>
                  {MEETING_STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ];
    if (isManager) {
      cols.push({
        id: 'submittedBy',
        header: 'Submitted by',
        cell: ({ row }) => (
          <span className="text-xs text-navy">{row.original.submittedBy.name}</span>
        ),
      });
    }
    cols.push({
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
    });
    cols.push({
      id: 'lead',
      header: 'CRM lead',
      cell: ({ row }) =>
        row.original.lead ? (
          <Link
            to={`/leads/${row.original.lead.id}`}
            className="text-xs font-medium text-primary hover:underline"
          >
            {formatLeadNo(row.original.lead.leadNo)}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    });
    if (variant === 'admin') {
      cols.push({
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          row.original.status === 'PENDING' ? (
            <div className="flex justify-end gap-1">
              <Button
                size="sm"
                className={GREEN_BTN}
                disabled={review.isPending}
                onClick={() =>
                  review.mutate({ id: row.original.id, action: 'register' })
                }
              >
                Lead registered
              </Button>
              <Button
                size="sm"
                className={RED_BTN}
                disabled={review.isPending}
                onClick={() =>
                  review.mutate({ id: row.original.id, action: 'duplicate' })
                }
              >
                Duplicate lead
              </Button>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {row.original.reviewedBy?.name ?? ''}
            </span>
          ),
      });
    } else {
      cols.push({
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          row.original.status === 'DUPLICATE' ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setResubmitId(row.original.id);
                setAltPhone(row.original.altPhone ?? '');
                setResubmitEmail(row.original.email ?? '');
              }}
            >
              Edit alt number
            </Button>
          ) : null,
      });
    }
    return cols;
  }, [isManager, review, variant, meetingStatus]);

  const total = query.data?.meta?.total ?? query.data?.data?.length ?? 0;

  return (
    <div className="space-y-4">
      {variant === 'admin' ? (
        <PageHeader
          title="Lead Registration"
          description="Site-visit submissions. Mark each as Lead registered or Duplicate lead."
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Submit a site-visit client. Admin reviews each one as Lead registered or Duplicate lead.
          </p>
          {isManager ? (
            <Link
              to="/admin/lead-registrations"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Open review dashboard →
            </Link>
          ) : null}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-panel sm:grid-cols-2 lg:grid-cols-3"
      >
        <p className="sm:col-span-2 lg:col-span-3 text-sm font-semibold text-navy">
          New site-visit registration
        </p>
        <div>
          <Label htmlFor="reg-name">Client name</Label>
          <Input
            id="reg-name"
            value={form.clientName}
            onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="reg-phone">Client number</Label>
          <Input
            id="reg-phone"
            value={form.clientNumber}
            onChange={(e) => setForm((f) => ({ ...f, clientNumber: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="reg-alt">Alternative number</Label>
          <Input
            id="reg-alt"
            value={form.altPhone}
            onChange={(e) => setForm((f) => ({ ...f, altPhone: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="reg-email">Email</Label>
          <Input
            id="reg-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="reg-dev">Developer</Label>
          <Input
            id="reg-dev"
            value={form.developer}
            onChange={(e) => setForm((f) => ({ ...f, developer: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="reg-takers">Meeting taken by</Label>
          <select
            id="reg-takers"
            multiple
            className="mt-1 h-24 w-full rounded-md border border-border bg-surface px-2 text-sm"
            value={takerIds}
            onChange={(e) =>
              setTakerIds([...e.target.selectedOptions].map((o) => o.value))
            }
          >
            {(agents.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="reg-project">Projects</Label>
          <select
            id="reg-project"
            multiple
            className="mt-1 h-24 w-full rounded-md border border-border bg-surface px-2 text-sm"
            value={form.projectName.split(',').map((s) => s.trim()).filter(Boolean)}
            onChange={(e) => {
              const values = [...e.target.selectedOptions].map((o) => o.value);
              setForm((f) => ({ ...f, projectName: values.join(', ') }));
            }}
          >
            {PROJECT_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="reg-date">Meeting date (optional)</Label>
          <Input
            id="reg-date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="reg-time">Meeting time (optional)</Label>
          <Input
            id="reg-time"
            type="time"
            value={form.time}
            onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Leave blank to register the lead only. Date and time books a meeting.
          </p>
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-3">
          <Button type="submit" disabled={submit.isPending}>
            <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
            {submit.isPending ? 'Submitting…' : 'Submit registration'}
          </Button>
        </div>
      </form>

      {resubmitId ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void resubmit.mutate(resubmitId);
          }}
          className="grid gap-3 rounded-lg border border-rose-500/40 bg-rose-500/5 p-4 shadow-panel sm:grid-cols-2 lg:grid-cols-3"
        >
          <p className="sm:col-span-2 lg:col-span-3 text-sm font-semibold text-navy">
            Duplicate — update the alternative number and submit as a new request.
            The original red/green records stay on the list.
          </p>
          <div>
            <Label>Alternative number</Label>
            <Input
              value={altPhone}
              onChange={(e) => setAltPhone(e.target.value)}
              required
              placeholder="New number to register"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={resubmitEmail}
              onChange={(e) => setResubmitEmail(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={resubmit.isPending}>
              {resubmit.isPending ? 'Submitting…' : 'Submit new request'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setResubmitId(null);
                const next = new URLSearchParams(params);
                next.delete('edit');
                setParams(next, { replace: true });
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-200">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          {notice}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            resetPage();
          }}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="REGISTERED">Lead registered</option>
          <option value="DUPLICATE">Duplicate lead</option>
        </select>
        <Input
          className="h-9 w-52"
          placeholder="Search name or number"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setAppliedQ(q);
              resetPage();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setAppliedQ(q);
            resetPage();
          }}
        >
          Search
        </Button>
        <span className="text-xs text-muted-foreground">{total} record(s)</span>
      </div>

      {query.isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <DataTable
          columns={columns}
          data={query.data?.data ?? []}
          pagination={{
            page,
            limit,
            total,
            pageCount: query.data?.meta.pageCount ?? 1,
            onPageChange: setPage,
            onLimitChange: setLimit,
            isFetching: query.isFetching,
          }}
        />
      )}
    </div>
  );
}

export function LeadRegistrationsPage() {
  const role = useAuthStore((s) => s.user?.role);
  return (
    <LeadRegistrationPanel
      variant={role === 'USER' ? 'agent' : 'admin'}
    />
  );
}
