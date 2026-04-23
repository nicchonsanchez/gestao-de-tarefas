import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { TenantContext } from './tenant.types';

/**
 * Extrai o TenantContext (populado pelo TenantGuard) do request.
 *
 * @example
 *   @UseGuards(TenantGuard)
 *   @Get('members')
 *   list(@CurrentOrg() org: TenantContext) { ... }
 */
export const CurrentOrg = createParamDecorator(
  (field: keyof TenantContext | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ tenant?: TenantContext }>();
    const tenant = req.tenant;
    if (!tenant) return undefined;
    return field ? tenant[field] : tenant;
  },
);
