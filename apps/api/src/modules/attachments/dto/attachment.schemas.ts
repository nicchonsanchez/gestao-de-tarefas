import { z } from 'zod';

/** Máximo 25MB por anexo (limita upload client-side + Caddy). */
export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

export const PresignAttachmentSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive().max(MAX_ATTACHMENT_SIZE),
});
export type PresignAttachmentRequest = z.infer<typeof PresignAttachmentSchema>;

export const CreateAttachmentSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive().max(MAX_ATTACHMENT_SIZE),
  storageKey: z.string().min(1),
});
export type CreateAttachmentRequest = z.infer<typeof CreateAttachmentSchema>;
