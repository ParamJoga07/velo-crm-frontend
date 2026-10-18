import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CalendarPlus,
  Mail,
  MessageSquare,
  Phone,
  PhoneMissed,
  StickyNote,
  Save,
  Trash2,
  Users,
  Video,
} from 'lucide-react';
import {
  LEAD_STAGE_LABELS,
  PROJECT_NAMES,
  isProspectRatingEditable,
  nextDnpStage,
  type LeadStage,
} from '@velo/shared';
import {
  normalizeListEnvelope,
  type ListEnvelope,
} from '@/hooks/useTablePagination';
import { PageHeader } from '@/components/PageHeader';
import { LeadPriorityBadge, LeadStageBadge } from '@/components/LeadStatusBadges';
import { LeadStagePipeline } from '@/components/LeadStagePipeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/data-table';
import { apiBeacon, apiFetch } from '@/lib/api';
import { LeadPhoneLink } from '@/components/LeadPhoneLink';
import { formatLeadNo } from '@/lib/lead-number';
import { useAuthStore } from '@/stores/auth';
import { useConfirm } from '@/lib/confirm';
import { cn } from '@/lib/utils';


type LeadDetail = {
  lead: {
    id: string;
    leadNo: number;
    name: string;
    phone: string;
    altPhone: string | null;
    email: string | null;
    city: string | null;
    requirement: string | null;
    configuration: string | null;
    remarks: string | null;
    priority: string;
    stage: string;
    source: string;
    score: number;
    lostReason: string | null;
    noFutureFlag?: boolean;
    createdAt: string;
    assignedTo: { id: string; name: string; email: string } | null;
    team: { id: string; name: string } | null;
    campaign: { id: string; name: string } | null;
  };
  activities: {
    id: string;
    type: string;
    payload: Record<string, unknown>;
    createdAt: string;
    user: { id: string; name: string; email: string } | null;
  }[];
  tasks: {
    id: string;
    kind: string;
    title: string;
    notes: string | null;
    scheduledAt: string;
    status: string;
    assignee: { id: string; name: string } | null;
  }[];
  meta: {
    openTasks: number;
    ageDays: number;
    lastActivityAt: string | null;
  };
};

type Tab =
  | 'note'
  | 'followup'
  | 'call'
  | 'whatsapp'
  | 'meeting'
  | 'email';

const ACTIVITY_TAB_TYPE: Record<
  Exclude<Tab, 'note' | 'followup'>,
  'CALL' | 'WHATSAPP' | 'MEETING' | 'EMAIL'
> = {
  call: 'CALL',
  whatsapp: 'WHATSAPP',
  meeting: 'MEETING',
  email: 'EMAIL',
};

function activityText(a: LeadDetail['activities'][0]) {
  const p = a.payload ?? {};
  if (typeof p.message === 'string' && p.message) return p.message;
  if (typeof p.notes === 'string' && p.notes) return p.notes;
  if (a.type === 'NOTE') return String(p.text ?? '');
  if (a.type === 'STAGE_CHANGE')
    return `Lead stage was changed from ${String(p.from ?? '')} to ${String(p.to ?? '')}${
      p.lostReason ? ` (${String(p.lostReason)})` : ''
    }.`;
  if (a.type === 'FOLLOWUP_SCHEDULED')
    return `Follow-up scheduled: ${String(p.title ?? 'Follow-up')} at ${
      p.scheduledAt ? new Date(String(p.scheduledAt)).toLocaleString() : ''
    }`;
  if (a.type === 'TASK_COMPLETED') return `Completed: ${String(p.title ?? 'Task')}`;
  if (a.type === 'LEAD_OPENED') return 'Lead was opened.';
  if (a.type === 'VIEW_NO_ACTION')
    return 'Opened without saving — marked as No Future Activity.';
  if (a.type === 'CALL_INITIATED')
    return `Dialpad opened for ${String(p.phone ?? '')}.`;
  if (a.type === 'DID_NOT_PICK')
    return p.from
      ? `Did not pick — lead moved from ${String(p.from)} to ${String(p.to)}.`
      : `Did not pick — lead stays at ${String(p.stage ?? 'DNP3')}.`;
  return a.type;
}

