import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PrismaService } from '@/common/prisma/prisma.service';
import type { TenantContext } from '@/common/tenant/tenant.types';
import { BoardAccessService } from '@/modules/boards/board-access.service';
import { EVENT_NAMES } from '@/modules/realtime/events.types';
import { StorageService } from '@/modules/storage/storage.service';

import { MAX_ATTACHMENT_SIZE } from './dto/attachment.schemas';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BoardAccessService,
    private readonly events: EventEmitter2,
    private readonly storage: StorageService,
  ) {}

  /**
   * Gera URL pré-assinada pra upload direto no storage.
   * Cliente faz PUT na uploadUrl; depois confirma com create().
   */
  async presignUpload(
    userId: string,
    tenant: TenantContext,
    cardId: string,
    input: { fileName: string; contentType: string; sizeBytes: number },
  ) {
    if (input.sizeBytes > MAX_ATTACHMENT_SIZE) {
      throw new BadRequestException('Arquivo grande demais (máx. 25MB).');
    }
    if (!this.storage.isEnabled()) {
      throw new ServiceUnavailableException('Armazenamento de arquivos não configurado.');
    }
    const card = await this.getCardOrThrow(cardId, tenant.organizationId);
    await this.access.assertAccess(userId, card.boardId, tenant, 'EDITOR');

    return this.storage.presignUpload({
      keyPrefix: `attachments/${card.boardId}/${cardId}`,
      contentType: input.contentType,
      maxSize: MAX_ATTACHMENT_SIZE,
      ttl: 300, // 5 min: arquivos maiores que avatar precisam de tempo
    });
  }

  async create(
    userId: string,
    tenant: TenantContext,
    cardId: string,
    input: { fileName: string; mimeType: string; sizeBytes: number; storageKey: string },
  ) {
    const card = await this.getCardOrThrow(cardId, tenant.organizationId);
    await this.access.assertAccess(userId, card.boardId, tenant, 'EDITOR');

    const kind = input.mimeType.startsWith('image/') ? 'IMAGE' : 'FILE';

    const attachment = await this.prisma.attachment.create({
      data: {
        cardId,
        uploaderId: userId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageKey: input.storageKey,
        kind,
      },
      include: { uploader: { select: { id: true, name: true, avatarUrl: true } } },
    });
    const hydrated = { ...attachment, publicUrl: this.storage.publicUrlFor(attachment.storageKey) };

    await this.prisma.activity.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: card.boardId,
        cardId,
        actorId: userId,
        type: 'ATTACHMENT_ADDED',
        payload: { attachmentId: attachment.id, fileName: attachment.fileName },
      },
    });

    this.events.emit(EVENT_NAMES.CARD_UPDATED, {
      boardId: card.boardId,
      organizationId: tenant.organizationId,
      actorId: userId,
      cardId,
    });

    return hydrated;
  }

  async remove(userId: string, tenant: TenantContext, attachmentId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { card: true },
    });
    if (!attachment || attachment.card.organizationId !== tenant.organizationId) {
      throw new NotFoundException('Anexo não encontrado.');
    }
    await this.access.assertAccess(userId, attachment.card.boardId, tenant, 'EDITOR');

    await this.prisma.attachment.delete({ where: { id: attachmentId } });

    await this.prisma.activity.create({
      data: {
        organizationId: tenant.organizationId,
        boardId: attachment.card.boardId,
        cardId: attachment.cardId,
        actorId: userId,
        type: 'ATTACHMENT_REMOVED',
        payload: { attachmentId, fileName: attachment.fileName },
      },
    });

    this.events.emit(EVENT_NAMES.CARD_UPDATED, {
      boardId: attachment.card.boardId,
      organizationId: tenant.organizationId,
      actorId: userId,
      cardId: attachment.cardId,
    });

    // Obs: o objeto no storage não é deletado aqui (bucket cresce; aceitável
    // por ora, depois colocamos job de GC pra remover órfãos)

    return { ok: true };
  }

  private async getCardOrThrow(cardId: string, organizationId: string) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card || card.organizationId !== organizationId) {
      throw new NotFoundException('Card não encontrado.');
    }
    return card;
  }
}
