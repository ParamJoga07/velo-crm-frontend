import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LEAD_PRIORITY_LABELS,
  LEAD_STAGE_LABELS,
  type LeadPriority,
  type LeadStage,
} from '@velo/shared';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, FormSection } from '@/components/ui/form';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import {
  normalizeListEnvelope,
  type ListEnvelope,
} from '@/hooks/useTablePagination';

type UserRow = { id: string; name: string; email: string; role: string };

const PRIORITIES = Object.keys(LEAD_PRIORITY_LABELS) as LeadPriority[];
const STAGES = Object.keys(LEAD_STAGE_LABELS) as LeadStage[];

export function LeadCreatePage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    altPhone: '',
    email: '',
    city: '',
    requirement: '',
    configuration: '',
    remarks: '',
    source: 'Manual',
    priority: 'WARM' as LeadPriority,
    stage: 'INCOMING' as LeadStage,
    assignedToId: '',
  });

  const users = useQuery({
    queryKey: ['users-brief'],
    enabled: role !== 'USER',
    queryFn: async () => {
      const res = await apiFetch<ListEnvelope<UserRow>>(
        '/api/users?limit=100&page=1',
        { accessToken },
      );
      return normalizeListEnvelope(res).data;
    },
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>('/api/leads', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          altPhone: form.altPhone.trim() || null,
          email: form.email.trim() || null,
          city: form.city.trim() || null,
          requirement: form.requirement.trim() || null,
          configuration: form.configuration.trim() || null,
          remarks: form.remarks.trim() || null,
          source: form.source.trim() || 'Manual',
          priority: form.priority,
          stage: form.stage,
          assignedToId: form.assignedToId || null,
        }),
      }),
    onSuccess: (lead) => {
      void qc.invalidateQueries({ queryKey: ['leads'] });
      navigate(`/leads/${lead.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate();
  };

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-xs text-muted-foreground">
        <Link to="/leads" className="hover:text-primary">
          All Leads
        </Link>
        <span className="mx-1.5">›</span>
        <span className="text-navy">New lead</span>
      </div>

      <PageHeader
        title="Create lead"
        description="Capture enquiry details — name and phone are required."
      />

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-lg border border-border bg-surface-raised p-4 shadow-panel"
      >
        <FormSection title="Contact">
          <div>
            <Label>Name *</Label>
            <Input className="mt-1" required value={form.name} onChange={set('name')} />
          </div>
          <div>
            <Label>Phone *</Label>
            <Input className="mt-1" required value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <Label>Alt phone</Label>
            <Input className="mt-1" value={form.altPhone} onChange={set('altPhone')} />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              className="mt-1"
              type="email"
              value={form.email}
              onChange={set('email')}
            />
          </div>
          <div>
            <Label>City</Label>
            <Input className="mt-1" value={form.city} onChange={set('city')} />
          </div>
        </FormSection>

        <FormSection title="Requirement">
          <div>
            <Label>Requirement</Label>
            <Input
              className="mt-1"
              placeholder="e.g. 2BHK for investment"
              value={form.requirement}
              onChange={set('requirement')}
            />
          </div>
          <div>
            <Label>Configuration</Label>
            <Input
              className="mt-1"
              placeholder="e.g. 2BHK / 3BHK"
              value={form.configuration}
              onChange={set('configuration')}
            />
          </div>
          <div>
            <Label>Source</Label>
            <Input className="mt-1" value={form.source} onChange={set('source')} />
          </div>
          <div>
            <Label>Priority</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
              value={form.priority}
              onChange={set('priority')}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {LEAD_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Stage</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
              value={form.stage}
              onChange={set('stage')}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          {role !== 'USER' ? (
            <div>
              <Label>Assign to</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                value={form.assignedToId}
                onChange={set('assignedToId')}
              >
                <option value="">Unassigned</option>
                {(users.data ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="md:col-span-2">
            <Label>Remarks</Label>
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={form.remarks}
              onChange={set('remarks')}
            />
          </div>
        </FormSection>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" asChild>
            <Link to="/leads">Cancel</Link>
          </Button>
          <Button type="submit" disabled={create.isPending || !form.name || !form.phone}>
            {create.isPending ? 'Creating…' : 'Create lead'}
          </Button>
        </div>
      </form>
    </div>
  );
}
