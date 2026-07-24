import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  Mail,
  PhoneMissed,
  UserPlus,
  AlertTriangle,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AgentDash = {
  cards: {
    newEnquiries: number;
    unreadEmails: number;
    missedCalls: number;
    noFutureActivity: number;
    reengagedLeads: number;
    missedFollowups: number;
    missedSiteVisits: number;
    myAssigned: number;
  };
  todayAgenda: {
    id: string;
    title: string;
    kind: string;
    scheduledAt: string;
    lead: { id: string; name: string; phone: string } | null;
  }[];
  openTasks: {
    id: string;
    title: string;
    kind: string;
    scheduledAt: string;
    status: string;
    lead: { id: string; name: string; phone: string } | null;
  }[];
};

function MetricCard({
  label,
  value,
  to,
  accent,
  icon: Icon,
}: {
  label: string;
  value: number;
  to?: string;
  accent?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const inner = (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface-raised p-4 shadow-panel transition-colors',
        accent && value > 0 && 'border-emerald-500/40 bg-emerald-500/5',
        to && 'hover:border-primary/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p
        className={cn(
          'mt-2 font-mono text-3xl font-semibold tabular-nums',
          accent && value > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-navy',
        )}
      >
        {value}
      </p>
    </div>
  );
  if (!to) return inner;
  return <Link to={to}>{inner}</Link>;
}

export function AgentDashboardPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: ['agent-dashboard', user?.id],
    refetchInterval: 30_000,
    queryFn: () =>
      apiFetch<AgentDash>('/api/leads/agent-dashboard', { accessToken }),
  });

  const cards = query.data?.cards;
  const nowLabel = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Dashboard"
        description={`Last refresh ${nowLabel} · ${user?.name ?? ''}`}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void query.refetch()}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="New Enquiries"
          value={cards?.newEnquiries ?? 0}
          to="/leads?smart=new"
          icon={UserPlus}
        />
        <MetricCard
          label="Unread Emails"
          value={cards?.unreadEmails ?? 0}
          icon={Mail}
        />
        <MetricCard
          label="Missed Calls"
          value={cards?.missedCalls ?? 0}
          icon={PhoneMissed}
        />
        <MetricCard
          label="No Future Activity"
          value={cards?.noFutureActivity ?? 0}
          to="/leads?smart=no_future_activity"
          accent
          icon={AlertTriangle}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Re-engaged Leads"
          value={cards?.reengagedLeads ?? 0}
          icon={RefreshCw}
        />
        <MetricCard
          label="Missed Followups"
          value={cards?.missedFollowups ?? 0}
          to="/leads?smart=missed_followups"
          accent
          icon={CalendarClock}
        />
        <MetricCard
          label="Missed Site Visits"
          value={cards?.missedSiteVisits ?? 0}
          icon={MapPin}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rounded-lg border border-border bg-surface-raised p-4 shadow-panel">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-navy">Pipeline snapshot</h2>
            <Link
              to="/leads"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all leads →
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            You have{' '}
            <strong className="text-navy">{cards?.myAssigned ?? 0}</strong>{' '}
            lead(s) in your workspace. Use smart lists on the leads page for
            missed follow-ups, untouched leads, and more.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/leads?smart=missed_followups">Missed follow-ups</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to="/leads?smart=untouched">Untouched leads</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to="/leads?smart=new">New enquiries</Link>
            </Button>
          </div>
        </section>

        <aside className="space-y-3">
          {(cards?.missedFollowups ?? 0) > 0 ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                Missed followups
              </p>
              <p className="mt-0.5 font-mono text-2xl font-semibold text-rose-800 dark:text-rose-200">
                {cards?.missedFollowups}
              </p>
            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel">
            <div className="mb-2 flex gap-3 border-b border-border text-xs font-semibold">
              <span className="border-b-2 border-primary pb-2 text-primary">
                Today&apos;s Agenda
              </span>
              <span className="pb-2 text-muted-foreground">
                Open Tasks ({query.data?.openTasks.length ?? 0})
              </span>
            </div>
            <ul className="max-h-72 space-y-2 overflow-auto">
              {(query.data?.todayAgenda.length
                ? query.data.todayAgenda
                : query.data?.openTasks.slice(0, 8) ?? []
              ).map((t) => (
                <li
                  key={t.id}
                  className="rounded-md border border-border/80 bg-surface px-2.5 py-2 text-xs"
                >
                  <div className="font-medium text-navy">{t.title}</div>
                  <div className="mt-0.5 text-muted-foreground">
                    {new Date(t.scheduledAt).toLocaleString()}
                    {t.lead ? (
                      <>
                        {' · '}
                        <Link
                          to={`/leads/${t.lead.id}`}
                          className="text-primary hover:underline"
                        >
                          {t.lead.name}
                        </Link>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
              {!query.data?.todayAgenda.length &&
              !query.data?.openTasks.length ? (
                <li className="py-6 text-center text-xs text-muted-foreground">
                  Nothing scheduled for today.
                </li>
              ) : null}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
