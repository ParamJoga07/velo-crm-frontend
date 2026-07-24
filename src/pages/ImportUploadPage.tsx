import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LeadFieldMappingTargets } from '@velo/shared';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldHint, FormSection, Label } from '@/components/ui/form';
import { apiFetch } from '@/lib/api';
import { apiForm } from '@/lib/api-form';
import { useAuthStore } from '@/stores/auth';

type SalesUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId: string | null;
  teamIds: string[];
};

type Options = {
  campaigns: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  teams: { id: string; name: string; departmentId: string | null }[];
  projects: { id: string; name: string }[];
  salesUsers: SalesUser[];
};

type Preview = {
  fileName: string;
  headers: string[];
  rows: string[][];
  suggestedMapping: Record<string, string>;
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Name *',
  phone: 'Phone *',
  altPhone: 'Alt Phone',
  email: 'Email',
  source: 'Source',
  budgetMin: 'Budget Min',
  budgetMax: 'Budget Max',
  city: 'City',
  note: 'Note',
};

export function ImportUploadPage() {
  const { type = 'leads' } = useParams();
  const apiType = type.toUpperCase().replace('-', '_');
  const accessToken = useAuthStore((s) => s.accessToken);
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [campaignId, setCampaignId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [salesUserIds, setSalesUserIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [sendDefaultNotification, setSendDefaultNotification] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [allowReEngage, setAllowReEngage] = useState(true);
  const [allowReassignExisting, setAllowReassignExisting] = useState(false);
  const [fileHasHeader, setFileHasHeader] = useState(true);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optionsQuery = useQuery({
    queryKey: ['import-options'],
    queryFn: () => apiFetch<Options>('/api/imports/options', { accessToken }),
  });

  const options = optionsQuery.data as Options | undefined;
  const teams = useMemo(() => {
    const all = options?.teams ?? [];
    if (!departmentId) return all;
    return all.filter((t) => t.departmentId === departmentId);
  }, [options?.teams, departmentId]);

  const teamSalesUsers = useMemo(() => {
    const all = options?.salesUsers ?? [];
    if (!teamId) return [];
    return all.filter(
      (u) => u.teamId === teamId || (u.teamIds ?? []).includes(teamId),
    );
  }, [options?.salesUsers, teamId]);

  const perUserEstimate = useMemo(() => {
    if (!salesUserIds.length || !preview?.rows?.length) return null;
    const n = preview.rows.length;
    const k = salesUserIds.length;
    const base = Math.floor(n / k);
    const rem = n % k;
    return { total: n, each: base, rem, users: k };
  }, [preview?.rows?.length, salesUserIds.length]);

  useEffect(() => {
    if (!teamId) {
      setSalesUserIds([]);
      return;
    }
    const allowed = new Set(teamSalesUsers.map((u) => u.id));
    setSalesUserIds((prev) => prev.filter((id) => allowed.has(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-filter when team changes
  }, [teamId]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const run = async () => {
      setError(null);
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('fileHasHeader', String(fileHasHeader));
        const data = await apiForm<Preview>(
          `/api/imports/${apiType}/preview`,
          form,
          accessToken,
        );
        setPreview(data);
        setMapping(data.suggestedMapping ?? {});
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Preview failed');
        setPreview(null);
      }
    };
    void run();
  }, [file, fileHasHeader, apiType, accessToken]);

  const canStart =
    !!file &&
    !!preview &&
    (apiType !== 'LEADS' ||
      (!!teamId &&
        salesUserIds.length > 0 &&
        Object.values(mapping).includes('name') &&
        Object.values(mapping).includes('phone')));

  function toggleSalesUser(id: string) {
    setSalesUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAllTeamUsers() {
    setSalesUserIds(teamSalesUsers.map((u) => u.id));
  }

  async function onSubmit() {
    if (!file || !canStart) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('campaignId', campaignId);
      form.append('departmentId', departmentId);
      form.append('teamId', teamId);
      form.append('salesUserIds', JSON.stringify(salesUserIds));
      form.append('projectIds', JSON.stringify(projectIds));
      form.append('sendDefaultNotification', String(sendDefaultNotification));
      form.append('notifyEmail', notifyEmail);
      form.append('allowReEngage', String(allowReEngage));
      form.append('allowReassignExisting', String(allowReassignExisting));
      form.append('fileHasHeader', String(fileHasHeader));
      form.append('fieldMapping', JSON.stringify(mapping));
      await apiForm(`/api/imports/${apiType}`, form, accessToken);
      navigate(`/admin/imports/${type}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`New Upload — ${apiType.replace('_', ' ')}`}
        description="Configure the file, pick team assignees, then map columns"
      />
      <Link to={`/admin/imports/${type}`} className="text-xs text-primary hover:underline">
        ← Back to history
      </Link>

      <div className="space-y-6 rounded-md border border-border bg-surface-raised p-5 shadow-crm">
        <FormSection title="Upload + config">
          <div className="md:col-span-2">
            <Label>File</Label>
            <Input
              type="file"
              accept=".xls,.xlsx,.csv"
              className="mt-1.5"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <FieldHint>
              {file ? file.name : 'No file chosen'} — .xls, .xlsx, .csv · max 25 MB
            </FieldHint>
          </div>

          <div>
            <Label>Campaign</Label>
            <select
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-surface-raised px-3 text-sm"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">Select campaign</option>
              {(options?.campaigns ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldHint>
              The selected campaign will be tagged against every lead.
            </FieldHint>
          </div>

          <div>
            <Label>Department</Label>
            <select
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-surface-raised px-3 text-sm"
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setTeamId('');
                setSalesUserIds([]);
              }}
            >
              <option value="">Select department</option>
              {(options?.departments ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Team *</Label>
            <select
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-surface-raised px-3 text-sm"
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setSalesUserIds([]);
              }}
            >
              <option value="">Select team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <FieldHint>Sales names below are members of this team only.</FieldHint>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Sales names * (multi-select)</Label>
              {teamId && teamSalesUsers.length > 0 ? (
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={selectAllTeamUsers}
                  >
                    Select all ({teamSalesUsers.length})
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:underline"
                    onClick={() => setSalesUserIds([])}
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>
            {!teamId ? (
              <p className="mt-1.5 rounded-md border border-border bg-surface px-3 py-4 text-sm text-muted-foreground">
                Select a team first to see its users.
              </p>
            ) : teamSalesUsers.length === 0 ? (
              <p className="mt-1.5 rounded-md border border-border bg-surface px-3 py-4 text-sm text-muted-foreground">
                No active users in this team. Add members under User Management.
              </p>
            ) : (
              <div className="mt-1.5 max-h-44 overflow-auto rounded-md border border-input bg-surface-raised p-2">
                {teamSalesUsers.map((u) => {
                  const checked = salesUserIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-muted"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSalesUser(u.id)}
                      />
                      <span className="font-medium text-navy">{u.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {u.email} · {u.role}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <FieldHint>
              Leads are split equally (round-robin) across selected users.
              {perUserEstimate
                ? ` Preview file ≈ ${perUserEstimate.total} rows → ~${perUserEstimate.each}${
                    perUserEstimate.rem
                      ? `–${perUserEstimate.each + 1}`
                      : ''
                  } each across ${perUserEstimate.users} user(s).`
                : null}
            </FieldHint>
          </div>

          <div>
            <Label>Project</Label>
            <select
              multiple
              className="mt-1.5 h-28 w-full rounded-md border border-input bg-surface-raised px-3 py-2 text-sm"
              value={projectIds}
              onChange={(e) =>
                setProjectIds(
                  Array.from(e.target.selectedOptions).map((o) => o.value),
                )
              }
            >
              {(options?.projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <FieldHint>
              The Project(s) mentioned here will be added into each lead as
              interested project(s).
            </FieldHint>
          </div>

          <div className="md:col-span-2 space-y-3 rounded-md border border-border bg-surface p-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={sendDefaultNotification}
                onChange={(e) => setSendDefaultNotification(e.target.checked)}
              />
              <span>
                <span className="font-medium">Notify assignees (in-app)</span>
                <FieldHint>
                  Each selected sales user gets a notification with how many
                  leads landed in their bucket and when.
                </FieldHint>
              </span>
            </label>
            <div>
              <Label>Email</Label>
              <Input
                className="mt-1.5"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="ops@company.com"
              />
              <FieldHint>
                Bulk uploaded file details will be sent on this email address.
              </FieldHint>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={allowReEngage}
                onChange={(e) => setAllowReEngage(e.target.checked)}
              />
              <span>
                <span className="font-medium">Allow to Re-engage</span>
                <FieldHint>
                  After unticking this box lead&apos;s campaign responses will not
                  be generated, only lead with given details will be updated.
                </FieldHint>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={allowReassignExisting}
                onChange={(e) => setAllowReassignExisting(e.target.checked)}
              />
              <span>
                <span className="font-medium">Allow re-assigning existing leads</span>
                <FieldHint>
                  Checking this box will reassign existing phones to the sales
                  users selected above (round-robin).
                </FieldHint>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={fileHasHeader}
                onChange={(e) => setFileHasHeader(e.target.checked)}
              />
              <span className="font-medium">File contains header</span>
            </label>
          </div>
        </FormSection>

        {preview ? (
          <FormSection
            title="Bulk parsed file"
            description="Choose a target field for each column. Name and phone are required for leads."
          >
            <div className="md:col-span-2 overflow-auto">
              <table className="w-full min-w-[640px] border-collapse text-table">
                <thead>
                  <tr className="border-b border-border bg-surface-muted">
                    {preview.headers.map((h, idx) => (
                      <th key={idx} className="px-2 py-2 text-left align-top">
                        <div className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                          {h}
                        </div>
                        <select
                          className="h-8 w-full rounded border border-input bg-surface-raised px-1 text-xs"
                          value={mapping[String(idx)] ?? ''}
                          onChange={(e) =>
                            setMapping((m) => ({
                              ...m,
                              [String(idx)]: e.target.value,
                            }))
                          }
                        >
                          <option value="">Choose field</option>
                          {LeadFieldMappingTargets.map((f) => (
                            <option key={f} value={f}>
                              {FIELD_LABELS[f] ?? f}
                            </option>
                          ))}
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 8).map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-border/70">
                      {preview.headers.map((_, cIdx) => (
                        <td key={cIdx} className="px-2 py-1.5">
                          {row[cIdx] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormSection>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" asChild>
            <Link to={`/admin/imports/${type}`}>Cancel</Link>
          </Button>
          <Button disabled={!canStart || submitting} onClick={() => void onSubmit()}>
            {submitting ? 'Starting…' : 'Start Import'}
          </Button>
        </div>
      </div>
    </div>
  );
}
