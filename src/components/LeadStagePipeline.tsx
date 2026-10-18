import { Check } from 'lucide-react';
import {
  DNP_STAGES,
  LEAD_PRIORITY_LABELS,
  LEAD_STAGE_LABELS,
  LOST_REASONS,
  type LeadPriority,
  type LeadStage,
} from '@velo/shared';
import { PRIORITY_PAINT, STAGE_PAINT } from '@/lib/lead-visuals';
import { cn } from '@/lib/utils';

const MAIN: { key: LeadStage; label: string }[] = [
  { key: 'INCOMING', label: 'Incoming' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'PROSPECT', label: 'Prospect' },
  { key: 'WON', label: 'Closed' },
];

function mainIndex(stage: string) {
  if (DNP_STAGES.includes(stage as (typeof DNP_STAGES)[number])) return 1;
  if (stage === 'WON' || stage === 'LOST') return 3;
  const at = MAIN.findIndex((m) => m.key === stage);
  return at < 0 ? 0 : at;
}

const PRIORITIES = Object.keys(LEAD_PRIORITY_LABELS) as LeadPriority[];

/**
 * Incoming => Contacted => Prospect => Closed, with DNP only under Contacted,
 * Cold/Warm/Hot under Prospect, and Won/Lost + lost reasons under Closed.
 */
export function LeadStagePipeline({
  value,
  onChange,
  priority,
  onPriorityChange,
  lostReason,
  onLostReasonChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (stage: LeadStage) => void;
  priority?: string;
  onPriorityChange?: (priority: LeadPriority) => void;
  lostReason?: string;
  onLostReasonChange?: (reason: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const active = mainIndex(value);
  const dealStage = value === 'LOST' ? 'LOST' : value === 'WON' ? 'WON' : null;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex min-w-[560px] gap-1.5 sm:min-w-0">
        {MAIN.map((item, index) => {
          const paintKey: LeadStage =
            item.key === 'WON' && dealStage === 'LOST' ? 'LOST' : item.key;
          const paint = STAGE_PAINT[paintKey];
          const isActive = index === active;
          const isDone = active >= 0 && index < active;
          return (
            <button
              key={item.key}
              type="button"
              disabled={disabled}
              aria-current={isActive ? 'step' : undefined}
              onClick={() =>
                onChange(
                  item.key === 'WON'
                    ? dealStage === 'LOST'
                      ? 'LOST'
                      : 'WON'
                    : item.key,
                )
              }
              className="group flex flex-1 flex-col items-stretch gap-1.5 text-left outline-none disabled:cursor-not-allowed"
            >
              <span
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  isActive
                    ? cn(paint.rail, paint.glow)
                    : isDone
                      ? paint.railDone
                      : 'bg-border group-hover:bg-muted-foreground/40',
                )}
              />
              <span
                className={cn(
                  'inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-all duration-200',
                  isActive
                    ? cn(paint.chip, paint.glow, 'scale-[1.03]')
                    : isDone
                      ? cn('border-transparent bg-transparent', paint.doneText)
                      : 'border-transparent bg-transparent text-muted-foreground group-hover:bg-surface-muted group-hover:text-navy',
                )}
              >
                {isDone ? <Check className="h-3 w-3 shrink-0" /> : null}
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div />

        {active === 1 ? (
          <div className="rounded-md border border-border/70 bg-surface-muted/40 p-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              DNP 1 – DNP 2 – DNP 3
            </p>
            <div className="flex flex-wrap gap-1">
              {DNP_STAGES.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(stage)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-[10px] font-semibold',
                    value === stage
                      ? STAGE_PAINT[stage].chip
                      : 'border-border text-muted-foreground hover:bg-surface',
                  )}
                >
                  {LEAD_STAGE_LABELS[stage]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div />
        )}

        {active === 2 ? (
          <div className="rounded-md border border-border/70 bg-surface-muted/40 p-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Cold – Warm – Hot
            </p>
            <ProspectRatingPicker
              value={priority ?? 'WARM'}
              onChange={(p) => {
                if (value !== 'PROSPECT') onChange('PROSPECT');
                onPriorityChange?.(p);
              }}
              disabled={disabled}
            />
          </div>
        ) : (
          <div />
        )}

        {active === 3 ? (
          <div className="rounded-md border border-border/70 bg-surface-muted/40 p-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Won – Lost
            </p>
            <div className="flex flex-wrap gap-1">
              {(['WON', 'LOST'] as const).map((stage) => (
                <button
                  key={stage}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(stage)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-[10px] font-semibold',
                    value === stage
                      ? STAGE_PAINT[stage].chip
                      : 'border-border text-muted-foreground hover:bg-surface',
                  )}
                >
                  {LEAD_STAGE_LABELS[stage]}
                </button>
              ))}
            </div>
            {value === 'LOST' ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {LOST_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    disabled={disabled}
                    onClick={() => onLostReasonChange?.(reason)}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px]',
                      lostReason === reason
                        ? 'border-slate-500 bg-slate-500/20 font-semibold text-navy'
                        : 'border-border text-muted-foreground hover:bg-surface',
                    )}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Hot / Warm / Cold picker for prospects. The chosen rating is filled, haloed
 * and slightly raised so it reads at a glance from across the screen.
 */
export function ProspectRatingPicker({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (priority: LeadPriority) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {PRIORITIES.map((priority) => {
        const paint = PRIORITY_PAINT[priority];
        const Icon = paint.icon;
        const selected = value === priority;
        return (
          <button
            key={priority}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(priority)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              selected
                ? cn(paint.selected, 'scale-105')
                : cn(paint.idle, 'bg-transparent'),
            )}
          >
            <Icon className="h-3 w-3 shrink-0" />
            {LEAD_PRIORITY_LABELS[priority]}
          </button>
        );
      })}
    </div>
  );
}
