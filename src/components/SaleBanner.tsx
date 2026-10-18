import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

type Notice = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  meta: { until?: string } | null;
};

export function SaleBanner() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState<string | null>(
    () => sessionStorage.getItem('velo-sale-dismiss') ,
  );

  const query = useQuery({
    queryKey: ['notifications', 'sale-banner'],
    enabled: !!accessToken,
    refetchInterval: 60_000,
    queryFn: () =>
      apiFetch<{ items: Notice[] }>('/api/notifications?limit=20', {
        accessToken,
      }),
  });

  const sale = useMemo(() => {
    const now = Date.now();
    return (query.data?.items ?? []).find((n) => {
      if (n.type !== 'SALE_RECORDED') return false;
      const until = n.meta?.until ? Date.parse(n.meta.until) : Date.parse(n.createdAt) + 86400000;
      return until > now;
    });
  }, [query.data]);

  const mark = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        accessToken,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (!sale || dismissed === sale.id) return null;

  return (
    <div className="flex items-center justify-between gap-3 overflow-hidden bg-emerald-600 px-4 py-2 text-sm text-white">
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="sale-marquee font-medium">
          {sale.title}: {sale.body}
          <span className="px-8">{sale.title}: {sale.body}</span>
        </p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded p-1 hover:bg-white/15"
        aria-label="Dismiss sale announcement"
        onClick={() => {
          sessionStorage.setItem('velo-sale-dismiss', sale.id);
          setDismissed(sale.id);
          mark.mutate(sale.id);
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
