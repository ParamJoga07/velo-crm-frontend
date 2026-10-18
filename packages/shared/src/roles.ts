import { z } from 'zod';

export const RoleSchema = z.enum(['SUPERADMIN', 'MANAGER', 'USER']);
export type Role = z.infer<typeof RoleSchema>;

export const LeadStageSchema = z.enum([
  'INCOMING',
  'CONTACTED',
  'PROSPECT',
  'DNP1',
  'DNP2',
  'DNP3',
  'WON',
  'LOST',
]);
export type LeadStage = z.infer<typeof LeadStageSchema>;

/** Lost reasons under Deal → Lost. */
export const LOST_REASONS = [
  'Not Interested',
  'Invalid Number',
  'Already Invested',
  'DNP / Call Not Answered',
] as const;
export type LostReason = (typeof LOST_REASONS)[number];

/** "Did not pick" ladder, in the order a lead walks down it. */
export const DNP_STAGES = ['DNP1', 'DNP2', 'DNP3'] as const;
export type DnpStage = (typeof DNP_STAGES)[number];

/**
 * Next rung on the DNP ladder for a lead that did not pick up again.
 * Anything before DNP1 starts at DNP1; DNP3 is the bottom and stays put.
 */
export function nextDnpStage(stage: LeadStage): DnpStage {
  const at = DNP_STAGES.indexOf(stage as DnpStage);
  if (at < 0) return 'DNP1';
  return DNP_STAGES[Math.min(at + 1, DNP_STAGES.length - 1)];
}

export const LeadPrioritySchema = z.enum(['HOT', 'WARM', 'COLD']);
export type LeadPriority = z.infer<typeof LeadPrioritySchema>;

/**
 * Hot / Warm / Cold only mean something once a lead is qualified, so the field
 * is surfaced as "Prospect" and is editable on PROSPECT leads only.
 */
export const PROSPECT_FIELD_LABEL = 'Prospect';

export function isProspectRatingEditable(stage: string): boolean {
  return stage === 'PROSPECT';
}

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  INCOMING: 'Incoming',
  CONTACTED: 'Contacted',
  PROSPECT: 'Prospect',
  DNP1: 'DNP 1',
  DNP2: 'DNP 2',
  DNP3: 'DNP 3',
  WON: 'Won',
  LOST: 'Lost',
};

/**
 * Stage tints, ordered as a health gradient down the pipeline:
 * blue (fresh) -> green (qualified) -> amber/orange/rose (fading) -> slate (dead).
 */
export const LEAD_STAGE_COLORS: Record<LeadStage, string> = {
  INCOMING:
    'border-sky-600/40 bg-sky-500/15 text-sky-800 dark:border-sky-400/30 dark:bg-sky-500/20 dark:text-sky-200',
  CONTACTED:
    'border-indigo-600/40 bg-indigo-500/15 text-indigo-800 dark:border-indigo-400/30 dark:bg-indigo-500/20 dark:text-indigo-200',
  PROSPECT:
    'border-emerald-600/40 bg-emerald-500/15 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/20 dark:text-emerald-200',
  DNP1:
    'border-amber-600/40 bg-amber-500/15 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/20 dark:text-amber-200',
  DNP2:
    'border-orange-600/40 bg-orange-500/15 text-orange-900 dark:border-orange-400/30 dark:bg-orange-500/20 dark:text-orange-200',
  DNP3:
    'border-rose-600/40 bg-rose-500/15 text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/20 dark:text-rose-200',
  WON:
    'border-teal-600/40 bg-teal-500/15 text-teal-800 dark:border-teal-400/30 dark:bg-teal-500/20 dark:text-teal-200',
  LOST:
    'border-slate-500/40 bg-slate-500/15 text-slate-700 dark:border-slate-400/30 dark:bg-slate-500/20 dark:text-slate-200',
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
  'CALL_INITIATED',
  'DID_NOT_PICK',
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

export const PROJECT_NAMES = [
  'Ananda Homes',
  'Sri Developers',
  'Muppas',
  'Team 4 Nyla',
  'Team 4 Arka',
  'Team 4 Aria',
  'Anvita High 9',
  'Esshanya Miliarium',
  'Divine Spaces',
  'Prestige',
  'Candeur',
  'Prosperti Akam',
  'Primark',
  'Urban Rise',
  'Vian',
  'Vajrainfra',
  'RV Nirman',
  'ASBL',
  'Cybercity',
  'AR Homes',
  'Ira Aspiration',
  'E-Infra',
  'Zuari',
  'Myron',
  'Ramky One Symphony',
  'Hallmark',
  'Indis Myra Villas',
  'Constella',
  'GreenSpace Marvel',
  'Maharaja',
  'Arkala',
  'Bliss in the Woods',
  'Swasthi By Sarus',
  'Sunshine',
  'Trilight',
  'Tridasa',
  'Cloudswood',
] as const;

export const MEETING_STATUSES = ['BOOKED', 'COMPLETED', 'CANCELLED'] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const MEETING_STATUS_LABELS: Record<string, string> = {
  BOOKED: 'Booked',
  SCHEDULED: 'Booked',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'Cancelled',
};

/**
 * Completed-meeting points: owner alone = 1.0; owner + one taker = 0.5 / 0.5;
 * owner + several takers = 0.5 to owner and the remaining 0.5 split equally.
 */
export function allocateMeetingPoints(
  ownerId: string,
  takerIds: string[],
): Record<string, number> {
  const takers = [...new Set(takerIds.filter(Boolean))];
  if (!takers.length) return { [ownerId]: 1 };
  const others = takers.filter((id) => id !== ownerId);
  if (!others.length) return { [ownerId]: 1 };
  const share = 0.5 / others.length;
  const out: Record<string, number> = { [ownerId]: 0.5 };
  for (const id of others) out[id] = share;
  return out;
}
