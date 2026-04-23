import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Invitation, OrgRole } from '@prisma/client';
import { ORG_ROLE_RANK } from '@ktask/contracts';

import { PrismaService } from '@/common/prisma/prisma.service';
import { TokenService } from '@/common/crypto/token.service';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1_000; // 7 dias

interface CreateInvitationParams {
  organizationId: string;
  email: string;
  role: OrgRole;
  invitedById: string;
  actorRole: OrgRole;
}

interface AcceptInvitationParams {
  token: string;
  userId: string; // user já criado (ex: cadastro pelo token)
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async create(
    params: CreateInvitationParams,
  ): Promise<{ invitation: Invitation; rawToken: string }> {
    const { organizationId, email, role, invitedById, actorRole } = params;
    const emailNormalized = email.toLowerCase().trim();

    // Regra: convites só por OWNER/ADMIN. Papel convidado não pode ser > rank do actor,
    // e ninguém pode convidar como OWNER (só transferência faz isso).
    if (actorRole !== 'OWNER' && actorRole !== 'ADMIN') {
      throw new ForbiddenException('Sem permissão para convidar novos membros.');
    }
    if (role === 'OWNER') {
      throw new BadRequestException('OWNER só é atribuído via transferência.');
    }
    if (ORG_ROLE_RANK[role] > ORG_ROLE_RANK[actorRole]) {
      throw new ForbiddenException('Não é possível convidar com papel superior ao seu.');
    }

    // Já é membro?
    const existingUser = await this.prisma.user.findUnique({ where: { email: emailNormalized } });
    if (existingUser) {
      const membership = await this.prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId,
          },
        },
      });
      if (membership) {
        throw new BadRequestException('Este e-mail já é membro da organização.');
      }
    }

    // Revoga convites pendentes anteriores (mesmo email, mesma org)
    await this.prisma.invitation.deleteMany({
      where: {
        organizationId,
        email: emailNormalized,
        acceptedAt: null,
      },
    });

    const rawToken = this.tokens.generate();
    const tokenHash = this.tokens.hash(rawToken);

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId,
        email: emailNormalized,
        role,
        token: tokenHash, // armazena hash (nunca o raw)
        invitedById,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    return { invitation, rawToken };
  }

  /**
   * Valida um token sem aceitar (útil pra tela de "aceitar convite" exibir dados).
   */
  async previewByRawToken(rawToken: string) {
    const tokenHash = this.tokens.hash(rawToken);
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: tokenHash },
      include: { organization: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });

    if (!invitation) throw new NotFoundException('Convite inválido.');
    if (invitation.acceptedAt) throw new BadRequestException('Convite já aceito.');
    if (invitation.expiresAt < new Date()) throw new BadRequestException('Convite expirado.');

    return invitation;
  }

  async accept(params: AcceptInvitationParams) {
    const { token: rawToken, userId } = params;

    const invitation = await this.previewByRawToken(rawToken);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException('Este convite foi enviado para outro e-mail.');
    }

    // Transação: aceita convite + cria/atualiza membership
    return this.prisma.$transaction(async (tx) => {
      await tx.membership.upsert({
        where: {
          userId_organizationId: {
            userId,
            organizationId: invitation.organizationId,
          },
        },
        update: { role: invitation.role },
        create: {
          userId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return tx.organization.findUniqueOrThrow({ where: { id: invitation.organizationId } });
    });
  }

  async revoke(invitationId: string, organizationId: string) {
    const invite = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invite || invite.organizationId !== organizationId) {
      throw new NotFoundException('Convite não encontrado.');
    }
    if (invite.acceptedAt) {
      throw new BadRequestException('Convite já aceito não pode ser revogado.');
    }
    await this.prisma.invitation.delete({ where: { id: invitationId } });
  }

  listPending(organizationId: string) {
    return this.prisma.invitation.findMany({
      where: {
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
