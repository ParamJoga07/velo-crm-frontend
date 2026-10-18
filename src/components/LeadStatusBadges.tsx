import {
  LEAD_PRIORITY_COLORS,
  LEAD_PRIORITY_LABELS,
  LEAD_STAGE_COLORS,
  LEAD_STAGE_LABELS,
  type LeadPriority,
  type LeadStage,
} from '@velo/shared';
import { PRIORITY_PAINT, STAGE_PAINT } from '@/lib/lead-visuals';
import { cn } from '@/lib/utils';

export function LeadStageBadge({
  stage,
  emphasis,
  className,
}: {
  stage: string;
  /** Larger and haloed — for the one place a lead's stage is the headline. */
  emphasis?: boolean;
  className?: string;
}) {
  const key = stage as LeadStage;
  const colors = LEAD_STAGE_COLORS[key];
  const paint = STAGE_PAINT[key];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-semibold uppercase tracking-wide',
        emphasis
          ? 'px-2.5 py-1 text-[11px]'
          : 'px-2 py-0.5 text-[10px]',
        colors ??
          'border-border bg-muted text-muted-foreground dark:border-[#0e1117]',
        emphasis && paint ? paint.glow : null,
        className,
      )}
    >
      {LEAD_STAGE_LABELS[key] ?? stage.replace(/_/g, ' ')}
    </span>
  );
}

export function LeadPriorityBadge({
  priority,
  emphasis,
  className,
}: {
  priority: string;
  /** Filled, haloed and icon-led, matching the prospect rating picker. */
  emphasis?: boolean;
  className?: string;
}) {
  const key = priority as LeadPriority;
  const paint = PRIORITY_PAINT[key];

  if (emphasis && paint) {
    const Icon = paint.icon;
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide',
          paint.selected,
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {LEAD_PRIORITY_LABELS[key] ?? priority}
      </span>
    );
  }

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
