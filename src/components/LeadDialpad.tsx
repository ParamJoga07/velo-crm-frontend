import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Delete, Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { apiFetch } from '@/lib/api';
import { telHref } from '@/components/LeadPhoneLink';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

const SOURCES = [
  'Dialpad',
  'Reference',
  'Walk-in',
  'Cold call',
  'Social media',
  'Website',
  'Other',
];

type CreatedLead = {
  lead: { id: string; leadNo: number; name: string; phone: string };
  created: boolean;
};

/**
 * Dial a number that is not in the workspace yet. The number is captured first,
 * then the name and source, and only once the lead exists does the dialpad
 * open — so every call placed this way leaves a lead behind it.
 */
export function LeadDialpad({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (result: CreatedLead) => void;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [step, setStep] = useState<'number' | 'details'>('number');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [source, setSource] = useState(SOURCES[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) return;
    // Reset once the sheet is closed so the next call starts clean.
    setStep('number');
    setPhone('');
    setName('');
    setSource(SOURCES[0]);
    setError(null);
  }, [open]);

  const createLead = useMutation({
    mutationFn: () =>
      apiFetch<CreatedLead>('/api/leads/dialpad', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ phone, name: name.trim(), source }),
      }),
    onSuccess: (result) => {
      onCreated?.(result);
      // The lead (and its dial record) exist — hand the number to the dialer.
      window.location.href = telHref(result.lead.phone);
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  // Keyboard entry works alongside the on-screen keys.
  useEffect(() => {
    if (!open || step !== 'number') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') setPhone((p) => p.slice(0, -1));
      else if (e.key === 'Enter' && phone.length >= 7) setStep('details');
      else if (/^[0-9*#+]$/.test(e.key)) setPhone((p) => p + e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step, phone]);

  if (!open) return null;

  const digits = phone.replace(/\D/g, '').length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-t-2xl border border-border bg-surface-raised p-4 shadow-crm sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-navy">
            <Phone className="h-4 w-4 text-primary" />
            {step === 'number' ? 'Dialpad' : 'Who are you calling?'}
          </h2>
          <button
            type="button"
            aria-label="Close dialpad"
            className="text-muted-foreground hover:text-navy"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error ? (
          <div className="mb-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {step === 'number' ? (
          <>
            <div className="mb-3 flex min-h-[52px] items-center justify-center rounded-xl border border-border bg-surface px-3 py-2">
              <span
                className={cn(
                  'font-mono text-2xl tracking-wider',
                  phone ? 'text-navy' : 'text-muted-foreground',
                )}
              >
                {phone || 'Enter number'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPhone((p) => p + key)}
                  className="h-14 rounded-xl border border-border bg-surface font-mono text-xl font-semibold text-navy transition-colors hover:bg-surface-muted active:scale-95"
                >
                  {key}
                </button>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPhone((p) => (p.startsWith('+') ? p : `+${p}`))}
                className="h-11 rounded-xl border border-border bg-surface font-mono text-lg font-semibold text-navy hover:bg-surface-muted"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setPhone('')}
                className="h-11 rounded-xl border border-border bg-surface text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-surface-muted"
              >
                Clear
              </button>
              <button
                type="button"
                aria-label="Backspace"
                onClick={() => setPhone((p) => p.slice(0, -1))}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface text-navy hover:bg-surface-muted"
              >
                <Delete className="h-4 w-4" />
              </button>
            </div>

            <Button
              className="mt-3 w-full"
              disabled={digits < 7}
              onClick={() => {
                setError(null);
                setStep('details');
              }}
            >
              Submit
            </Button>
            {digits > 0 && digits < 7 ? (
              <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                Enter at least 7 digits.
              </p>
            ) : null}
          </>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              createLead.mutate();
            }}
          >
            <div className="rounded-xl border border-border bg-surface px-3 py-2 text-center">
              <span className="font-mono text-lg font-semibold text-navy">
                {phone}
              </span>
            </div>

            <div>
              <Label>Name</Label>
              <Input
                autoFocus
                className="mt-1"
                placeholder="Lead name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <Label>Source</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Saved to your personal leads and assigned to you, then the dialpad
              opens.
            </p>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setStep('number')}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!name.trim() || createLead.isPending}
              >
                <Phone className="mr-1.5 h-3.5 w-3.5" />
                {createLead.isPending ? 'Saving…' : 'Save & call'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
