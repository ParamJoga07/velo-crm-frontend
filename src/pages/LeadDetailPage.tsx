import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CalendarPlus,
  MessageSquare,
  Phone,
  StickyNote,
} from 'lucide-react';
import { LEAD_STAGE_LABELS, type LeadStage } from '@velo/shared';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/data-table';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

const STAGES = Object.keys(LEAD_STAGE_LABELS) as LeadStage[];

type LeadDetail = {
  lead: {
    id: string;
    name: string;
    phone: string;
    altPhone: string | null;
    email: string | null;
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

type Tab = 'note' | 'followup' | 'call' | 'whatsapp';

function activityText(a: LeadDetail['activities'][0]) {
  const p = a.payload ?? {};
  if (typeof p.message === 'string' && p.message) return p.message;
  if (a.type === 'NOTE') return String(p.text ?? '');
  if (a.type === 'STAGE_CHANGE')
    return `Lead stage was changed from ${String(p.from ?? '')} to ${String(p.to ?? '')}${
      p.lostReason ? ` (${String(p.lostReason)})` : ''
    }.`;
  if (a.type === 'FOLLOWUP_SCHEDULED')
    return `Follow-up scheduled: ${String(p.title ?? 'Follow-up')} at ${
      p.scheduledAt ? new Date(String(p.scheduledAt)).toLocaleString() : ''
    }`;
  if (a.type === 'TASK_COMPLETED')
    return `Completed: ${String(p.title ?? 'Task')}`;
  if (a.type === 'LEAD_OPENED') return 'Lead was opened.';
  if (a.type === 'VIEW_NO_ACTION')
    return 'Opened without saving — marked as No Future Activity.';
  return a.type;
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('note');
  const [note, setNote] = useState('');
  const [lostReason, setLostReason] = useState('');
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
  const openedLogged = useRef(false);

  const query = useQuery({
    queryKey: ['lead', id],
    enabled: !!id,
    refetchInterval: 15_000,
    queryFn: () =>
      apiFetch<LeadDetail>(`/api/leads/${id}`, { accessToken }),
  });

  useEffect(() => {
    if (!id || !accessToken || openedLogged.current) return;
    openedLogged.current = true;
    savedSomething.current = false;
    void apiFetch(`/api/leads/${id}/open`, {
      method: 'POST',
      accessToken,
    }).catch(() => undefined);

    return () => {
      if (!savedSomething.current && accessToken) {
        void fetch(`/api/leads/${id}/close-no-action`, {
          method: 'POST',
          credentials: 'include',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: '{}',
        }).catch(() => undefined);
      }
    };
  }, [id, accessToken]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['lead', id] });
    void qc.invalidateQueries({ queryKey: ['leads'] });
    void qc.invalidateQueries({ queryKey: ['agent-dashboard'] });
  };

  const markSaved = () => {
    savedSomething.current = true;
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

  const updateStage = useMutation({
    mutationFn: (stage: string) =>
      apiFetch(`/api/leads/${id}/stage`, {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({
          stage,
          lostReason: stage === 'LOST' ? lostReason || 'Not interested' : null,
        }),
      }),
    onSuccess: () => {
      markSaved();
      setError(null);
      invalidate();
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

  const onNoteSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    saveNote.mutate();
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
        description={`#${lead.id.slice(0, 8)} · ${lead.phone}${
          lead.email ? ` · ${lead.email}` : ''
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface font-mono text-sm font-semibold text-navy">
              {lead.score}
            </span>
            <Badge tone="new">{query.data?.meta.openTasks ?? 0} tasks</Badge>
            {lead.noFutureFlag ? (
              <Badge tone="warning">No future</Badge>
            ) : null}
            <Button size="sm" className="w-full sm:w-auto" onClick={() => setFollowupOpen(true)}>
              <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
              <span className="sm:hidden">Follow-up</span>
              <span className="hidden sm:inline">Schedule follow-up</span>
            </Button>
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

      <div className="grid gap-4 lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr]">
        <aside className="space-y-3">
          <section className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel">
            <Label>Stage &amp; status</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
              value={lead.stage}
              onChange={(e) => updateStage.mutate(e.target.value)}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
            {lead.stage === 'LOST' || updateStage.variables === 'LOST' ? (
              <Input
                className="mt-2"
                placeholder="Lost reason"
                value={lostReason || lead.lostReason || ''}
                onChange={(e) => setLostReason(e.target.value)}
                onBlur={() => {
                  if (lead.stage === 'LOST' && lostReason.trim()) {
                    updateStage.mutate('LOST');
                  }
                }}
              />
            ) : null}
            {lead.lostReason ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Reason: {lead.lostReason}
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-surface-raised p-3 text-sm shadow-panel">
            <dl className="space-y-2">
              <Row label="Received on" value={new Date(lead.createdAt).toLocaleString()} />
              <Row label="Lead age" value={`${query.data?.meta.ageDays ?? 0} days`} />
              <Row label="Source / tags" value={lead.source} />
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

          {(tab === 'call' || tab === 'whatsapp') && (
            <div className="rounded-lg border border-dashed border-border bg-surface-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
              {tab === 'call'
                ? 'Telephony integration is not required for this rollout. Use notes and follow-ups to track outreach.'
                : 'WhatsApp messaging will plug in later. Schedule a follow-up or leave a note for now.'}
            </div>
          )}

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
                    <span className="shrink-0">{new Date(a.createdAt).toLocaleString()}</span>
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
                  No history yet — add a note or schedule a follow-up.
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
                  <option value="SITE_VISIT">Site visit</option>
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
      <dd className="text-right font-medium text-navy">{value}</dd>
    </div>
  );
}
