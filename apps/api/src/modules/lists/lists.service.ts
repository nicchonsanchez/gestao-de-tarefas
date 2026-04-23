import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { computeInsertPosition } from '@/common/util/position';
import type { TenantContext } from '@/common/tenant/tenant.types';
import { BoardAccessService } from '@/modules/boards/board-access.service';

interface CreateListInput {
  boardId: string;
  name: string;
  position?: number;
}

interface UpdateListInput {
  name?: string;
  color?: string | null;
  icon?: string | null;
  wipLimit?: number | null;
  slaMinutes?: number | null;
}

interface MoveListInput {
  afterListId: string | null; // posicionar após esta lista (null = primeira posição)
}

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BoardAccessService,
  ) {}

  async create(userId: string, tenant: TenantContext, input: CreateListInput) {
    await this.access.assertAccess(userId, input.boardId, tenant, 'EDITOR');

    const last = await this.prisma.list.findFirst({
      where: { boardId: input.boardId, isArchived: false },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = input.position ?? computeInsertPosition(last?.position ?? null, null);

    const list = await this.prisma.list.create({
      data: {
        boardId: input.boardId,
        name: input.name,
        position,
      },
    });

    await this.prisma.activity.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: input.boardId,
        actorId: userId,
        type: 'LIST_CREATED',
        payload: { listId: list.id, name: list.name },
      },
    });

    return list;
  }

  async update(userId: string, tenant: TenantContext, listId: string, input: UpdateListInput) {
    const list = await this.getOneOrThrow(listId);
    await this.access.assertAccess(userId, list.boardId, tenant, 'EDITOR');

    const updated = await this.prisma.list.update({
      where: { id: listId },
      data: input,
    });

    await this.prisma.activity.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: list.boardId,
        actorId: userId,
        type: 'LIST_UPDATED',
        payload: { listId, input } as unknown as Prisma.InputJsonValue,
      },
    });

    return updated;
  }

  async move(userId: string, tenant: TenantContext, listId: string, input: MoveListInput) {
    const list = await this.getOneOrThrow(listId);
    await this.access.assertAccess(userId, list.boardId, tenant, 'EDITOR');

    const { beforePos, afterPos } = await this.resolveNeighbors(
      list.boardId,
      input.afterListId,
      listId,
    );
    const position = computeInsertPosition(beforePos, afterPos);

    return this.prisma.list.update({
      where: { id: listId },
      data: { position },
    });
  }

  async archive(userId: string, tenant: TenantContext, listId: string) {
    const list = await this.getOneOrThrow(listId);
    await this.access.assertAccess(userId, list.boardId, tenant, 'EDITOR');

    const updated = await this.prisma.list.update({
      where: { id: listId },
      data: { isArchived: true },
    });

    await this.prisma.activity.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: list.boardId,
        actorId: userId,
        type: 'LIST_ARCHIVED',
        payload: { listId },
      },
    });

    return updated;
  }

  private async getOneOrThrow(listId: string) {
    const list = await this.prisma.list.findUnique({ where: { id: listId } });
    if (!list) throw new NotFoundException('Lista não encontrada.');
    return list;
  }

  private async resolveNeighbors(
    boardId: string,
    afterListId: string | null,
    skipListId: string,
  ): Promise<{ beforePos: number | null; afterPos: number | null }> {
    if (afterListId === null) {
      const first = await this.prisma.list.findFirst({
        where: { boardId, isArchived: false, id: { not: skipListId } },
        orderBy: { position: 'asc' },
        select: { position: true },
      });
      return { beforePos: null, afterPos: first?.position ?? null };
    }

    const before = await this.prisma.list.findUnique({
      where: { id: afterListId },
      select: { position: true, boardId: true },
    });
    if (!before || before.boardId !== boardId) {
      throw new NotFoundException('Lista referência não encontrada no quadro.');
    }

    const next = await this.prisma.list.findFirst({
      where: {
        boardId,
        isArchived: false,
        id: { not: skipListId },
        position: { gt: before.position },
      },
      orderBy: { position: 'asc' },
      select: { position: true },
    });

    return { beforePos: before.position, afterPos: next?.position ?? null };
  }
}
