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

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  INCOMING: 'Incoming',
  PROSPECT: 'Prospect',
  OPPORTUNITY: 'Opportunity',
  UNQUALIFIED: 'Unqualified',
  BOOKED: 'Booked',
  LOST: 'Lost',
};

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
