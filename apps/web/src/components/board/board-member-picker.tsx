'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Plus, Search, X } from 'lucide-react';

import { orgMembersQuery } from '@/lib/queries/cards';
import {
  addBoardMember,
  boardsQueries,
  removeBoardMember,
  type BoardDetail,
} from '@/lib/queries/boards';
import { UserAvatar } from '@/components/user-avatar';
import { ApiError } from '@/lib/api-client';

type BoardMembers = BoardDetail['members'];

export function BoardMemberPicker({
  boardId,
  members,
  variant = 'inline',
}: {
  boardId: string;
  members: BoardMembers;
  variant?: 'inline' | 'compact';
}) {
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const queryClient = useQueryClient();

  const orgMembers = useQuery(orgMembersQuery);

  const assignedIds = useMemo(() => new Set(members.map((m) => m.user.id)), [members]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: boardsQueries.detail(boardId).queryKey });
  }

  const addMut = useMutation({
    mutationFn: (userId: string) => addBoardMember(boardId, userId),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Erro ao adicionar.'),
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) => removeBoardMember(boardId, userId),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Erro ao remover.'),
  });

  const filtered = useMemo(() => {
    const all = orgMembers.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (m) => m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q),
    );
  }, [orgMembers.data, query]);

  return (
    <div className="flex flex-col gap-3">
      {variant === 'inline' && (
        <ul className="flex flex-col gap-1.5">
          {members.length === 0 && (
            <li className="text-fg-muted text-xs">Nenhum membro no fluxo ainda.</li>
          )}
          {members.map((m) => (
            <li key={m.user.id} className="group/mem flex items-center gap-2 text-sm">
              <UserAvatar
                name={m.user.name}
                userId={m.user.id}
                avatarUrl={m.user.avatarUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.user.name}</p>
                <p className="text-fg-muted truncate text-[11px]">{m.user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => removeMut.mutate(m.user.id)}
                disabled={removeMut.isPending}
                className="text-fg-muted hover:text-danger rounded p-1 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/mem:opacity-100"
                aria-label={`Remover ${m.user.name}`}
                title="Remover do fluxo"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-border/70 flex items-center gap-2 rounded-md border px-2 py-1.5">
        <Search size={13} className="text-fg-muted shrink-0" />
        <input
          autoFocus={variant === 'compact'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>

      <div className="max-h-64 overflow-y-auto">
        {orgMembers.isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={14} className="text-fg-muted animate-spin" />
          </div>
        )}
        {!orgMembers.isLoading && filtered.length === 0 && (
          <p className="text-fg-muted py-3 text-center text-xs">
            {query ? 'Nenhum membro encontrado.' : 'Nenhum membro disponível.'}
          </p>
        )}
        <ul className="flex flex-col">
          {filtered.map((m) => {
            const already = assignedIds.has(m.userId);
            return (
              <li key={m.userId}>
                <button
                  type="button"
                  onClick={() => {
                    if (already) {
                      removeMut.mutate(m.userId);
                    } else {
                      addMut.mutate(m.userId);
                    }
                  }}
                  disabled={addMut.isPending || removeMut.isPending}
                  className="hover:bg-bg-muted flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
                >
                  <UserAvatar
                    name={m.user.name}
                    userId={m.user.id}
                    avatarUrl={m.user.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.user.name}</p>
                    <p className="text-fg-muted truncate text-[11px]">{m.user.email}</p>
                  </div>
                  {already && (
                    <span className="text-primary inline-flex items-center gap-1 text-[11px] font-medium">
                      <Check size={13} />
                      No fluxo
                    </span>
                  )}
                  {!already && <Plus size={13} className="text-fg-muted shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
