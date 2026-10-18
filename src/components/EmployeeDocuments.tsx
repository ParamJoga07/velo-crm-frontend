import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/data-table';
import { apiFetch } from '@/lib/api';
import { apiForm, downloadWithAuth, openWithAuth } from '@/lib/api-form';
import { useAuthStore } from '@/stores/auth';
import { useConfirm } from '@/lib/confirm';
import { cn } from '@/lib/utils';

type Doc = {
  id: string;
  title: string;
  category: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  owner: { id: string; name: string } | null;
  uploadedBy: { id: string; name: string } | null;
};

type DocRequest = {
  id: string;
  title: string;
  category: string;
  note: string | null;
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED';
  createdAt: string;
  fulfilledAt: string | null;
  requestedBy: { id: string; name: string } | null;
  document: { id: string; title: string } | null;
};

const CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'KYC', label: 'KYC' },
  { value: 'OFFER_LETTER', label: 'Offer letter' },
  { value: 'SALARY_SLIP', label: 'Salary slip' },
  { value: 'EXPERIENCE_LETTER', label: 'Experience letter' },
  { value: 'POLICY', label: 'Policy' },
  { value: 'SALES', label: 'Sales' },
];

const STATUS_STYLE: Record<DocRequest['status'], string> = {
  PENDING: 'border-amber-500/40 bg-amber-500/10 text-amber-700',
  FULFILLED: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700',
  CANCELLED: 'border-border bg-surface-muted text-muted-foreground',
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmployeeDocuments({
  employeeProfileId,
}: {
  employeeProfileId: string;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [file, setFile] = useState<File | null>(null);

  const list = useQuery({
    queryKey: ['documents', employeeProfileId],
    queryFn: () =>
      apiFetch<Doc[]>(
        `/api/documents?employeeProfileId=${encodeURIComponent(employeeProfileId)}`,
        { accessToken },
      ),
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a file');
      const form = new FormData();
      form.append('file', file);
      form.append('title', title.trim() || file.name);
      form.append('category', category);
      form.append('employeeProfileId', employeeProfileId);
      return apiForm('/api/documents/upload', form, accessToken);
    },
    onSuccess: () => {
      setTitle('');
      setFile(null);
      setError(null);
      void qc.invalidateQueries({ queryKey: ['documents', employeeProfileId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await confirm({
      title: 'Upload this document?',
      description: 'It will be stored on this employee profile.',
      confirmLabel: 'Upload',
    });
    if (!ok) return;
    upload.mutate();
  };

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface-raised p-4 shadow-panel">
      <div>
        <h2 className="text-sm font-semibold text-navy">Documents</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          KYC, offer letters and other files for this employee.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <DocumentRequests
        employeeProfileId={employeeProfileId}
        onError={setError}
      />

      <form
        onSubmit={onSubmit}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <Label>Title</Label>
          <Input
            className="mt-1"
            placeholder="Optional display name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <Label>Category</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>File</Label>
          <Input
            className="mt-1"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={upload.isPending || !file}>
            {upload.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </form>

      {list.isLoading ? (
        <TableSkeleton rows={4} />
      ) : (
        <div className="overflow-auto rounded-md border border-border">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-surface-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Uploaded</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {(list.data ?? []).map((d) => (
                <tr key={d.id} className="border-b border-border/70">
                  <td className="px-3 py-2 font-medium text-navy">{d.title}</td>
                  <td className="px-3 py-2">{d.category}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatBytes(d.sizeBytes)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(d.createdAt).toLocaleString()}
                    {d.uploadedBy ? ` · ${d.uploadedBy.name}` : ''}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="text-sm font-medium text-primary hover:underline"
                        onClick={() =>
                          void openWithAuth(
                            `/api/documents/${d.id}/file?inline=1`,
                          ).catch((e: Error) => setError(e.message))
                        }
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="text-sm font-medium text-primary hover:underline"
                        onClick={() =>
                          void downloadWithAuth(
                            `/api/documents/${d.id}/file`,
                            d.title,
                          ).catch((e: Error) => setError(e.message))
                        }
                      >
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!list.data?.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No documents on this profile yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DocumentRequests({
  employeeProfileId,
  onError,
}: {
  employeeProfileId: string;
  onError: (message: string | null) => void;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'SUPERADMIN' || role === 'MANAGER';
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [note, setNote] = useState('');

  const requests = useQuery({
    queryKey: ['document-requests', employeeProfileId],
    queryFn: () =>
      apiFetch<DocRequest[]>(
        `/api/documents/requests?employeeProfileId=${encodeURIComponent(employeeProfileId)}`,
        { accessToken },
      ),
  });

  const refresh = () => {
    void qc.invalidateQueries({
      queryKey: ['document-requests', employeeProfileId],
    });
    void qc.invalidateQueries({ queryKey: ['documents', employeeProfileId] });
  };

  const create = useMutation({
    mutationFn: () =>
      apiFetch('/api/documents/requests', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          employeeProfileId,
          title: title.trim(),
          category,
          note: note.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      setTitle('');
      setNote('');
      onError(null);
      refresh();
    },
    onError: (e: Error) => onError(e.message),
  });

  const fulfill = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return apiForm(`/api/documents/requests/${id}/fulfill`, form, accessToken);
    },
    onSuccess: () => {
      onError(null);
      refresh();
    },
    onError: (e: Error) => onError(e.message),
  });

  const cancel = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/documents/requests/${id}/cancel`, {
        method: 'POST',
        accessToken,
      }),
    onSuccess: () => {
      onError(null);
      refresh();
    },
    onError: (e: Error) => onError(e.message),
  });

  const onRequest = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    create.mutate();
  };

  const onFulfil = async (request: DocRequest, file: File | undefined) => {
    if (!file) return;
    const ok = await confirm({
      title: `Upload "${file.name}"?`,
      description: `This fulfils the request for "${request.title}" and notifies ${request.requestedBy?.name ?? 'the employee'}.`,
      confirmLabel: 'Upload',
    });
    if (!ok) return;
    fulfill.mutate({ id: request.id, file });
  };

  const rows = requests.data ?? [];
  const pending = rows.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-3 rounded-md border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-navy">
            Document requests
            {pending > 0 ? (
              <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                {pending} pending
              </span>
            ) : null}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isAdmin
              ? 'Upload the requested file to fulfil a request. The employee is notified to download it.'
              : 'Ask HR for a document. You will be notified when it is ready to download.'}
          </p>
        </div>
      </div>

      {!isAdmin ? (
        <form
          onSubmit={onRequest}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <Label>Document needed</Label>
            <Input
              className="mt-1"
              placeholder="e.g. Salary slip – Sept 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label>Category</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input
              className="mt-1"
              placeholder="Anything HR should know"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={create.isPending || !title.trim()}>
              {create.isPending ? 'Requesting…' : 'Request document'}
            </Button>
          </div>
        </form>
      ) : null}

      {requests.isLoading ? (
        <TableSkeleton rows={2} />
      ) : rows.length === 0 ? (
        <p className="py-2 text-center text-sm text-muted-foreground">
          No document requests yet.
        </p>
      ) : (
        <ul className="divide-y divide-border/70 rounded-md border border-border">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-navy">{r.title}</span>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      STATUS_STYLE[r.status],
                    )}
                  >
                    {r.status === 'FULFILLED' ? 'Ready' : r.status.toLowerCase()}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {CATEGORIES.find((c) => c.value === r.category)?.label ??
                    r.category}
                  {' · requested '}
                  {new Date(r.createdAt).toLocaleString()}
                  {r.requestedBy ? ` by ${r.requestedBy.name}` : ''}
                </p>
                {r.note ? (
                  <p className="mt-0.5 text-xs text-navy/80">“{r.note}”</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {r.status === 'FULFILLED' && r.document ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void downloadWithAuth(
                        `/api/documents/${r.document!.id}/file`,
                        r.document!.title,
                      ).catch((e: Error) => onError(e.message))
                    }
                  >
                    Download
                  </Button>
                ) : null}
                {r.status === 'PENDING' && isAdmin ? (
                  <label
                    className={cn(
                      'inline-flex h-8 cursor-pointer items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90',
                      fulfill.isPending && 'pointer-events-none opacity-60',
                    )}
                  >
                    {fulfill.isPending && fulfill.variables?.id === r.id
                      ? 'Uploading…'
                      : 'Upload & fulfil'}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        void onFulfil(r, e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                ) : null}
                {r.status === 'PENDING' ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={cancel.isPending}
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Cancel this request?',
                        confirmLabel: 'Cancel request',
                      });
                      if (ok) cancel.mutate(r.id);
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
