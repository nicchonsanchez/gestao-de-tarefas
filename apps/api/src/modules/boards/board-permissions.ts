import type { BoardRole, OrgRole } from '@prisma/client';
import { BOARD_ROLE_RANK, ORG_ROLES_WITH_BOARD_BYPASS } from '@ktask/contracts';

/**
 * Resolve o BoardRole efetivo do usuário em um quadro específico.
 *
 * Regras:
 * - OWNER/ADMIN/GESTOR da Org têm BoardRole=ADMIN implícito em qualquer quadro.
 * - Caso contrário, precisa de BoardMember OU board.visibility=ORGANIZATION
 *   (nesse caso MEMBER vê como VIEWER; GUEST não vê).
 * - Retorna null se o usuário não pode acessar.
 */
export function resolveBoardRole(params: {
  orgRole: OrgRole;
  boardMemberRole: BoardRole | null;
  boardVisibility: 'PRIVATE' | 'ORGANIZATION';
}): BoardRole | null {
  const { orgRole, boardMemberRole, boardVisibility } = params;

  if ((ORG_ROLES_WITH_BOARD_BYPASS as readonly OrgRole[]).includes(orgRole)) {
    return 'ADMIN';
  }

  if (boardMemberRole) return boardMemberRole;

  if (boardVisibility === 'ORGANIZATION' && orgRole === 'MEMBER') {
    return 'VIEWER';
  }

  return null;
}

export function hasAtLeastBoardRole(actual: BoardRole, required: BoardRole): boolean {
  return BOARD_ROLE_RANK[actual] >= BOARD_ROLE_RANK[required];
}
