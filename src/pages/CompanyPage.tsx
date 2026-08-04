import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import {
  PLAN_LIST,
  planByCode,
  type PlanCode,
  type SubscriptionPlan,
} from '@velo/shared';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, FormSection } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/data-table';
import { apiFetch } from '@/lib/api';
import { applyTenantBrand } from '@/lib/brand';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

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
  planCode: string;
  seatLimit: number;
  billingStatus: string;
  brandProductName: string | null;
  brandPrimary: string | null;
  brandSecondary: string | null;
  brandAccent: string | null;
  brandSidebar: string | null;
  seatsUsed?: number;
  seatsRemaining?: number;
  plan?: SubscriptionPlan;
};

type Tab = 'profile' | 'branding' | 'subscription';

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function CompanyPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const setTenantPartial = (patch: Record<string, unknown>) => {
    const current = useAuthStore.getState().tenant;
    if (!current) return;
    const next = { ...current, ...patch };
    useAuthStore.setState({ tenant: next });
    applyTenantBrand(next);
  };
  const canEdit = role === 'SUPERADMIN';
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('profile');
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
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
  const [brand, setBrand] = useState({
    brandProductName: '',
    brandPrimary: '#3D5A80',
    brandSecondary: '#1C1F26',
    brandAccent: '#3D5A80',
    brandSidebar: '#F7F8FA',
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
    setBrand({
      brandProductName: c.brandProductName ?? c.name ?? '',
      brandPrimary: c.brandPrimary ?? '#3D5A80',
      brandSecondary: c.brandSecondary ?? '#1C1F26',
      brandAccent: c.brandAccent ?? c.brandPrimary ?? '#3D5A80',
      brandSidebar: c.brandSidebar ?? '#F7F8FA',
    });
  }, [query.data]);

  const saveProfile = useMutation({
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
      setOkMsg('Company profile saved');
      void qc.invalidateQueries({ queryKey: ['company'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const saveBrand = useMutation({
    mutationFn: () =>
      apiFetch<Company>('/api/company/branding', {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({
          brandProductName: brand.brandProductName || null,
          brandPrimary: brand.brandPrimary || null,
          brandSecondary: brand.brandSecondary || null,
          brandAccent: brand.brandAccent || null,
          brandSidebar: brand.brandSidebar || null,
        }),
      }),
    onSuccess: (data) => {
      setError(null);
      setOkMsg('Branding updated — applied across the app');
      setTenantPartial({
        name: data.name,
        brandProductName: data.brandProductName,
        brandPrimary: data.brandPrimary,
        brandSecondary: data.brandSecondary,
        brandAccent: data.brandAccent,
        brandSidebar: data.brandSidebar,
      });
      void qc.invalidateQueries({ queryKey: ['company'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const changePlan = useMutation({
    mutationFn: (planCode: PlanCode) =>
      apiFetch<Company>('/api/company/subscription', {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({ planCode }),
      }),
    onSuccess: (data) => {
      setError(null);
      setOkMsg(`Switched to ${data.plan?.name ?? data.planCode}`);
      setTenantPartial({
        planCode: data.planCode,
        seatLimit: data.seatLimit,
        seatsUsed: data.seatsUsed,
        leadLimit: data.leadLimit,
        leadBalance: data.leadBalance,
      });
      void qc.invalidateQueries({ queryKey: ['company'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const onProfile = (e: FormEvent) => {
    e.preventDefault();
    saveProfile.mutate();
  };

  const onBrand = (e: FormEvent) => {
    e.preventDefault();
    saveBrand.mutate();
  };

  const company = query.data;
  const currentPlan = planByCode(company?.planCode);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Company settings"
        description="Profile, subscription seats, and white-label branding"
      />

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {okMsg ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
          {okMsg}
          <button
            type="button"
            className="ml-3 text-xs underline"
            onClick={() => setOkMsg(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-border pb-px">
        {(
          [
            ['profile', 'Profile'],
            ['subscription', 'Subscription'],
            ['branding', 'Branding'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setError(null);
              setOkMsg(null);
            }}
            className={cn(
              'rounded-t-md px-3 py-2 text-sm font-medium',
              tab === id
                ? 'bg-surface-raised text-navy shadow-panel'
                : 'text-muted-foreground hover:text-navy',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <TableSkeleton rows={6} />
      ) : tab === 'profile' ? (
        <form
          onSubmit={onProfile}
          className="space-y-6 rounded-lg border border-border bg-surface-raised p-4 shadow-panel"
        >
          <FormSection title="Company identity">
            <div>
              <Label>Legal / company name</Label>
              <Input
                className="mt-1"
                disabled={!canEdit}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                className="mt-1"
                disabled={!canEdit}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                className="mt-1"
                disabled={!canEdit}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Website</Label>
              <Input
                className="mt-1"
                disabled={!canEdit}
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
                disabled={!canEdit}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                onChange={(e) => setForm({ ...form, pan: e.target.value })}
              />
            </div>
            <div>
              <Label>GST</Label>
              <Input
                className="mt-1"
                disabled={!canEdit}
                value={form.gst}
                onChange={(e) => setForm({ ...form, gst: e.target.value })}
              />
            </div>
            <div>
              <Label>RERA</Label>
              <Input
                className="mt-1"
                disabled={!canEdit}
                value={form.rera}
                onChange={(e) => setForm({ ...form, rera: e.target.value })}
              />
            </div>
          </FormSection>
          {canEdit ? (
            <div className="flex justify-end">
              <Button type="submit" disabled={saveProfile.isPending}>
                {saveProfile.isPending ? 'Saving…' : 'Save profile'}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Only SUPERADMIN can edit company settings.
            </p>
          )}
        </form>
      ) : tab === 'subscription' ? (
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-surface-raised p-4 shadow-panel">
            <h2 className="text-sm font-semibold text-navy">Current plan</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {currentPlan.name} · {company?.billingStatus ?? 'active'} ·{' '}
              {company?.seatsUsed ?? 0}/{company?.seatLimit ?? currentPlan.seatLimit}{' '}
              seats used · lead quota{' '}
              {(company?.leadLimit ?? currentPlan.leadLimit).toLocaleString()}
            </p>
          </section>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {PLAN_LIST.map((plan) => {
              const active = plan.code === company?.planCode;
              return (
                <article
                  key={plan.code}
                  className={cn(
                    'flex flex-col rounded-lg border p-4 shadow-panel',
                    active
                      ? 'border-primary bg-primary-muted/40'
                      : 'border-border bg-surface-raised',
                  )}
                >
                  <h3 className="text-base font-semibold text-navy">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.tagline}
                  </p>
                  <p className="mt-3 font-mono text-lg font-semibold text-navy">
                    {formatInr(plan.priceInrMonthly)}
                    <span className="text-xs font-normal text-muted-foreground">
                      /mo
                    </span>
                  </p>
                  <ul className="mt-3 flex-1 space-y-1.5 text-xs text-muted-foreground">
                    {plan.features.map((f) => (
                      <li key={f}>· {f}</li>
                    ))}
                  </ul>
                  {canEdit ? (
                    <Button
                      className="mt-4 w-full"
                      size="sm"
                      variant={active ? 'secondary' : 'default'}
                      disabled={active || changePlan.isPending}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Switch to ${plan.name} (${plan.seatLimit} seats)? Payment gateway can be wired later — this updates limits now.`,
                          )
                        ) {
                          return;
                        }
                        changePlan.mutate(plan.code);
                      }}
                    >
                      {active ? 'Current plan' : 'Select plan'}
                    </Button>
                  ) : null}
                </article>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Seat limits are enforced when adding users. Payment collection
            (Razorpay/Stripe) can plug into the same plan codes later.
          </p>
        </div>
      ) : (
        <form
          onSubmit={onBrand}
          className="space-y-6 rounded-lg border border-border bg-surface-raised p-4 shadow-panel"
        >
          <p className="text-sm text-muted-foreground">
            Customize how the CRM looks for your company — product name and
            brand colors apply instantly for all users in this tenant.
          </p>
          <FormSection title="White-label">
            <div className="md:col-span-2">
              <Label>App / product name</Label>
              <Input
                className="mt-1"
                disabled={!canEdit}
                placeholder="e.g. Acme Realty CRM"
                value={brand.brandProductName}
                onChange={(e) =>
                  setBrand({ ...brand, brandProductName: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Primary color</Label>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  disabled={!canEdit}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-surface"
                  value={brand.brandPrimary}
                  onChange={(e) =>
                    setBrand({ ...brand, brandPrimary: e.target.value })
                  }
                />
                <Input
                  disabled={!canEdit}
                  value={brand.brandPrimary}
                  onChange={(e) =>
                    setBrand({ ...brand, brandPrimary: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Accent color</Label>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  disabled={!canEdit}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-surface"
                  value={brand.brandAccent}
                  onChange={(e) =>
                    setBrand({ ...brand, brandAccent: e.target.value })
                  }
                />
                <Input
                  disabled={!canEdit}
                  value={brand.brandAccent}
                  onChange={(e) =>
                    setBrand({ ...brand, brandAccent: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Secondary / rail color</Label>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  disabled={!canEdit}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-surface"
                  value={brand.brandSecondary}
                  onChange={(e) =>
                    setBrand({ ...brand, brandSecondary: e.target.value })
                  }
                />
                <Input
                  disabled={!canEdit}
                  value={brand.brandSecondary}
                  onChange={(e) =>
                    setBrand({ ...brand, brandSecondary: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Sidebar background</Label>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  disabled={!canEdit}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-surface"
                  value={brand.brandSidebar}
                  onChange={(e) =>
                    setBrand({ ...brand, brandSidebar: e.target.value })
                  }
                />
                <Input
                  disabled={!canEdit}
                  value={brand.brandSidebar}
                  onChange={(e) =>
                    setBrand({ ...brand, brandSidebar: e.target.value })
                  }
                />
              </div>
            </div>
          </FormSection>

          <div
            className="rounded-lg border border-border p-4"
            style={{
              background: brand.brandSidebar,
              borderColor: brand.brandPrimary,
            }}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: brand.brandSecondary }}
            >
              {brand.brandProductName || 'Preview'}
            </p>
            <button
              type="button"
              className="mt-3 rounded-md px-3 py-1.5 text-xs font-semibold text-white"
              style={{ background: brand.brandPrimary }}
            >
              Primary button
            </button>
          </div>

          {canEdit ? (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  applyTenantBrand({
                    id: company?.id ?? '',
                    name: company?.name ?? '',
                    timezone: company?.timezone ?? 'Asia/Kolkata',
                    leadBalance: company?.leadBalance ?? 0,
                    brandProductName: brand.brandProductName,
                    brandPrimary: brand.brandPrimary,
                    brandSecondary: brand.brandSecondary,
                    brandAccent: brand.brandAccent,
                    brandSidebar: brand.brandSidebar,
                  });
                }}
              >
                Preview
              </Button>
              <Button type="submit" disabled={saveBrand.isPending}>
                {saveBrand.isPending ? 'Saving…' : 'Save branding'}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Only SUPERADMIN can change branding.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
