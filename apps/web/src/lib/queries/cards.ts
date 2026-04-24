import { api } from '@/lib/api-client';
import type { CardListItem } from './boards';

export interface CardDetail {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  description: unknown | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  estimateMinutes: number | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  list: { id: string; name: string; boardId: string };
  members: Array<{
    cardId: string;
    userId: string;
    user: { id: string; name: string; email: string; avatarUrl: string | null };
  }>;
  labels: Array<{
    cardId: string;
    labelId: string;
    label: { id: string; name: string; color: string };
  }>;
  checklists: Array<{
    id: string;
    title: string;
    position: number;
    items: Array<{
      id: string;
      text: string;
      isDone: boolean;
      position: number;
      dueDate: string | null;
    }>;
  }>;
  attachments: Array<{ id: string; fileName: string; mimeType: string; sizeBytes: number }>;
  comments: CommentNode[];
  activities: ActivityNode[];
  _count: { children: number };
}

export interface CommentNode {
  id: string;
  cardId: string;
  authorId: string;
  body: unknown;
  mentions: string[];
  editedAt: string | null;
  createdAt: string;
  deletedAt: string | null;
  author: { id: string; name: string; email: string; avatarUrl: string | null };
}

export interface ActivityNode {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  actor: { id: string; name: string; email: string; avatarUrl: string | null } | null;
}

export const cardsQueries = {
  detail: (cardId: string) => ({
    queryKey: ['cards', cardId] as const,
    queryFn: () => api.get<CardDetail>(`/api/v1/cards/${cardId}`),
    enabled: Boolean(cardId),
  }),
};

export interface UpdateCardInput {
  title?: string;
  description?: unknown | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  estimateMinutes?: number | null;
}

export function updateCard(cardId: string, input: UpdateCardInput) {
  return api.patch<CardListItem>(`/api/v1/cards/${cardId}`, input);
}

export function archiveCard(cardId: string) {
  return api.delete(`/api/v1/cards/${cardId}`);
}

export function assignMember(cardId: string, userId: string) {
  return api.post(`/api/v1/cards/${cardId}/members`, { userId });
}

export function unassignMember(cardId: string, userId: string) {
  return api.delete(`/api/v1/cards/${cardId}/members/${userId}`);
}

export interface OrgMember {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'GESTOR' | 'MEMBER' | 'GUEST';
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

export const orgMembersQuery = {
  queryKey: ['org-members'] as const,
  queryFn: () => api.get<OrgMember[]>('/api/v1/organizations/members'),
};

export function createComment(input: { cardId: string; plainText: string }) {
  return api.post<CommentNode>('/api/v1/comments', input);
}

export function updateComment(commentId: string, input: { plainText: string }) {
  return api.patch<CommentNode>(`/api/v1/comments/${commentId}`, input);
}

export function deleteComment(commentId: string) {
  return api.delete(`/api/v1/comments/${commentId}`);
}
