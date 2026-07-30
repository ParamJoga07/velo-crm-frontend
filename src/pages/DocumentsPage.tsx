import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/data-table';
import { apiFetch } from '@/lib/api';
import { apiForm } from '@/lib/api-form';
import { useAuthStore } from '@/stores/auth';

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

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [file, setFile] = useState<File | null>(null);

  const list = useQuery({
    queryKey: ['documents'],
    queryFn: () => apiFetch<Doc[]>('/api/documents', { accessToken }),
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a file');
      const form = new FormData();
      form.append('file', file);
      form.append('title', title.trim() || file.name);
      form.append('category', category);
      return apiForm('/api/documents/upload', form, accessToken);
    },
    onSuccess: () => {
      setTitle('');
      setFile(null);
      setError(null);
      void qc.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    upload.mutate();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Documents"
        description="Upload and manage employee / company files"
      />

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-panel sm:grid-cols-2 lg:grid-cols-4"
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
            <option value="GENERAL">General</option>
            <option value="KYC">KYC</option>
            <option value="OFFER_LETTER">Offer letter</option>
            <option value="POLICY">Policy</option>
            <option value="SALES">Sales</option>
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
        <TableSkeleton rows={6} />
      ) : (
        <div className="overflow-auto rounded-lg border border-border bg-surface-raised shadow-panel">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-surface-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Uploaded</th>
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
                  <td className="px-3 py-2">{d.owner?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(d.createdAt).toLocaleString()}
                    {d.uploadedBy ? ` · ${d.uploadedBy.name}` : ''}
                  </td>
                </tr>
              ))}
              {!list.data?.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No documents uploaded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
