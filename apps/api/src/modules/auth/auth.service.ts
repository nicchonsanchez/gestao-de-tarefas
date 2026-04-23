import { Injectable, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { env } from '@/config/env';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PasswordService } from '@/common/crypto/password.service';
import { TokenService } from '@/common/crypto/token.service';
import { UsersService, type PublicUser } from '@/modules/users/users.service';

import type { JwtAccessPayload, LoginResult } from './auth.types';

/**
 * Converte duração textual tipo "15m", "7d", "30d", "12h" em milissegundos.
 * Suporta: s (seconds), m (minutes), h (hours), d (days), w (weeks).
 */
function parseDurationMs(input: string): number {
  const match = /^(\d+)\s*(s|m|h|d|w)$/i.exec(input.trim());
  if (!match) {
    throw new Error(`Duração inválida: "${input}". Formato esperado: <n><s|m|h|d|w>`);
  }
  const [, n, unitRaw] = match;
  const value = Number(n);
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  const unit = unitRaw!.toLowerCase();
  const mult = multipliers[unit];
  if (!mult) throw new Error(`Unidade desconhecida: "${unit}"`);
  return value * mult;
}

interface LoginParams {
  email: string;
  password: string;
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async login({ email, password, userAgent, ip }: LoginParams): Promise<LoginResult> {
    const user = await this.users.findByEmail(email);

    // Timing: fazemos verify sempre (mesmo com hash fake) para não vazar existência.
    const hash = user?.passwordHash ?? '$argon2id$v=19$m=65536,t=3,p=4$dummydummydummy$dummy';
    const verified = await this.password.verify(hash, password);

    if (!verified || !user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    if (user.deletedAt) {
      throw new ForbiddenException('Conta desativada.');
    }

    // Re-hash se parâmetros mudaram
    if (this.password.needsRehash(user.passwordHash)) {
      const newHash = await this.password.hash(password);
      await this.users.updatePasswordHash(user.id, newHash);
    }

    return this.issueTokens(user.id, user.email, { userAgent, ip });
  }

  async refresh(rawRefreshToken: string): Promise<LoginResult> {
    const tokenHash = this.tokens.hash(rawRefreshToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    if (session.user.deletedAt) {
      throw new ForbiddenException('Conta desativada.');
    }

    // Rotação: revoga a sessão atual e emite uma nova.
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(session.userId, session.user.email, {
      userAgent: session.userAgent ?? undefined,
      ip: session.ip ?? undefined,
    });
  }

  async logout(rawRefreshToken: string): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = this.tokens.hash(rawRefreshToken);
    await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  async validateAccessToken(token: string): Promise<JwtAccessPayload> {
    try {
      return await this.jwt.verifyAsync<JwtAccessPayload>(token, {
        secret: env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
  }

  async me(userId: string): Promise<PublicUser> {
    return this.users.findPublicById(userId);
  }

  // -----------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------

  private async issueTokens(
    userId: string,
    email: string,
    opts: { userAgent?: string; ip?: string },
  ): Promise<LoginResult> {
    const payload: JwtAccessPayload = { sub: userId, email };
    // JwtModule.register já define secret + expiresIn nos defaults;
    // evita conflito de tipos com StringValue do ms.
    const accessToken = await this.jwt.signAsync(payload);

    const refreshToken = this.tokens.generate();
    const tokenHash = this.tokens.hash(refreshToken);

    const expiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL));

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        userAgent: opts.userAgent,
        ip: opts.ip,
        expiresAt,
      },
    });

    const user = await this.users.findPublicById(userId);

    this.logger.log({ userId, sessionExpiresAt: expiresAt.toISOString() }, 'session issued');

    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: expiresAt,
      user,
    };
  }
}
