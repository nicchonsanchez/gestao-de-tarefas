import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';

import { env } from '@/config/env';
import { PrismaService } from '@/common/prisma/prisma.service';
import { resolveBoardRole } from '@/modules/boards/board-permissions';
import type {
  BoardEventPayload,
  CardMovedPayload,
  CardCreatedPayload,
  CardUpdatedPayload,
  CardArchivedPayload,
  CardCompletedPayload,
  CardUncompletedPayload,
  ListCreatedPayload,
  ListUpdatedPayload,
  CommentAddedPayload,
  NotificationCreatedPayload,
  TimeEntryStartedPayload,
  TimeEntryStoppedPayload,
} from './events.types';
import { EVENT_NAMES } from './events.types';

interface AuthedSocket extends Socket {
  data: {
    userId: string;
    email: string;
    organizationId?: string;
  };
}

/**
 * Gateway Socket.IO do KTask.
 *
 * Conexão: cliente envia `auth.token` (access token JWT) no handshake.
 * Namespace padrão `/`. Canais:
 *   - `user:{userId}`  (auto-join no connect): notificações pessoais
 *   - `board:{boardId}`: cliente pede `board.join` com boardId;
 *                        gateway valida acesso via resolveBoardRole e adiciona ao room.
 *
 * Emissão: services disparam eventos via EventEmitter2 (`board.card.moved`, etc);
 * gateway escuta e broadcast no room correspondente.
 */
@WebSocketGateway({
  cors: {
    origin: env.CORS_ORIGINS,
    credentials: true,
  },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() io!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthedSocket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      extractBearer(client.handshake.headers.authorization);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string }>(token, {
        secret: env.JWT_ACCESS_SECRET,
      });
      client.data.userId = payload.sub;
      client.data.email = payload.email;

      // Auto-join ao canal pessoal
      await client.join(`user:${payload.sub}`);

      this.logger.log(`[connect] user=${payload.sub} sid=${client.id}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket) {
    if (client.data?.userId) {
      this.logger.log(`[disconnect] user=${client.data.userId} sid=${client.id}`);
    }
  }

  @SubscribeMessage('board.join')
  async onBoardJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { boardId: string; organizationId: string },
  ) {
    const { boardId, organizationId } = data ?? {};
    if (!boardId || !organizationId) {
      throw new UnauthorizedException('boardId e organizationId sao obrigatorios.');
    }

    const [board, membership] = await Promise.all([
      this.prisma.board.findUnique({
        where: { id: boardId },
        include: { members: { where: { userId: client.data.userId } } },
      }),
      this.prisma.membership.findUnique({
        where: {
          userId_organizationId: { userId: client.data.userId, organizationId },
        },
      }),
    ]);

    if (!board || board.organizationId !== organizationId || !membership) {
      return { ok: false, error: 'forbidden' };
    }

    const role = resolveBoardRole({
      orgRole: membership.role,
      boardMemberRole: board.members[0]?.role ?? null,
      boardVisibility: board.visibility,
    });

    if (!role) return { ok: false, error: 'forbidden' };

    await client.join(`board:${boardId}`);
    client.data.organizationId = organizationId;
    return { ok: true, role };
  }

  @SubscribeMessage('board.leave')
  async onBoardLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { boardId: string },
  ) {
    if (data?.boardId) await client.leave(`board:${data.boardId}`);
    return { ok: true };
  }

  // -----------------------------------------------------------------
  // Listeners: Board events → broadcast para room `board:{boardId}`
  // -----------------------------------------------------------------

  @OnEvent(EVENT_NAMES.CARD_CREATED)
  onCardCreated(payload: CardCreatedPayload) {
    this.broadcastBoard(payload, 'card.created', payload);
  }

  @OnEvent(EVENT_NAMES.CARD_MOVED)
  onCardMoved(payload: CardMovedPayload) {
    this.broadcastBoard(payload, 'card.moved', payload);
  }

  @OnEvent(EVENT_NAMES.CARD_UPDATED)
  onCardUpdated(payload: CardUpdatedPayload) {
    this.broadcastBoard(payload, 'card.updated', payload);
  }

  @OnEvent(EVENT_NAMES.CARD_ARCHIVED)
  onCardArchived(payload: CardArchivedPayload) {
    this.broadcastBoard(payload, 'card.archived', payload);
  }

  @OnEvent(EVENT_NAMES.CARD_COMPLETED)
  onCardCompleted(payload: CardCompletedPayload) {
    this.broadcastBoard(payload, 'card.completed', payload);
  }

  @OnEvent(EVENT_NAMES.CARD_UNCOMPLETED)
  onCardUncompleted(payload: CardUncompletedPayload) {
    this.broadcastBoard(payload, 'card.uncompleted', payload);
  }

  @OnEvent(EVENT_NAMES.LIST_CREATED)
  onListCreated(payload: ListCreatedPayload) {
    this.broadcastBoard(payload, 'list.created', payload);
  }

  @OnEvent(EVENT_NAMES.LIST_UPDATED)
  onListUpdated(payload: ListUpdatedPayload) {
    this.broadcastBoard(payload, 'list.updated', payload);
  }

  @OnEvent(EVENT_NAMES.COMMENT_ADDED)
  onCommentAdded(payload: CommentAddedPayload) {
    this.broadcastBoard(payload, 'comment.added', payload);
  }

  @OnEvent(EVENT_NAMES.NOTIFICATION_CREATED)
  onNotificationCreated(payload: NotificationCreatedPayload) {
    this.io.to(`user:${payload.userId}`).emit('notification.created', payload);
  }

  @OnEvent(EVENT_NAMES.TIME_ENTRY_STARTED)
  onTimeEntryStarted(payload: TimeEntryStartedPayload) {
    this.broadcastBoard(payload, 'time.entry.started', payload);
    this.io.to(`user:${payload.userId}`).emit('time.entry.started', payload);
  }

  @OnEvent(EVENT_NAMES.TIME_ENTRY_STOPPED)
  onTimeEntryStopped(payload: TimeEntryStoppedPayload) {
    this.broadcastBoard(payload, 'time.entry.stopped', payload);
    this.io.to(`user:${payload.userId}`).emit('time.entry.stopped', payload);
  }

  // -----------------------------------------------------------------

  private broadcastBoard(origin: BoardEventPayload, channel: string, payload: unknown) {
    this.io.to(`board:${origin.boardId}`).emit(channel, payload);
  }
}

function extractBearer(header: string | string[] | undefined): string | null {
  if (!header) return null;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice('Bearer '.length);
}
