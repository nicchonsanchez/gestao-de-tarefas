import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().url().nullable(),
  locale: z.string().default('pt-BR'),
  timezone: z.string().default('America/Sao_Paulo'),
  twoFactorEnabled: z.boolean().default(false),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const UpdateProfileRequestSchema = z.object({
  name: z.string().min(2).max(120).trim().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  locale: z.enum(['pt-BR', 'en', 'es']).optional(),
  timezone: z.string().optional(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
