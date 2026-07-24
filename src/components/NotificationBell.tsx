import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  meta: { count?: number; assignedAt?: string; fileName?: string } | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ['notifications'],
    enabled: !!accessToken,
    refetchInterval: 30_000,
    queryFn: () =>
      apiFetch<{ items: NotificationRow[]; unread: number }>(
        '/api/notifications?limit=20',
        { accessToken },
      ),
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const unread = query.data?.unread ?? 0;
  const rows = query.data?.items ?? [];

  const markAll = useMutation({
    mutationFn: () =>
      apiFetch('/api/notifications/read-all', {
        method: 'POST',
        accessToken,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOne = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        accessToken,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        title="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-md border border-border bg-surface-raised shadow-crm">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-semibold text-navy">Notifications</span>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => markAll.mutate()}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-auto">
            {rows.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No notifications yet
              </p>
            ) : (
              rows.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={cn(
                    'block w-full border-b border-border/70 px-3 py-2.5 text-left hover:bg-surface-muted',
                    !n.readAt && 'bg-primary-muted/40',
                  )}
                  onClick={() => {
                    if (!n.readAt) markOne.mutate(n.id);
                  }}
                >
                  <div className="text-sm font-medium text-navy">{n.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {n.body}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-border px-3 py-2">
            <Link
              to="/leads"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View my leads →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
