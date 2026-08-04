import {
  LEAD_PRIORITY_COLORS,
  LEAD_PRIORITY_LABELS,
  LEAD_STAGE_COLORS,
  LEAD_STAGE_LABELS,
  type LeadPriority,
  type LeadStage,
} from '@velo/shared';
import { cn } from '@/lib/utils';

export function LeadStageBadge({
  stage,
  className,
}: {
  stage: string;
  className?: string;
}) {
  const key = stage as LeadStage;
  const colors = LEAD_STAGE_COLORS[key];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        colors ??
          'border-border bg-muted text-muted-foreground dark:border-[#0e1117]',
        className,
      )}
    >
      {LEAD_STAGE_LABELS[key] ?? stage.replace(/_/g, ' ')}
    </span>
  );
}

export function LeadPriorityBadge({
  priority,
  className,
}: {
  priority: string;
  className?: string;
}) {
  const key = priority as LeadPriority;
  const colors = LEAD_PRIORITY_COLORS[key];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        colors ??
          'border-border bg-muted text-muted-foreground dark:border-[#0e1117]',
        className,
      )}
    >
      {LEAD_PRIORITY_LABELS[key] ?? priority}
    </span>
  );
}
