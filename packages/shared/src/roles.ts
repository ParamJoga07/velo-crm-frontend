import { z } from 'zod';

export const RoleSchema = z.enum(['SUPERADMIN', 'MANAGER', 'USER']);
export type Role = z.infer<typeof RoleSchema>;

export const LeadStageSchema = z.enum([
  'INCOMING',
  'PROSPECT',
  'OPPORTUNITY',
  'UNQUALIFIED',
  'BOOKED',
  'LOST',
]);
export type LeadStage = z.infer<typeof LeadStageSchema>;

export const LeadPrioritySchema = z.enum(['HOT', 'WARM', 'COLD']);
export type LeadPriority = z.infer<typeof LeadPrioritySchema>;

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  INCOMING: 'Incoming',
  PROSPECT: 'Prospect',
  OPPORTUNITY: 'Opportunity',
  UNQUALIFIED: 'Unqualified',
  BOOKED: 'Booked',
  LOST: 'Lost',
};

/** Distinct list colors for each lead stage */
export const LEAD_STAGE_COLORS: Record<LeadStage, string> = {
  INCOMING:
    'border-sky-600/40 bg-sky-500/15 text-sky-800 dark:border-sky-400/30 dark:bg-sky-500/20 dark:text-sky-200',
  PROSPECT:
    'border-violet-600/40 bg-violet-500/15 text-violet-800 dark:border-violet-400/30 dark:bg-violet-500/20 dark:text-violet-200',
  OPPORTUNITY:
    'border-amber-600/40 bg-amber-500/15 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/20 dark:text-amber-200',
  UNQUALIFIED:
    'border-slate-500/40 bg-slate-500/15 text-slate-700 dark:border-slate-400/30 dark:bg-slate-500/20 dark:text-slate-200',
  BOOKED:
    'border-emerald-600/40 bg-emerald-500/15 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/20 dark:text-emerald-200',
  LOST:
    'border-rose-600/40 bg-rose-500/15 text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/20 dark:text-rose-200',
};

export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  HOT: 'Hot',
  WARM: 'Warm',
  COLD: 'Cold',
};

/** Distinct list colors for Hot / Warm / Cold */
export const LEAD_PRIORITY_COLORS: Record<LeadPriority, string> = {
  HOT: 'border-rose-600/40 bg-rose-500/15 text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/20 dark:text-rose-200',
  WARM: 'border-orange-600/40 bg-orange-500/15 text-orange-900 dark:border-orange-400/30 dark:bg-orange-500/20 dark:text-orange-200',
  COLD: 'border-cyan-600/40 bg-cyan-500/15 text-cyan-800 dark:border-cyan-400/30 dark:bg-cyan-500/20 dark:text-cyan-200',
};

export const ACTIVITY_TYPES = [
  'NOTE',
  'CALL',
  'WHATSAPP',
  'MEETING',
  'GOOGLE_MEET',
  'EMAIL',
  'SITE_VISIT',
  'REMINDER',
  'STAGE_CHANGE',
  'FOLLOWUP_SCHEDULED',
  'TASK_COMPLETED',
  'LEAD_OPENED',
  'VIEW_NO_ACTION',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const CreateLeadSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(7).max(20),
  altPhone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  requirement: z.string().max(500).optional().nullable(),
  configuration: z.string().max(120).optional().nullable(),
  remarks: z.string().max(2000).optional().nullable(),
  source: z.string().min(1).max(120).default('Manual'),
  priority: LeadPrioritySchema.optional().default('WARM'),
  stage: LeadStageSchema.optional().default('INCOMING'),
  budgetMin: z.number().int().optional().nullable(),
  budgetMax: z.number().int().optional().nullable(),
  campaignId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
});
export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

export const LogActivitySchema = z.object({
  type: z.enum([
    'NOTE',
    'CALL',
    'WHATSAPP',
    'MEETING',
    'GOOGLE_MEET',
    'EMAIL',
    'SITE_VISIT',
    'REMINDER',
  ]),
  notes: z.string().max(4000).optional().nullable(),
  outcome: z.string().max(200).optional().nullable(),
  durationSec: z.number().int().min(0).optional().nullable(),
});
export type LogActivityInput = z.infer<typeof LogActivitySchema>;

export const WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export type WeekAvailability = Record<WeekDay, boolean>;

export function defaultWeekAvailability(): WeekAvailability {
  return {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true,
  };
}

export function normalizeWeekAvailability(
  value: unknown,
): WeekAvailability {
  const base = defaultWeekAvailability();
  if (!value || typeof value !== 'object') return base;
  const raw = value as Record<string, unknown>;
  for (const day of WEEK_DAYS) {
    if (typeof raw[day] === 'boolean') base[day] = raw[day];
  }
  return base;
}

/** Monday=0 … Sunday=6 for local calendar day. */
export function weekDayFromDate(date = new Date()): WeekDay {
  const jsDay = date.getDay(); // 0=Sun … 6=Sat
  return WEEK_DAYS[(jsDay + 6) % 7];
}

export function isAvailableOnDay(
  workingHours: unknown,
  day: WeekDay = weekDayFromDate(),
): boolean {
  return normalizeWeekAvailability(workingHours)[day] !== false;
}
