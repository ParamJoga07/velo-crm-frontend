import { z } from 'zod';
import { RoleSchema } from './roles';

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().min(1).optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: RoleSchema,
  teamId: z.string().uuid().nullable().optional(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int(),
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const LoginResponseSchema = z.object({
  user: AuthUserSchema,
  tokens: AuthTokensSchema,
  tenant: z.object({
    id: z.string().uuid(),
    name: z.string(),
    timezone: z.string(),
    /** Remaining quota: leadLimit − leads imported/used */
    leadBalance: z.number().int(),
    leadLimit: z.number().int().optional(),
    leadsUsed: z.number().int().optional(),
    planCode: z.string().optional(),
    seatLimit: z.number().int().optional(),
    seatsUsed: z.number().int().optional(),
    brandProductName: z.string().nullable().optional(),
    brandPrimary: z.string().nullable().optional(),
    brandSecondary: z.string().nullable().optional(),
    brandAccent: z.string().nullable().optional(),
    brandSidebar: z.string().nullable().optional(),
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
