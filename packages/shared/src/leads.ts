import { z } from 'zod';
import { LeadStageSchema } from './roles';

export const LeadImportFieldSchema = z.enum([
  'name',
  'phone',
  'altPhone',
  'email',
  'source',
  'budgetMin',
  'budgetMax',
  'city',
  'note',
]);
export type LeadImportField = z.infer<typeof LeadImportFieldSchema>;

export const ImportJobStatusSchema = z.enum([
  'PENDING',
  'PARSING',
  'AWAITING_MAPPING',
  'PROCESSING',
  'UPLOADED',
  'ERROR',
]);
export type ImportJobStatus = z.infer<typeof ImportJobStatusSchema>;

export const LeadSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable().optional(),
  stage: LeadStageSchema,
  source: z.string(),
  teamId: z.string().uuid().nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
});
export type LeadSummary = z.infer<typeof LeadSummarySchema>;
