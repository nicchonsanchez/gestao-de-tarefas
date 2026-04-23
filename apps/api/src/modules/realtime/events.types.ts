/**
 * Eventos de dominio emitidos via Nest EventEmitter2.
 * O RealtimeGateway escuta todos os eventos `board.*` e faz broadcast
 * para o room `board:{boardId}`. Clientes na sala recebem via Socket.IO.
 *
 * Nome do evento tem sufixo que vira o canal Socket.IO para o cliente
 * (ex: 'board.card.moved' → cliente ouve 'card.moved').
 */
export interface BoardEventPayload {
  boardId: string;
  organizationId: string;
  actorId?: string;
}

export interface CardMovedPayload extends BoardEventPayload {
  cardId: string;
  fromListId: string;
  toListId: string;
  position: number;
}

export interface CardCreatedPayload extends BoardEventPayload {
  cardId: string;
  listId: string;
  title: string;
}

export interface CardUpdatedPayload extends BoardEventPayload {
  cardId: string;
}

export interface CardArchivedPayload extends BoardEventPayload {
  cardId: string;
}

export interface ListCreatedPayload extends BoardEventPayload {
  listId: string;
}

export interface ListUpdatedPayload extends BoardEventPayload {
  listId: string;
}

export interface CommentAddedPayload extends BoardEventPayload {
  cardId: string;
  commentId: string;
}

/**
 * Eventos pessoais direcionados a usuário específico.
 * Room Socket.IO: `user:{userId}`.
 */
export interface UserEventPayload {
  userId: string;
  organizationId: string;
}

export interface NotificationCreatedPayload extends UserEventPayload {
  notificationId: string;
}

// Mapping helper — normaliza nome do evento para o canal do cliente
export const EVENT_NAMES = {
  CARD_CREATED: 'board.card.created',
  CARD_MOVED: 'board.card.moved',
  CARD_UPDATED: 'board.card.updated',
  CARD_ARCHIVED: 'board.card.archived',
  LIST_CREATED: 'board.list.created',
  LIST_UPDATED: 'board.list.updated',
  COMMENT_ADDED: 'board.comment.added',
  NOTIFICATION_CREATED: 'user.notification.created',
} as const;
