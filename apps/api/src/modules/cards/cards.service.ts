import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Priority, Prisma } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { computeInsertPosition } from '@/common/util/position';
import type { TenantContext } from '@/common/tenant/tenant.types';
import { BoardAccessService } from '@/modules/boards/board-access.service';

interface CreateCardInput {
  listId: string;
  title: string;
  description?: Prisma.InputJsonValue | null;
  priority?: Priority;
  dueDate?: string | null;
  startDate?: string | null;
}

interface UpdateCardInput {
  title?: string;
  description?: Prisma.InputJsonValue | null;
  priority?: Priority;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  estimateMinutes?: number | null;
}

interface MoveCardInput {
  toListId: string;
  afterCardId: string | null; // null = topo da lista
}

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BoardAccessService,
  ) {}

  async create(userId: string, tenant: TenantContext, input: CreateCardInput) {
    const list = await this.prisma.list.findUnique({ where: { id: input.listId } });
    if (!list) throw new NotFoundException('Lista não encontrada.');
    await this.access.assertAccess(userId, list.boardId, tenant, 'EDITOR');

    const last = await this.prisma.card.findFirst({
      where: { listId: input.listId, isArchived: false },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = computeInsertPosition(last?.position ?? null, null);

    const card = await this.prisma.card.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: list.boardId,
        listId: input.listId,
        title: input.title,
        description: (input.description ?? undefined) as Prisma.InputJsonValue | undefined,
        priority: input.priority ?? 'MEDIUM',
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        position,
        createdById: userId,
      },
    });

    await this.prisma.activity.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: list.boardId,
        cardId: card.id,
        actorId: userId,
        type: 'CARD_CREATED',
        payload: { cardId: card.id, title: card.title, listId: list.id },
      },
    });

    return card;
  }

  async getOne(userId: string, tenant: TenantContext, cardId: string) {
    const card = await this.getCardOrThrow(cardId, tenant.organizationId);
    await this.access.assertAccess(userId, card.boardId, tenant, 'VIEWER');
    return this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: { select: { id: true, name: true, boardId: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        labels: { include: { label: true } },
        checklists: {
          include: { items: { orderBy: { position: 'asc' } } },
          orderBy: { position: 'asc' },
        },
        attachments: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: { actor: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        _count: { select: { children: true } },
      },
    });
  }

  async update(userId: string, tenant: TenantContext, cardId: string, input: UpdateCardInput) {
    const card = await this.getCardOrThrow(cardId, tenant.organizationId);
    await this.access.assertAccess(userId, card.boardId, tenant, 'EDITOR');

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: {
        title: input.title,
        description: (input.description ?? undefined) as Prisma.InputJsonValue | undefined,
        priority: input.priority,
        startDate:
          input.startDate !== undefined
            ? input.startDate
              ? new Date(input.startDate)
              : null
            : undefined,
        dueDate:
          input.dueDate !== undefined
            ? input.dueDate
              ? new Date(input.dueDate)
              : null
            : undefined,
        completedAt:
          input.completedAt !== undefined
            ? input.completedAt
              ? new Date(input.completedAt)
              : null
            : undefined,
        estimateMinutes: input.estimateMinutes ?? undefined,
      },
    });

    await this.prisma.activity.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: card.boardId,
        cardId,
        actorId: userId,
        type: 'CARD_UPDATED',
        payload: { cardId, input } as unknown as Prisma.InputJsonValue,
      },
    });

    return updated;
  }

  async move(userId: string, tenant: TenantContext, cardId: string, input: MoveCardInput) {
    const card = await this.getCardOrThrow(cardId, tenant.organizationId);
    await this.access.assertAccess(userId, card.boardId, tenant, 'EDITOR');

    const destList = await this.prisma.list.findUnique({ where: { id: input.toListId } });
    if (!destList || destList.boardId !== card.boardId) {
      throw new BadRequestException('Lista destino inválida.');
    }

    const { beforePos, afterPos } = await this.resolveNeighbors(
      input.toListId,
      input.afterCardId,
      cardId,
    );
    const position = computeInsertPosition(beforePos, afterPos);

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: { listId: input.toListId, position },
    });

    await this.prisma.activity.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: card.boardId,
        cardId,
        actorId: userId,
        type: 'CARD_MOVED',
        payload: {
          cardId,
          fromListId: card.listId,
          toListId: input.toListId,
          position,
        },
      },
    });

    return updated;
  }

  async archive(userId: string, tenant: TenantContext, cardId: string) {
    const card = await this.getCardOrThrow(cardId, tenant.organizationId);
    await this.access.assertAccess(userId, card.boardId, tenant, 'EDITOR');

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: { isArchived: true },
    });

    await this.prisma.activity.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: card.boardId,
        cardId,
        actorId: userId,
        type: 'CARD_ARCHIVED',
        payload: { cardId },
      },
    });

    return updated;
  }

  async restore(userId: string, tenant: TenantContext, cardId: string) {
    const card = await this.getCardOrThrow(cardId, tenant.organizationId);
    await this.access.assertAccess(userId, card.boardId, tenant, 'EDITOR');
    return this.prisma.card.update({
      where: { id: cardId },
      data: { isArchived: false },
    });
  }

  async assignMember(userId: string, tenant: TenantContext, cardId: string, memberUserId: string) {
    const card = await this.getCardOrThrow(cardId, tenant.organizationId);
    await this.access.assertAccess(userId, card.boardId, tenant, 'EDITOR');

    // Verifica se memberUserId é da Org
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId: memberUserId, organizationId: tenant.organizationId },
      },
    });
    if (!membership) {
      throw new BadRequestException('Usuário não pertence à organização.');
    }

    await this.prisma.cardMember.upsert({
      where: { cardId_userId: { cardId, userId: memberUserId } },
      update: {},
      create: { cardId, userId: memberUserId },
    });

    await this.prisma.activity.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: card.boardId,
        cardId,
        actorId: userId,
        type: 'CARD_ASSIGNED',
        payload: { cardId, memberId: memberUserId },
      },
    });

    return { ok: true };
  }

  async unassignMember(
    userId: string,
    tenant: TenantContext,
    cardId: string,
    memberUserId: string,
  ) {
    const card = await this.getCardOrThrow(cardId, tenant.organizationId);
    await this.access.assertAccess(userId, card.boardId, tenant, 'EDITOR');

    await this.prisma.cardMember
      .delete({ where: { cardId_userId: { cardId, userId: memberUserId } } })
      .catch(() => undefined);

    await this.prisma.activity.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: card.boardId,
        cardId,
        actorId: userId,
        type: 'CARD_UNASSIGNED',
        payload: { cardId, memberId: memberUserId },
      },
    });

    return { ok: true };
  }

  async addLabel(userId: string, tenant: TenantContext, cardId: string, labelId: string) {
    const card = await this.getCardOrThrow(cardId, tenant.organizationId);
    await this.access.assertAccess(userId, card.boardId, tenant, 'EDITOR');

    const label = await this.prisma.label.findUnique({ where: { id: labelId } });
    if (!label || label.organizationId !== tenant.organizationId) {
      throw new BadRequestException('Etiqueta inválida.');
    }
    if (label.boardId && label.boardId !== card.boardId) {
      throw new BadRequestException('Etiqueta pertence a outro quadro.');
    }

    await this.prisma.cardLabel.upsert({
      where: { cardId_labelId: { cardId, labelId } },
      update: {},
      create: { cardId, labelId },
    });

    await this.prisma.activity.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: card.boardId,
        cardId,
        actorId: userId,
        type: 'LABEL_ADDED',
        payload: { cardId, labelId, labelName: label.name },
      },
    });

    return { ok: true };
  }

  async removeLabel(userId: string, tenant: TenantContext, cardId: string, labelId: string) {
    const card = await this.getCardOrThrow(cardId, tenant.organizationId);
    await this.access.assertAccess(userId, card.boardId, tenant, 'EDITOR');

    await this.prisma.cardLabel
      .delete({ where: { cardId_labelId: { cardId, labelId } } })
      .catch(() => undefined);

    await this.prisma.activity.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: card.boardId,
        cardId,
        actorId: userId,
        type: 'LABEL_REMOVED',
        payload: { cardId, labelId },
      },
    });

    return { ok: true };
  }

  // -----------------------------------------------------------------

  private async getCardOrThrow(cardId: string, organizationId: string) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card || card.organizationId !== organizationId) {
      throw new NotFoundException('Card não encontrado.');
    }
    return card;
  }

  private async resolveNeighbors(
    listId: string,
    afterCardId: string | null,
    skipCardId: string,
  ): Promise<{ beforePos: number | null; afterPos: number | null }> {
    if (afterCardId === null) {
      const first = await this.prisma.card.findFirst({
        where: { listId, isArchived: false, id: { not: skipCardId } },
        orderBy: { position: 'asc' },
        select: { position: true },
      });
      return { beforePos: null, afterPos: first?.position ?? null };
    }

    const before = await this.prisma.card.findUnique({
      where: { id: afterCardId },
      select: { position: true, listId: true },
    });
    if (!before || before.listId !== listId) {
      throw new BadRequestException('Card referência não está na lista destino.');
    }

    const next = await this.prisma.card.findFirst({
      where: {
        listId,
        isArchived: false,
        id: { not: skipCardId },
        position: { gt: before.position },
      },
      orderBy: { position: 'asc' },
      select: { position: true },
    });

    return { beforePos: before.position, afterPos: next?.position ?? null };
  }
}
