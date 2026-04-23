import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequestContext } from '../auth.types';

/**
 * Injeta o contexto do usuário autenticado (preenchido pelo JwtAuthGuard).
 *
 * @example
 *   @Get('me')
 *   me(@CurrentUser() user: AuthenticatedRequestContext) { ... }
 *   @Get('profile')
 *   profile(@CurrentUser('userId') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedRequestContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedRequestContext }>();
    const user = request.user;
    if (!user) return undefined;
    return field ? user[field] : user;
  },
);
