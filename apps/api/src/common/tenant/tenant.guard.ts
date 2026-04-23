import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ORG_ROLE_RANK, type OrgRole } from '@ktask/contracts';

import { PrismaService } from '@/common/prisma/prisma.service';
import type { AuthenticatedRequestContext } from '@/modules/auth/auth.types';
import type { TenantContext } from './tenant.types';

export const TENANT_MIN_ROLE_KEY = 'tenantMinRole';

/**
 * Guard que resolve o TenantContext (org atual do usuário) a partir de:
 *   1. Header `X-Org-Id` (prioritário)
 *   2. Primeira Membership do usuário (default)
 *
 * Valida que o usuário autenticado tem Membership ativa na Org.
 * Se uma role mínima foi declarada via `@RequireOrgRole(...)`, também valida o rank.
 *
 * Deve ser aplicado em controladores que precisam de contexto de Org.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedRequestContext;
      headers: Record<string, string | string[] | undefined>;
      tenant?: TenantContext;
    }>();

    const user = request.user;
    if (!user?.userId) {
      throw new ForbiddenException('Autenticação obrigatória.');
    }

    const headerOrgId = normalizeHeader(request.headers['x-org-id']);

    const membership = headerOrgId
      ? await this.prisma.membership.findUnique({
          where: { userId_organizationId: { userId: user.userId, organizationId: headerOrgId } },
          include: { organization: true },
        })
      : await this.prisma.membership.findFirst({
          where: { userId: user.userId },
          include: { organization: true },
          orderBy: { createdAt: 'asc' },
        });

    if (!membership || membership.organization.deletedAt) {
      throw new ForbiddenException('Você não faz parte desta organização.');
    }

    const tenantCtx: TenantContext = {
      organizationId: membership.organizationId,
      organizationSlug: membership.organization.slug,
      role: membership.role,
      membershipId: membership.id,
    };

    request.tenant = tenantCtx;

    // Role mínima declarada por controller/handler
    const minRole = this.reflector.getAllAndOverride<OrgRole | undefined>(TENANT_MIN_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (minRole && ORG_ROLE_RANK[membership.role] < ORG_ROLE_RANK[minRole]) {
      throw new ForbiddenException(`Papel insuficiente (requer ${minRole}).`);
    }

    return true;
  }
}

function normalizeHeader(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}
