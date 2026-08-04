import { z } from 'zod';

export const CreateExportJobSchema = z.object({
  entity: z.enum(['LEADS']).default('LEADS'),
  format: z.enum(['CSV', 'XLSX']).default('XLSX'),
  stage: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  notifyEmail: z.string().email().optional().nullable(),
});
export type CreateExportJobInput = z.infer<typeof CreateExportJobSchema>;

export const ExportListQuerySchema = z.object({
  cursor: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const ReassignLeadsSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(500),
  toUserId: z.string().uuid(),
  toTeamId: z.string().uuid().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});
export type ReassignLeadsInput = z.infer<typeof ReassignLeadsSchema>;

export const CreateUserSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(['SUPERADMIN', 'MANAGER', 'USER']),
  phone: z.string().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.enum(['SUPERADMIN', 'MANAGER', 'USER']).optional(),
  phone: z.string().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const CreateTeamSchema = z.object({
  name: z.string().min(1).max(120),
  departmentName: z.string().min(1).max(120).optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
});
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;

export const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  departmentName: z.string().min(1).max(120).optional().nullable(),
});
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;

export const AddTeamMemberSchema = z.object({
  userId: z.string().uuid().optional(),
  // Or create a new user directly into the team
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(['MANAGER', 'USER']).default('USER'),
  phone: z.string().optional().nullable(),
  asManager: z.boolean().default(false),
});
export type AddTeamMemberInput = z.infer<typeof AddTeamMemberSchema>;

export const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(120),
  source: z.string().max(80).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(120),
  city: z.string().max(80).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const CreateCustomFieldSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z][a-zA-Z0-9_]*$/),
  label: z.string().min(1).max(120),
  type: z.enum(['TEXT', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN']).default('TEXT'),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional().nullable(),
});

export const CreateAssignmentRuleSchema = z.object({
  priority: z.number().int().min(1).max(999).default(100),
  strategy: z.enum(['ROUND_ROBIN', 'LEAST_LOAD', 'FIXED_TEAM']).default('ROUND_ROBIN'),
  source: z.string().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
});