/**
 * A React StrictMode remount tears the open/close effect down and sets it back
 * up in the same tick, so the "left without saving" report is deferred briefly
 * and cancelled if the same lead is opened again inside that window.
 */
const pendingNoAction = new Map<string, ReturnType<typeof setTimeout>>();

function cancelNoActionReport(leadId: string) {
  const timer = pendingNoAction.get(leadId);
  if (timer) {
    clearTimeout(timer);
    pendingNoAction.delete(leadId);
  }
}

function scheduleNoActionReport(leadId: string, accessToken: string) {
  cancelNoActionReport(leadId);
  pendingNoAction.set(
    leadId,
    setTimeout(() => {
      pendingNoAction.delete(leadId);
      apiBeacon(`/api/leads/${leadId}/close-no-action`, { accessToken });
    }, 500),
  );
}

type LeadDraft = {
  name: string;
  phone: string;
  altPhone: string;
  email: string;
  city: string;
  requirement: string;
  configuration: string;
  remarks: string;
  source: string;
  stage: string;
  priority: string;
  lostReason: string;
};

function draftFromLead(lead: LeadDetail['lead']): LeadDraft {
  return {
    name: lead.name,
    phone: lead.phone,
    altPhone: lead.altPhone ?? '',
    email: lead.email ?? '',
    city: lead.city ?? '',
    requirement: lead.requirement ?? '',
    configuration: lead.configuration ?? '',
    remarks: lead.remarks ?? '',
    source: lead.source,
    stage: lead.stage,
    priority: lead.priority,
    lostReason: lead.lostReason ?? '',
  };
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const confirm = useConfirm();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('note');
  const [note, setNote] = useState('');
  const [activityNotes, setActivityNotes] = useState('');
  const [activityOutcome, setActivityOutcome] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingProjects, setMeetingProjects] = useState<string[]>([]);
  const [meetingTakers, setMeetingTakers] = useState<string[]>([]);
  const [draft, setDraft] = useState<LeadDraft | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followup, setFollowup] = useState({
    date: '',
    time: '18:00',
    title: '',
    notes: '',
    kind: 'FOLLOW_UP',
  });
  const [error, setError] = useState<string | null>(null);
  const savedSomething = useRef(false);
  const openedLogged = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ['lead', id],
    enabled: !!id,
    refetchInterval: 15_000,
    queryFn: () => apiFetch<LeadDetail>(`/api/leads/${id}`, { accessToken }),
  });

  const agents = useQuery({
    queryKey: ['users-agents'],
    queryFn: async () => {
      const res = await apiFetch<ListEnvelope<{ id: string; name: string }>>(
        '/api/users/directory',
        { accessToken },
      );
      return normalizeListEnvelope(res).data;
    },
  });

  useEffect(() => {
    if (!id || !accessToken) return;
    cancelNoActionReport(id);
    if (openedLogged.current !== id) {
      openedLogged.current = id;
      savedSomething.current = false;
      void apiFetch(`/api/leads/${id}/open`, {
        method: 'POST',
        accessToken,
      }).catch(() => undefined);
    }

    // A tab close / reload never runs the cleanup below, so cover it too — and
    // there is no point deferring when the page is already going away.
    const onPageHide = () => {
      if (savedSomething.current) return;
      apiBeacon(`/api/leads/${id}/close-no-action`, { accessToken });
    };
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('pagehide', onPageHide);
      // Leaving the lead without saving anything moves it to No future activity.
      if (!savedSomething.current) scheduleNoActionReport(id, accessToken);
    };
  }, [id, accessToken]);

  // Navigating to a different lead drops any draft from the previous one.
  useEffect(() => {
    setDraft(null);
    setSaveNotice(null);
  }, [id]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['lead', id] });
    void qc.invalidateQueries({ queryKey: ['leads'] });
    void qc.invalidateQueries({ queryKey: ['agent-dashboard'] });
  };

  const markSaved = () => {
    savedSomething.current = true;
    if (id) cancelNoActionReport(id);
  };

  const saveNote = useMutation({
    mutationFn: () =>
      apiFetch(`/api/leads/${id}/notes`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ note }),
      }),
    onSuccess: () => {
      markSaved();
      setNote('');
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const logActivity = useMutation({
    mutationFn: (type: string) =>
      apiFetch(`/api/leads/${id}/activities`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          type,
          notes: activityNotes.trim() || null,
          outcome: activityOutcome.trim() || null,
        }),
      }),
    onSuccess: () => {
      markSaved();
      setActivityNotes('');
      setActivityOutcome('');
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const saveLead = useMutation({
    mutationFn: (body: LeadDraft) =>
      apiFetch<LeadDetail['lead']>(`/api/leads/${id}`, {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({
          name: body.name.trim(),
          phone: body.phone.trim(),
          altPhone: body.altPhone.trim() || null,
          email: body.email.trim() || null,
          city: body.city.trim() || null,
          requirement: body.requirement.trim() || null,
          configuration: body.configuration.trim() || null,
          remarks: body.remarks.trim() || null,
          source: body.source.trim(),
          stage: body.stage,
          priority: body.priority,
          lostReason:
            body.stage === 'LOST'
              ? body.lostReason.trim() || 'Not interested'
              : null,
        }),
      }),
    onSuccess: (saved) => {
      markSaved();
      setError(null);
      setSaveNotice('Lead details saved.');
      setDraft(draftFromLead(saved));
      invalidate();
    },
    onError: (e: Error) => {
      setSaveNotice(null);
      setError(e.message);
    },
  });

  const removeLead = useMutation({
    mutationFn: () =>
      apiFetch(`/api/leads/${id}`, { method: 'DELETE', accessToken }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['leads'] });
      navigate('/leads');
    },
    onError: (e: Error) => setError(e.message),
  });

  const scheduleFollowup = useMutation({
    mutationFn: () => {
      const scheduledAt = new Date(`${followup.date}T${followup.time}:00`);
      return apiFetch(`/api/leads/${id}/followups`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          scheduledAt: scheduledAt.toISOString(),
          title: followup.title || 'Follow-up call',
          notes: followup.notes,
          kind: followup.kind,
        }),
      });
    },
    onSuccess: () => {
      markSaved();
      setFollowupOpen(false);
      setFollowup({
        date: '',
        time: '18:00',
        title: '',
        notes: '',
        kind: 'FOLLOW_UP',
      });
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const markDidNotPick = useMutation({
    mutationFn: () =>
      apiFetch(`/api/leads/${id}/did-not-pick`, {
        method: 'POST',
        accessToken,
      }),
    onSuccess: () => {
      markSaved();
      setError(null);
      // The server owns the new stage, so drop any stale draft of it.
      setDraft(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const completeTask = useMutation({
    mutationFn: (taskId: string) =>
      apiFetch(`/api/leads/tasks/${taskId}/complete`, {
        method: 'POST',
        accessToken,
      }),
    onSuccess: () => {
      markSaved();
      invalidate();
    },
  });

  const lead = query.data?.lead;
  const scheduledPreview = useMemo(() => {
    if (!followup.date) return null;
    try {
      return new Date(`${followup.date}T${followup.time}:00`).toLocaleString();
    } catch {
      return null;
    }
  }, [followup.date, followup.time]);

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Lead" description="Loading…" />
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (query.isError || !lead) {
    return (
      <div className="space-y-4">
        <PageHeader title="Lead" description="Not found or out of scope" />
        <Button asChild variant="secondary">
          <Link to="/leads">Back to leads</Link>
        </Button>
      </div>
    );
  }

  // The form is seeded from the server copy until the user edits something;
  // after that the draft wins, so a background poll never clobbers typing.
  const saved = draftFromLead(lead);
  const form = draft ?? saved;
  const isDirty = (Object.keys(saved) as (keyof LeadDraft)[]).some(
    (key) => form[key] !== saved[key],
  );
  const setField = (key: keyof LeadDraft, value: string) =>
    setDraft((current) => ({ ...(current ?? saved), [key]: value }));

  const onNoteSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    saveNote.mutate();
  };

  const onActivitySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (tab === 'note' || tab === 'followup') return;
    if (tab === 'meeting' && meetingDate && meetingTime && query.data?.lead) {
      const visitAt = new Date(`${meetingDate}T${meetingTime}:00`).toISOString();
      void apiFetch('/api/lead-registrations', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          clientName: query.data.lead.name,
          clientNumber: query.data.lead.phone,
          altPhone: query.data.lead.altPhone,
          email: query.data.lead.email,
          projectName: meetingProjects.join(', ') || null,
          visitAt,
          takerIds: meetingTakers,
        }),
      })
        .then(() => {
          setMeetingDate('');
          setMeetingTime('');
          setMeetingProjects([]);
          setMeetingTakers([]);
          void qc.invalidateQueries({ queryKey: ['lead-registrations'] });
          void qc.invalidateQueries({ queryKey: ['meetings'] });
        })
        .catch((err: Error) => setError(err.message));
    }
    logActivity.mutate(ACTIVITY_TAB_TYPE[tab]);
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        <Link to="/leads" className="hover:text-primary">
          All Leads
        </Link>
        <span className="mx-1.5">›</span>
        <span className="text-navy">{lead.name}</span>
      </div>

      <PageHeader
        title={lead.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="font-mono font-semibold text-navy">
              {formatLeadNo(lead.leadNo)}
            </span>
            <span>·</span>
            <LeadPhoneLink leadId={lead.id} phone={lead.phone} showIcon />
            {lead.email ? <span>· {lead.email}</span> : null}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isProspectRatingEditable(lead.stage) ? (
              <LeadPriorityBadge priority={lead.priority} emphasis />
            ) : null}
            <LeadStageBadge stage={lead.stage} emphasis />
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface font-mono text-sm font-semibold text-navy">
              {lead.score}
            </span>
            <Button
              size="sm"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={markDidNotPick.isPending}
              title={`Moves this lead to ${LEAD_STAGE_LABELS[nextDnpStage(lead.stage as LeadStage)]}`}
              onClick={() => markDidNotPick.mutate()}
            >
              <PhoneMissed className="mr-1.5 h-3.5 w-3.5" />
              Did not pick
            </Button>
            {role !== 'USER' ? (
              <Button
                size="sm"
                variant="secondary"
                className="text-danger"
                disabled={removeLead.isPending}
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Delete this lead?',
                    description: 'This permanently removes the lead and cannot be undone.',
                    confirmLabel: 'Delete',
                    variant: 'danger',
                  });
                  if (!ok) return;
                  removeLead.mutate();
                }}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            ) : null}
          </div>
        }
      />

      {!lead.email ? (
        <div className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-900 dark:text-sky-100">
          No email is available for this lead. Please request their email on the
          next call.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-surface-raised p-3 shadow-panel sm:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Pipeline
          </h3>
          {isDirty ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-amber-600">
                Unsaved changes
              </span>
              <Button
                size="sm"
                className="h-7"
                disabled={saveLead.isPending}
                onClick={() => saveLead.mutate(form)}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saveLead.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <LeadStagePipeline
            value={form.stage}
            disabled={saveLead.isPending}
            onChange={(stage) => setField('stage', stage)}
            priority={form.priority}
            onPriorityChange={(priority) => setField('priority', priority)}
            lostReason={form.lostReason}
            onLostReasonChange={(reason) => {
              setField('stage', 'LOST');
              setField('lostReason', reason);
            }}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr]">
        <aside className="space-y-3">
          <form
            className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel"
            onSubmit={(e) => {
              e.preventDefault();
              if (form && isDirty) saveLead.mutate(form);
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Lead details
              </h3>
              {isDirty ? (
                <span className="text-[11px] font-medium text-amber-600">
                  Unsaved changes
                </span>
              ) : null}
            </div>

            <Label>Name</Label>
            <Input
              className="mt-1"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
            />

            <Label className="mt-3 block">Phone</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                className="flex-1"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
              />
              <LeadPhoneLink
                leadId={lead.id}
                phone={lead.phone}
                className="shrink-0 text-xs"
                showIcon
              />
            </div>

            <Label className="mt-3 block">Alternate phone</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                className="flex-1"
                value={form.altPhone}
                onChange={(e) => setField('altPhone', e.target.value)}
              />
              {lead.altPhone ? (
                <LeadPhoneLink
                  leadId={lead.id}
                  phone={lead.altPhone}
                  field="altPhone"
                  className="shrink-0 text-xs"
                  showIcon
                />
              ) : null}
            </div>

            <Label className="mt-3 block">Email</Label>
            <Input
              className="mt-1"
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
            />

            <Label className="mt-3 block">City</Label>
            <Input
              className="mt-1"
              value={form.city}
              onChange={(e) => setField('city', e.target.value)}
            />

            <Label className="mt-3 block">Requirement</Label>
            <Input
              className="mt-1"
              value={form.requirement}
              onChange={(e) => setField('requirement', e.target.value)}
            />

            <Label className="mt-3 block">Configuration</Label>
            <Input
              className="mt-1"
              value={form.configuration}
              onChange={(e) => setField('configuration', e.target.value)}
            />

            <Label className="mt-3 block">Source / tags</Label>
            <Input
              className="mt-1"
              value={form.source}
              onChange={(e) => setField('source', e.target.value)}
            />

            <Label className="mt-3 block">Remarks</Label>
            <textarea
              className="mt-1 min-h-[72px] w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
              value={form.remarks}
              onChange={(e) => setField('remarks', e.target.value)}
            />

            <div className="mt-3 flex items-center gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={!isDirty || saveLead.isPending}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saveLead.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!isDirty || saveLead.isPending}
                onClick={() => {
                  setDraft(draftFromLead(lead));
                  setSaveNotice(null);
                }}
              >
                Reset
              </Button>
            </div>
            {saveNotice && !isDirty ? (
              <p className="mt-2 text-xs text-emerald-600">{saveNotice}</p>
            ) : null}
          </form>

          <section className="rounded-lg border border-border bg-surface-raised p-3 text-sm shadow-panel">
            <dl className="space-y-2">
              <Row label="Lead ID" value={formatLeadNo(lead.leadNo)} />
              <Row label="Received on" value={new Date(lead.createdAt).toLocaleString()} />
              <Row label="Lead age" value={`${query.data?.meta.ageDays ?? 0} days`} />
              <Row label="Owner" value={lead.assignedTo?.name ?? 'Unassigned'} />
              <Row label="Team" value={lead.team?.name ?? '—'} />
              <Row label="Campaign" value={lead.campaign?.name ?? '—'} />
              <Row
                label="Last activity"
                value={
                  query.data?.meta.lastActivityAt
                    ? new Date(query.data.meta.lastActivityAt).toLocaleString()
                    : '—'
                }
              />
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Open follow-ups
            </h3>
            <ul className="mt-2 space-y-2">
              {query.data?.tasks
                .filter((t) => t.status === 'OPEN')
                .map((t) => (
                  <li
                    key={t.id}
                    className="rounded-md border border-border bg-surface px-2.5 py-2 text-xs"
                  >
                    <div className="font-medium text-navy">{t.title}</div>
                    <div className="text-muted-foreground">
                      {new Date(t.scheduledAt).toLocaleString()}
                      {new Date(t.scheduledAt) < new Date() ? (
                        <span className="ml-1 text-rose-600">· missed</span>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2 h-7"
                      onClick={() => completeTask.mutate(t.id)}
                    >
                      Mark done
                    </Button>
                  </li>
                ))}
              {!query.data?.tasks.some((t) => t.status === 'OPEN') ? (
                <li className="text-xs text-muted-foreground">No open tasks</li>
              ) : null}
            </ul>
          </section>
        </aside>

        <div className="space-y-3">
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface-raised p-1 shadow-panel">
            {(
              [
                { id: 'note', label: 'Note', icon: StickyNote },
                { id: 'followup', label: 'Followup', icon: CalendarPlus },
                { id: 'call', label: 'Call', icon: Phone },
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                { id: 'meeting', label: 'Meeting', icon: Users },
                { id: 'email', label: 'Email', icon: Mail },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  if (t.id === 'followup') setFollowupOpen(true);
                }}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors sm:py-1.5',
                  tab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-navy/70 hover:bg-surface-muted',
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'note' ? (
            <form
              onSubmit={onNoteSubmit}
              className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel"
            >
              <textarea
                className="min-h-[120px] w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
                placeholder="Add note for lead"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="mt-2 flex justify-end">
                <Button type="submit" disabled={saveNote.isPending || !note.trim()}>
                  Save note
                </Button>
              </div>
            </form>
          ) : null}

          {tab !== 'note' && tab !== 'followup' ? (
            <form
              onSubmit={onActivitySubmit}
              className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-navy">
                {tab === 'call' ? <Phone className="h-4 w-4" /> : null}
                {tab === 'meeting' ? <Video className="h-4 w-4" /> : null}
                Log {ACTIVITY_TAB_TYPE[tab].replace(/_/g, ' ').toLowerCase()}
              </div>
              {tab === 'meeting' ? (
                <div className="mb-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label>Date</Label>
                    <Input
                      className="mt-1"
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input
                      className="mt-1"
                      type="time"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Meeting taken by</Label>
                    <select
                      multiple
                      className="mt-1 h-24 w-full rounded-md border border-border bg-surface px-2 text-sm"
                      value={meetingTakers}
                      onChange={(e) =>
                        setMeetingTakers(
                          [...e.target.selectedOptions].map((o) => o.value),
                        )
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
                    <Label>Projects</Label>
                    <select
                      multiple
                      className="mt-1 h-24 w-full rounded-md border border-border bg-surface px-2 text-sm"
                      value={meetingProjects}
                      onChange={(e) =>
                        setMeetingProjects(
                          [...e.target.selectedOptions].map((o) => o.value),
                        )
                      }
                    >
                      {PROJECT_NAMES.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}
              <Input
                className="mb-2"
                placeholder="Outcome (e.g. Connected / No answer / Interested)"
                value={activityOutcome}
                onChange={(e) => setActivityOutcome(e.target.value)}
              />
              <textarea
                className="min-h-[100px] w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
                placeholder="Notes from this activity"
                value={activityNotes}
                onChange={(e) => setActivityNotes(e.target.value)}
              />
              <div className="mt-2 flex justify-end">
                <Button type="submit" disabled={logActivity.isPending}>
                  {logActivity.isPending ? 'Saving…' : 'Log activity'}
                </Button>
              </div>
            </form>
          ) : null}

          <section className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel">
            <h3 className="mb-2 text-sm font-semibold text-navy">Activity log</h3>
            <ul className="max-h-[480px] space-y-2 overflow-auto">
              {(query.data?.activities ?? []).map((a) => (
                <li
                  key={a.id}
                  className="rounded-md border border-border/70 bg-surface px-3 py-2 text-sm"
                >
                  <div className="flex flex-col gap-1 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <span className="font-semibold uppercase tracking-wide">
                      {a.type.replace(/_/g, ' ')}
                    </span>
                    <span className="shrink-0">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-navy">{activityText(a)}</p>
                  {a.user ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      by {a.user.name}
                    </p>
                  ) : null}
                </li>
              ))}
              {!query.data?.activities.length ? (
                <li className="py-8 text-center text-sm text-muted-foreground">
                  No history yet — add a note or log an activity.
                </li>
              ) : null}
            </ul>
          </section>
        </div>
      </div>

      {followupOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl border border-border bg-surface-raised p-4 shadow-xl sm:rounded-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-navy">Followup</h2>
              <button
                type="button"
                className="text-muted-foreground hover:text-navy"
                onClick={() => setFollowupOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={followup.date}
                    onChange={(e) =>
                      setFollowup((f) => ({ ...f, date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={followup.time}
                    onChange={(e) =>
                      setFollowup((f) => ({ ...f, time: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Followup type</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                  value={followup.kind}
                  onChange={(e) =>
                    setFollowup((f) => ({ ...f, kind: e.target.value }))
                  }
                >
                  <option value="FOLLOW_UP">Call</option>
                  <option value="MEETING">Meeting</option>
                  <option value="EMAIL">Email</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </select>
              </div>
              <div>
                <Label>Subject</Label>
                <Input
                  placeholder="Subject"
                  value={followup.title}
                  onChange={(e) =>
                    setFollowup((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Agenda</Label>
                <textarea
                  className="mt-1 min-h-[88px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  placeholder="Notes / Agenda"
                  value={followup.notes}
                  onChange={(e) =>
                    setFollowup((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {scheduledPreview
                  ? `Will be scheduled at ${scheduledPreview}`
                  : 'Select a date to schedule'}
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setFollowupOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!followup.date || scheduleFollowup.isPending}
                  onClick={() => scheduleFollowup.mutate()}
                >
                  Schedule Followup
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] text-right font-medium text-navy">{value}</dd>
    </div>
  );
}
