import { api } from '@/lib/api-client';

export interface BoardListItem {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  visibility: 'PRIVATE' | 'ORGANIZATION';
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  cardsCount: number;
  membersCount: number;
}

export interface CardListItem {
  id: string;
  title: string;
  position: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  isArchived: boolean;
  members: Array<{ user: { id: string; name: string; avatarUrl: string | null } }>;
  labels: Array<{ label: { id: string; name: string; color: string } }>;
  _count: { comments: number; attachments: number; checklists: number };
}

export interface ListWithCards {
  id: string;
  name: string;
  position: number;
  color: string | null;
  wipLimit: number | null;
  cards: CardListItem[];
}

export interface BoardDetail {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  color: string | null;
  visibility: 'PRIVATE' | 'ORGANIZATION';
  isArchived: boolean;
  lists: ListWithCards[];
  labels: Array<{ id: string; name: string; color: string }>;
  members: Array<{
    id: string;
    role: 'ADMIN' | 'EDITOR' | 'COMMENTER' | 'VIEWER';
    user: { id: string; name: string; email: string; avatarUrl: string | null };
  }>;
}

export const boardsQueries = {
  all: () => ({
    queryKey: ['boards'] as const,
    queryFn: () => api.get<BoardListItem[]>('/api/v1/boards'),
  }),
  detail: (boardId: string) => ({
    queryKey: ['boards', boardId] as const,
    queryFn: () => api.get<BoardDetail>(`/api/v1/boards/${boardId}`),
  }),
};

export function createBoard(input: { name: string; description?: string; color?: string }) {
  return api.post<BoardListItem>('/api/v1/boards', input);
}

export function moveCard(cardId: string, input: { toListId: string; afterCardId: string | null }) {
  return api.patch(`/api/v1/cards/${cardId}/move`, input);
}

export function createCard(input: { listId: string; title: string }) {
  return api.post<{ id: string; title: string; listId: string; position: number }>(
    '/api/v1/cards',
    input,
  );
}
