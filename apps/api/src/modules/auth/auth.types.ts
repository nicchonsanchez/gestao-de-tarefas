import type { PublicUser } from '@/modules/users/users.service';

export interface JwtAccessPayload {
  sub: string; // userId
  email: string;
  // O que mais for útil no access token (evitar info sensível).
  iat?: number;
  exp?: number;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
  refreshExpiresAt: Date;
}

export interface AuthenticatedRequestContext {
  userId: string;
  email: string;
  sessionId?: string;
}
