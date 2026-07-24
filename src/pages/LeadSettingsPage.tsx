import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { TableSkeleton } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

type LeadSettings = {
  campaigns: { id: string; name: string; source: string | null; isActive: boolean }[];
  projects: { id: string; name: string; city: string | null; isActive: boolean }[];
  customFields: { id: string; key: string; label: string; type: string; required: boolean }[];
  assignmentRules: {
    id: string;
    priority: number;
    strategy: string;
    isActive: boolean;
    source: string | null;
    team: { id: string; name: string } | null;
  }[];
  teams: { id: string; name: string }[];
  stagesInUse: { stage: string; count: number }[];
  sourcesInUse: { source: string; count: number }[];
};

export function LeadSettingsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [campaignName, setCampaignName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [ruleTeamId, setRuleTeamId] = useState('');

  const query = useQuery({
    queryKey: ['lead-settings'],
    queryFn: () =>
      apiFetch<LeadSettings>('/api/lead-settings', { accessToken }),
  });

  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ['lead-settings'] });

  const createCampaign = useMutation({
    mutationFn: () =>
      apiFetch('/api/lead-settings/campaigns', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ name: campaignName }),
      }),
    onSuccess: () => {
      setCampaignName('');
      invalidate();
    },
  });

  const createProject = useMutation({
    mutationFn: () =>
      apiFetch('/api/lead-settings/projects', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ name: projectName }),
      }),
    onSuccess: () => {
      setProjectName('');
      invalidate();
    },
  });

  const createField = useMutation({
    mutationFn: () =>
      apiFetch('/api/lead-settings/custom-fields', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          key: fieldKey || fieldLabel.toLowerCase().replace(/\s+/g, '_'),
          label: fieldLabel,
          type: 'TEXT',
        }),
      }),
    onSuccess: () => {
      setFieldKey('');
      setFieldLabel('');
      invalidate();
    },
  });

  const createRule = useMutation({
    mutationFn: () =>
      apiFetch('/api/lead-settings/assignment-rules', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          strategy: 'ROUND_ROBIN',
          teamId: ruleTeamId || null,
          priority: 100,
        }),
      }),
    onSuccess: () => {
      setRuleTeamId('');
      invalidate();
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Lead Settings" />
        <TableSkeleton />
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Lead Settings" />
        <p className="text-sm text-danger">Unable to load settings.</p>
      </div>
    );
  }

  const data = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Settings"
        description="Campaigns, projects, fields, and distribution rules"
      />

      <Section title="Campaigns">
        <div className="mb-3 flex flex-wrap gap-2">
          <Input
            placeholder="New campaign name"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="max-w-xs"
          />
          <Button
            size="sm"
            disabled={!campaignName || createCampaign.isPending}
            onClick={() => createCampaign.mutate()}
          >
            Add
          </Button>
        </div>
        {data.campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">None configured yet.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {data.campaigns.map((c) => (
              <div
                key={c.id}
                className="rounded-md border border-border bg-surface-raised p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-navy">{c.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      void apiFetch(`/api/lead-settings/campaigns/${c.id}`, {
                        method: 'PATCH',
                        accessToken,
                        body: JSON.stringify({ isActive: !c.isActive }),
                      }).then(invalidate)
                    }
                  >
                    <Badge tone={c.isActive ? 'success' : 'neutral'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </button>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Source: {c.source ?? '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Projects">
        <div className="mb-3 flex flex-wrap gap-2">
          <Input
            placeholder="New project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="max-w-xs"
          />
          <Button
            size="sm"
            disabled={!projectName || createProject.isPending}
            onClick={() => createProject.mutate()}
          >
            Add
          </Button>
        </div>
        {data.projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">None configured yet.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {data.projects.map((p) => (
              <div
                key={p.id}
                className="rounded-md border border-border bg-surface-raised p-3"
              >
                <div className="font-semibold text-navy">{p.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {p.city ?? 'No city'}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Stages in use">
        {data.stagesInUse.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leads yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.stagesInUse.map((s) => (
              <span
                key={s.stage}
                className="rounded border border-border bg-surface px-2.5 py-1 text-xs"
              >
                {s.stage}: <strong>{s.count}</strong>
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Sources in use">
        {data.sourcesInUse.length === 0 ? (
          <p className="text-sm text-muted-foreground">No source data yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.sourcesInUse.map((s) => (
              <span
                key={s.source}
                className="rounded border border-border bg-surface px-2.5 py-1 text-xs"
              >
                {s.source}: <strong>{s.count}</strong>
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Custom fields">
        <div className="mb-3 flex flex-wrap gap-2">
          <Input
            placeholder="Label"
            value={fieldLabel}
            onChange={(e) => setFieldLabel(e.target.value)}
            className="max-w-[160px]"
          />
          <Input
            placeholder="key (optional)"
            value={fieldKey}
            onChange={(e) => setFieldKey(e.target.value)}
            className="max-w-[160px]"
          />
          <Button
            size="sm"
            disabled={!fieldLabel || createField.isPending}
            onClick={() => createField.mutate()}
          >
            Add field
          </Button>
        </div>
        {data.customFields.length === 0 ? (
          <p className="text-sm text-muted-foreground">None configured yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.customFields.map((f) => (
              <li key={f.id} className="rounded border border-border px-3 py-2">
                {f.label}{' '}
                <span className="text-xs text-muted-foreground">
                  ({f.key} · {f.type}
                  {f.required ? ' · required' : ''})
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Assignment rules">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div>
            <Label>Team</Label>
            <select
              className="mt-1.5 h-9 rounded-md border border-border bg-surface px-2 text-sm"
              value={ruleTeamId}
              onChange={(e) => setRuleTeamId(e.target.value)}
            >
              <option value="">Any / none</option>
              {(data.teams ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            disabled={createRule.isPending}
            onClick={() => createRule.mutate()}
          >
            Add ROUND_ROBIN rule
          </Button>
        </div>
        {data.assignmentRules.length === 0 ? (
          <p className="text-sm text-muted-foreground">None configured yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.assignmentRules.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded border border-border px-3 py-2"
              >
                <span>
                  Priority {r.priority}: {r.strategy}
                  {r.team ? ` → ${r.team.name}` : ''}
                  {r.source ? ` · source ${r.source}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    void apiFetch(
                      `/api/lead-settings/assignment-rules/${r.id}`,
                      {
                        method: 'PATCH',
                        accessToken,
                        body: JSON.stringify({ isActive: !r.isActive }),
                      },
                    ).then(invalidate)
                  }
                >
                  <Badge tone={r.isActive ? 'success' : 'neutral'}>
                    {r.isActive ? 'Active' : 'Off'}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-navy">{title}</h2>
      {children}
    </section>
  );
}
