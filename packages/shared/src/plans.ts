import { z } from 'zod';

export const PlanCodeSchema = z.enum([
  'TEAM_15',
  'TEAM_30',
  'TEAM_50',
  'TEAM_75',
]);
export type PlanCode = z.infer<typeof PlanCodeSchema>;

export type SubscriptionPlan = {
  code: PlanCode;
  name: string;
  tagline: string;
  seatLimit: number;
  leadLimit: number;
  /** Monthly list price in INR (display; billing gateway later) */
  priceInrMonthly: number;
  whiteLabel: boolean;
  features: string[];
};

/** Catalog of seat-based subscription tiers */
export const SUBSCRIPTION_PLANS: Record<PlanCode, SubscriptionPlan> = {
  TEAM_15: {
    code: 'TEAM_15',
    name: 'Team 15',
    tagline: 'Small sales pods getting started',
    seatLimit: 15,
    leadLimit: 25_000,
    priceInrMonthly: 9_999,
    whiteLabel: true,
    features: [
      'Up to 15 active users',
      '25,000 lead quota',
      'Company branding (name & colors)',
      'Attendance, leave & HRMS',
    ],
  },
  TEAM_30: {
    code: 'TEAM_30',
    name: 'Team 30',
    tagline: 'Growing brokerages and mid-size teams',
    seatLimit: 30,
    leadLimit: 50_000,
    priceInrMonthly: 19_999,
    whiteLabel: true,
    features: [
      'Up to 30 active users',
      '50,000 lead quota',
      'Company branding (name & colors)',
      'Imports, exports & reassignment',
    ],
  },
  TEAM_50: {
    code: 'TEAM_50',
    name: 'Team 50',
    tagline: 'Multi-team operations',
    seatLimit: 50,
    leadLimit: 100_000,
    priceInrMonthly: 34_999,
    whiteLabel: true,
    features: [
      'Up to 50 active users',
      '100,000 lead quota',
      'Full white-label branding',
      'Priority support',
    ],
  },
  TEAM_75: {
    code: 'TEAM_75',
    name: 'Enterprise 75+',
    tagline: 'Large organizations and multi-branch groups',
    seatLimit: 100,
    leadLimit: 250_000,
    priceInrMonthly: 59_999,
    whiteLabel: true,
    features: [
      'Up to 100 active users (75+ seating)',
      '250,000 lead quota',
      'Full white-label branding',
      'Dedicated onboarding',
    ],
  },
};

export const PLAN_LIST: SubscriptionPlan[] = [
  SUBSCRIPTION_PLANS.TEAM_15,
  SUBSCRIPTION_PLANS.TEAM_30,
  SUBSCRIPTION_PLANS.TEAM_50,
  SUBSCRIPTION_PLANS.TEAM_75,
];

export function planByCode(code: string | null | undefined): SubscriptionPlan {
  if (code && code in SUBSCRIPTION_PLANS) {
    return SUBSCRIPTION_PLANS[code as PlanCode];
  }
  return SUBSCRIPTION_PLANS.TEAM_15;
}

const HexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Use a hex color like #3D5A80')
  .optional()
  .nullable();

export const BrandingUpdateSchema = z.object({
  brandProductName: z.string().min(1).max(80).optional().nullable(),
  brandPrimary: HexColor,
  brandSecondary: HexColor,
  brandAccent: HexColor,
  brandSidebar: HexColor,
});
export type BrandingUpdateInput = z.infer<typeof BrandingUpdateSchema>;

export const SubscriptionUpdateSchema = z.object({
  planCode: PlanCodeSchema,
});
export type SubscriptionUpdateInput = z.infer<typeof SubscriptionUpdateSchema>;
