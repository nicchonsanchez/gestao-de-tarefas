import { SetMetadata } from '@nestjs/common';
import type { OrgRole } from '@ktask/contracts';
import { TENANT_MIN_ROLE_KEY } from './tenant.guard';

/**
 * Declara a role mínima exigida no TenantContext.
 * Aplicar no mesmo handler/controller que já usa @UseGuards(TenantGuard).
 *
 * @example
 *   @UseGuards(TenantGuard)
 *   @RequireOrgRole('ADMIN')
 *   @Post('members')
 *   invite(...) { ... }
 */
export const RequireOrgRole = (role: OrgRole) => SetMetadata(TENANT_MIN_ROLE_KEY, role);
