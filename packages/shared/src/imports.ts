import { z } from 'zod';

export const ImportTypeSchema = z.enum(['LEADS', 'SITE_VISITS', 'FOLLOWUPS']);
export type ImportType = z.infer<typeof ImportTypeSchema>;

export const LeadFieldMappingTargets = [
  'name',
  'phone',
  'altPhone',
  'email',
  'source',
  'budgetMin',
  'budgetMax',
  'city',
  'note',
] as const;

export const CreateImportJobSchema = z.object({
  type: ImportTypeSchema,
  campaignId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  salesUserIds: z.array(z.string().uuid()).default([]),
  projectIds: z.array(z.string().uuid()).default([]),
  sendDefaultNotification: z.boolean().default(false),
  notifyEmail: z.string().email().optional().nullable(),
  allowReEngage: z.boolean().default(true),
  allowReassignExisting: z.boolean().default(false),
  fileHasHeader: z.boolean().default(true),
  fieldMapping: z.record(z.string(), z.string()),
});
export type CreateImportJobInput = z.infer<typeof CreateImportJobSchema>;

export const ImportListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.string().optional(),
  campaignId: z.string().uuid().optional(),
  initiatedById: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
