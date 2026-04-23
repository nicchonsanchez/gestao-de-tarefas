import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { env } from '@/config/env';
import { UsersService } from '@/modules/users/users.service';
import type { JwtAccessPayload, AuthenticatedRequestContext } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly users: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthenticatedRequestContext> {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }
    // Double-check user ainda existe e não foi desativado
    const user = await this.users.findById(payload.sub);
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Usuário inválido.');
    }
    return {
      userId: user.id,
      email: user.email,
    };
  }
}
