import { z } from 'zod';

/**
 * No MVP aceitamos duas formas:
 *   1. `body` já como JSON (Tiptap/ProseMirror) e `plainText` separado
 *   2. Só `plainText` (string). Nesse caso o body vira um doc ProseMirror-like simples
 *      com um parágrafo.
 */
export const CreateCommentSchema = z.object({
  cardId: z.string().cuid(),
  plainText: z.string().min(1).max(10_000).trim(),
  body: z.unknown().optional(),
});
export type CreateCommentRequest = z.infer<typeof CreateCommentSchema>;

export const UpdateCommentSchema = z.object({
  plainText: z.string().min(1).max(10_000).trim(),
  body: z.unknown().optional(),
});
export type UpdateCommentRequest = z.infer<typeof UpdateCommentSchema>;
