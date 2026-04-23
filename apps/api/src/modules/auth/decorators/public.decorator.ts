import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca uma rota como pública (desabilita JwtAuthGuard global).
 *
 * @example
 *   @Public()
 *   @Post('login')
 *   login() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
