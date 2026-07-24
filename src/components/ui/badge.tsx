import { cn } from '@/lib/utils';

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent' | 'new';
  className?: string;
}) {
  const tones = {
    neutral:
      'border border-border bg-muted text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
    success:
      'border border-success/20 bg-success/15 text-success dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-300',
    warning:
      'border border-warning/20 bg-warning/15 text-warning dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-300',
    danger:
      'border border-danger/20 bg-danger/15 text-danger dark:border-rose-400/20 dark:bg-rose-500/15 dark:text-rose-300',
    accent:
      'border border-primary/20 bg-primary-muted text-primary dark:border-sky-400/20 dark:bg-sky-500/15 dark:text-sky-300',
    new: 'border border-primary/20 bg-primary-muted text-primary-dark dark:border-sky-400/20 dark:bg-sky-500/15 dark:text-sky-300',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
