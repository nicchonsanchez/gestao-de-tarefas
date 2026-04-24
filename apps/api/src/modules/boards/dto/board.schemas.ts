import { z } from 'zod';

export const CreateBoardSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  description: z.string().max(1000).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve ser hex #RRGGBB.')
    .optional()
    .nullable(),
  icon: z.string().max(40).optional().nullable(),
  visibility: z.enum(['PRIVATE', 'ORGANIZATION']).optional(),
});
export type CreateBoardRequest = z.infer<typeof CreateBoardSchema>;

export const UpdateBoardSchema = CreateBoardSchema.partial();
export type UpdateBoardRequest = z.infer<typeof UpdateBoardSchema>;

export const AddBoardMemberSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(['ADMIN', 'EDITOR', 'COMMENTER', 'VIEWER']).optional(),
});
export type AddBoardMemberRequest = z.infer<typeof AddBoardMemberSchema>;
