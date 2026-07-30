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

export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  HOT: 'Hot',
  WARM: 'Warm',
  COLD: 'Cold',
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
