import { api } from '@/lib/api-client';

export interface SearchResult {
  cards: Array<{
    id: string;
    title: string;
    boardId: string;
    boardName: string;
    listName: string;
    isCompleted: boolean;
  }>;
  boards: Array<{
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  }>;
}

export function searchGlobal(q: string) {
  const qs = new URLSearchParams({ q });
  return api.get<SearchResult>(`/api/v1/search?${qs.toString()}`);
}
