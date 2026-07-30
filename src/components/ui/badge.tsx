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
      'border border-[#0e1117] bg-muted text-muted-foreground dark:border-[#0e1117] dark:bg-[#1a1e27] dark:text-slate-300',
    success:
      'border border-[#0e1117] bg-success/15 text-success dark:border-[#0e1117] dark:bg-[#1a2a22] dark:text-emerald-300',
    warning:
      'border border-[#0e1117] bg-warning/15 text-warning dark:border-[#0e1117] dark:bg-[#2a2418] dark:text-amber-300',
    danger:
      'border border-[#0e1117] bg-danger/15 text-danger dark:border-[#0e1117] dark:bg-[#2a1c1c] dark:text-rose-300',
    accent:
      'border border-[#0e1117] bg-primary-muted text-primary dark:border-[#0e1117] dark:bg-[#1e2430] dark:text-sky-300',
    new: 'border border-[#0e1117] bg-primary-muted text-primary-dark dark:border-[#0e1117] dark:bg-[#1e2430] dark:text-sky-300',
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
