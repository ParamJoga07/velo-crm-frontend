import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, FormSection } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/data-table';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

type Company = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  pan: string | null;
  gst: string | null;
  rera: string | null;
  logoS3Key: string | null;
  leadLimit?: number;
  leadBalance?: number;
};

export function CompanyPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'SUPERADMIN';
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    pan: '',
    gst: '',
    rera: '',
  });

  const query = useQuery({
    queryKey: ['company'],
    queryFn: () => apiFetch<Company>('/api/company', { accessToken }),
  });

  useEffect(() => {
    const c = query.data;
    if (!c) return;
    setForm({
      name: c.name ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      website: c.website ?? '',
      address: c.address ?? '',
      pan: c.pan ?? '',
      gst: c.gst ?? '',
      rera: c.rera ?? '',
    });
  }, [query.data]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch('/api/company', {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || null,
          email: form.email || null,
          website: form.website || null,
          address: form.address || null,
          pan: form.pan || null,
          gst: form.gst || null,
          rera: form.rera || null,
        }),
      }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['company'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    save.mutate();
  };

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Company profile" description="Loading…" />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title="Company profile"
        description={
          query.data
            ? `${query.data.name} · ${query.data.timezone}`
            : 'Organisation details'
        }
      />

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {!canEdit ? (
        <p className="text-sm text-muted-foreground">
          View only — only Superadmin can edit company details.
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-lg border border-border bg-surface-raised p-4 shadow-panel"
      >
        <FormSection title="Organisation">
          <div>
            <Label>Company name</Label>
            <Input
              className="mt-1"
              disabled={!canEdit}
              value={form.name}
              onChange={set('name')}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              className="mt-1"
              disabled={!canEdit}
              value={form.phone}
              onChange={set('phone')}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              className="mt-1"
              type="email"
              disabled={!canEdit}
              value={form.email}
              onChange={set('email')}
            />
          </div>
          <div>
            <Label>Website</Label>
            <Input
              className="mt-1"
              disabled={!canEdit}
              value={form.website}
              onChange={set('website')}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Address</Label>
            <textarea
              className="mt-1 min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
              disabled={!canEdit}
              value={form.address}
              onChange={set('address')}
            />
          </div>
        </FormSection>

        <FormSection title="Compliance">
          <div>
            <Label>PAN</Label>
            <Input
              className="mt-1"
              disabled={!canEdit}
              value={form.pan}
              onChange={set('pan')}
            />
          </div>
          <div>
            <Label>GST</Label>
            <Input
              className="mt-1"
              disabled={!canEdit}
              value={form.gst}
              onChange={set('gst')}
            />
          </div>
          <div>
            <Label>RERA</Label>
            <Input
              className="mt-1"
              disabled={!canEdit}
              value={form.rera}
              onChange={set('rera')}
            />
          </div>
        </FormSection>

        {canEdit ? (
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save company'}
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
