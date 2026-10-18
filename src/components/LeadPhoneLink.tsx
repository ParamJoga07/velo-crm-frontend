import { useQueryClient } from '@tanstack/react-query';
import { Phone } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

/** Digits (and a leading +) only — what a tel: handler expects. */
export function telHref(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `tel:${cleaned.startsWith('+') ? '+' : ''}${cleaned.replace(/\+/g, '')}`;
}

/**
 * Lead phone number rendered as a dialpad link. Every tap is logged against the
 * lead as a CALL_INITIATED activity before the dialer takes over, so the number
 * that was dialled is always captured even if the call never connects.
 */
export function LeadPhoneLink({
  leadId,
  phone,
  field = 'phone',
  className,
  showIcon = false,
}: {
  leadId: string;
  phone: string | null | undefined;
  field?: 'phone' | 'altPhone';
  className?: string;
  showIcon?: boolean;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  if (!phone) return <span className={className}>—</span>;

  return (
    <a
      href={telHref(phone)}
      title={`Call ${phone}`}
      className={cn(
        'inline-flex items-center gap-1 text-primary hover:underline',
        className,
      )}
      onClick={(e) => {
        // Let the browser hand the number to the dialpad; only the logging is
        // ours, and it must not block or cancel that navigation.
        e.stopPropagation();
        void apiFetch(`/api/leads/${leadId}/dial`, {
          method: 'POST',
          accessToken,
          body: JSON.stringify({ phone, field, source: 'web' }),
        })
          .then(() => {
            void qc.invalidateQueries({ queryKey: ['lead', leadId] });
            void qc.invalidateQueries({ queryKey: ['leads'] });
          })
          .catch(() => undefined);
      }}
    >
      {showIcon ? <Phone className="h-3.5 w-3.5" /> : null}
      {phone}
    </a>
  );
}
