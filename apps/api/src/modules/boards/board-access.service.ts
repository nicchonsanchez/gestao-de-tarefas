import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { BoardRole } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import type { TenantContext } from '@/common/tenant/tenant.types';

import { hasAtLeastBoardRole, resolveBoardRole } from './board-permissions';

/**
 * Centraliza o check de acesso a um board específico para o usuário autenticado.
 * Use em qualquer service que manipula List/Card/Comment/etc.
 */
@Injectable()
export class BoardAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertAccess(
    userId: string,
    boardId: string,
    tenant: TenantContext,
    required: BoardRole = 'VIEWER',
  ): Promise<{ role: BoardRole }> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        members: { where: { userId } },
      },
    });

    if (!board || board.organizationId !== tenant.organizationId) {
      throw new NotFoundException('Quadro não encontrado.');
    }

    const boardMemberRole = board.members[0]?.role ?? null;
    const role = resolveBoardRole({
      orgRole: tenant.role,
      boardMemberRole,
      boardVisibility: board.visibility,
    });

    if (!role) {
      throw new ForbiddenException('Sem acesso a este quadro.');
    }

    if (!hasAtLeastBoardRole(role, required)) {
      throw new ForbiddenException(`Permissão insuficiente (requer ${required}).`);
    }

    return { role };
  }
}
