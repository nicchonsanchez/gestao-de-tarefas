import { api } from '@/lib/api-client';
import type { User as UserContract } from '@ktask/contracts';

export function updateProfile(input: {
  name?: string;
  avatarUrl?: string | null;
  locale?: string;
  timezone?: string;
}) {
  return api.patch<UserContract>('/api/v1/users/me', input);
}

export function changePassword(input: { currentPassword: string; newPassword: string }) {
  return api.post<void>('/api/v1/users/me/change-password', input);
}
