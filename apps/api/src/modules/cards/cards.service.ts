import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Priority, Prisma } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { computeInsertPosition } from '@/common/util/position';
import type { TenantContext } from '@/common/tenant/tenant.types';
import { BoardAccessService } from '@/modules/boards/board-access.service';
import { EVENT_NAMES } from '@/modules/realtime/events.types';
import { StorageService } from '@/modules/storage/storage.service';

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
  leadId?: string | null;
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
    private readonly events: EventEmitter2,
    private readonly storage: StorageService,
  ) {}

  async create(userId: string, tenant: TenantContext, input: CreateCardInput) {
    const list = await this.prisma.list.findUnique({ where: { id: input.listId } });
    if (!list) throw new NotFoundException('Lista não encontrada.');
    await this.access.assertAccess(userId, list.boardId, tenant, 'EDITOR');

    const last = await this.prisma.card.findFirst({
      where: { listId: input.listId, isArchived: false, completedAt: null },
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
        leadId: userId, // Default: quem cria vira líder. Pode ser trocado no modal ou via automação.
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

    this.events.emit(EVENT_NAMES.CARD_CREATED, {
      boardId: list.boardId,
      organizationId: tenant.organizationId,
      actorId: userId,
      cardId: card.id,
      listId: list.id,
      title: card.title,
    });

    return card;
  }

  async getOne(userId: string, tenant: TenantContext, cardId: string) {
    const card = await this.getCardOrThrow(cardId, tenant.organizationId);
    await this.access.assertAccess(userId, card.boardId, tenant, 'VIEWER');
    const result = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: { select: { id: true, name: true, boardId: true } },
        lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        labels: { include: { label: true } },
        checklists: {
          include: { items: { orderBy: { position: 'asc' } } },
          orderBy: { position: 'asc' },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
          include: { uploader: { select: { id: true, name: true, avatarUrl: true } } },
        },
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
    if (!result) return null;
    // Hidrata publicUrl dos anexos a partir do storageKey
    const attachments = result.attachments.map((a) => ({
      ...a,
      publicUrl: this.storage.isEnabled() ? this.storage.publicUrlFor(a.storageKey) : null,
    }));
    return { ...result, attachments };
  }

  async update(userId: string, tenant: TenantContext, cardId: string, input: UpdateCardInput) {
    const card = await this.getCardOrThrow(cardId, tenant.organizationId);
    await this.access.assertAccess(userId, card.boardId, tenant, 'EDITOR');

    // Troca de líder: valida que o user alvo é membro da Org e registra activity específica
    const leadChanged = input.leadId !== undefined && input.leadId !== card.leadId;
    if (leadChanged && input.leadId) {
      const membership = await this.prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: input.leadId,
            organizationId: tenant.organizationId,
          },
        },
      });
      if (!membership) {
        throw new BadRequestException('O novo líder precisa ser membro da organização.');
      }
      // Se ainda não era membro do card, vira membro automaticamente
      await this.prisma.cardMember.upsert({
        where: { cardId_userId: { cardId, userId: input.leadId } },
        update: {},
        create: { cardId, userId: input.leadId },
      });
    }

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
        leadId: input.leadId !== undefined ? input.leadId : undefined,
      },
    });

    if (leadChanged) {
      await this.prisma.activity.create({
        data: {
          organizationId: tenant.organizationId,
          boardId: card.boardId,
          cardId,
          actorId: userId,
          type: 'CARD_LEAD_CHANGED',
          payload: {
            cardId,
            fromLeadId: card.leadId,
            toLeadId: input.leadId,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
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
    }

    this.events.emit(EVENT_NAMES.CARD_UPDATED, {
      boardId: card.boardId,
      organizationId: tenant.organizationId,
      actorId: userId,
      cardId,
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

    this.events.emit(EVENT_NAMES.CARD_MOVED, {
      boardId: card.boardId,
      organizationId: tenant.organizationId,
      actorId: userId,
      cardId,
      fromListId: card.listId,
      toListId: input.toListId,
      position,
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

    this.events.emit(EVENT_NAMES.CARD_ARCHIVED, {
      boardId: card.boardId,
      organizationId: tenant.organizationId,
      actorId: userId,
      cardId,
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

  async complete(userId: string, tenant: TenantContext, cardId: string) {
    const card = await this.getCardOrThrow(cardId, tenant.organizationId);
    await this.access.assertAccess(userId, card.boardId, tenant, 'EDITOR');

    if (card.completedAt) {
      return card; // idempotente
    }

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: { completedAt: new Date(), completedById: userId },
    });

    await this.prisma.activity.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: card.boardId,
        cardId,
        actorId: userId,
        type: 'CARD_COMPLETED',
        payload: { cardId, fromListId: card.listId },
      },
    });

    this.events.emit(EVENT_NAMES.CARD_COMPLETED, {
      boardId: card.boardId,
      organizationId: tenant.organizationId,
      actorId: userId,
      cardId,
      listId: card.listId,
    });

    return updated;
  }

  async uncomplete(userId: string, tenant: TenantContext, cardId: string, toListId?: string) {
    const card = await this.getCardOrThrow(cardId, tenant.organizationId);
    await this.access.assertAccess(userId, card.boardId, tenant, 'EDITOR');

    if (!card.completedAt) {
      return card; // idempotente
    }

    // Decide a lista destino: a solicitada, ou a original se ainda ativa, ou a primeira lista não-arquivada do board
    let targetListId = toListId ?? card.listId;
    const targetList = await this.prisma.list.findUnique({ where: { id: targetListId } });
    if (!targetList || targetList.boardId !== card.boardId || targetList.isArchived) {
      const firstList = await this.prisma.list.findFirst({
        where: { boardId: card.boardId, isArchived: false },
        orderBy: { position: 'asc' },
      });
      if (!firstList) {
        throw new BadRequestException('Não há lista disponível para restaurar o card.');
      }
      targetListId = firstList.id;
    }

    // Posiciona no fim da lista destino
    const last = await this.prisma.card.findFirst({
      where: { listId: targetListId, isArchived: false, completedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = computeInsertPosition(last?.position ?? null, null);

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: {
        completedAt: null,
        completedById: null,
        listId: targetListId,
        position,
      },
    });

    await this.prisma.activity.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: card.boardId,
        cardId,
        actorId: userId,
        type: 'CARD_UNCOMPLETED',
        payload: { cardId, toListId: targetListId },
      },
    });

    this.events.emit(EVENT_NAMES.CARD_UNCOMPLETED, {
      boardId: card.boardId,
      organizationId: tenant.organizationId,
      actorId: userId,
      cardId,
      listId: targetListId,
    });

    return updated;
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
        where: { listId, isArchived: false, completedAt: null, id: { not: skipCardId } },
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
        completedAt: null,
        id: { not: skipCardId },
        position: { gt: before.position },
      },
      orderBy: { position: 'asc' },
      select: { position: true },
    });

    return { beforePos: before.position, afterPos: next?.position ?? null };
  }
}
