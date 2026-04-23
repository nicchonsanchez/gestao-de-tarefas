import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_WS_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default('KTask'),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
});

if (!parsed.success) {
  console.error(
    '[ERROR] Invalid frontend environment variables:',
    parsed.error.flatten().fieldErrors,
  );
  throw new Error('Invalid env vars');
}

export const env = parsed.data;
