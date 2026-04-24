import { z } from 'zod';

export const PrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const CreateCardSchema = z.object({
  listId: z.string().cuid(),
  title: z.string().min(1).max(500).trim(),
  description: z.any().optional().nullable(),
  priority: PrioritySchema.optional(),
  startDate: z.string().datetime().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});
export type CreateCardRequest = z.infer<typeof CreateCardSchema>;

export const UpdateCardSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  description: z.any().optional().nullable(),
  priority: PrioritySchema.optional(),
  startDate: z.string().datetime().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  estimateMinutes: z.number().int().nonnegative().nullable().optional(),
  leadId: z.string().cuid().nullable().optional(),
});
export type UpdateCardRequest = z.infer<typeof UpdateCardSchema>;

export const MoveCardSchema = z.object({
  toListId: z.string().cuid(),
  afterCardId: z.string().cuid().nullable(),
});
export type MoveCardRequest = z.infer<typeof MoveCardSchema>;

export const MemberIdSchema = z.object({ userId: z.string().cuid() });
export const LabelIdSchema = z.object({ labelId: z.string().cuid() });
