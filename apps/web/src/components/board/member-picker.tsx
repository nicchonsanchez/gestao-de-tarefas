'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Plus, Search, X } from 'lucide-react';

import {
  assignMember,
  cardsQueries,
  orgMembersQuery,
  unassignMember,
  type CardDetail,
} from '@/lib/queries/cards';
import { UserAvatar } from '@/components/user-avatar';
import { ApiError } from '@/lib/api-client';

export function MemberPicker({
  card,
  boardId,
}: {
  card: Pick<CardDetail, 'id' | 'members'>;
  boardId: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const membersQuery = useQuery({ ...orgMembersQuery, enabled: open });

  const assignedIds = useMemo(() => new Set(card.members.map((m) => m.userId)), [card.members]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: cardsQueries.detail(card.id).queryKey });
    queryClient.invalidateQueries({ queryKey: ['boards', boardId] });
  }

  const assignMut = useMutation({
    mutationFn: (userId: string) => assignMember(card.id, userId),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Erro ao atribuir.'),
  });

  const unassignMut = useMutation({
    mutationFn: (userId: string) => unassignMember(card.id, userId),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Erro ao remover.'),
  });

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const members = membersQuery.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q),
    );
  }, [membersQuery.data, query]);

  return (
    <div className="flex flex-col gap-2">
      {card.members.length === 0 ? (
        <p className="text-fg-muted text-xs">Nenhum contato atribuído.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {card.members.map((m) => (
            <li key={m.userId} className="group/mem flex items-center gap-2 text-xs">
              <UserAvatar
                name={m.user.name}
                userId={m.user.id}
                avatarUrl={m.user.avatarUrl}
                size="sm"
              />
              <span className="min-w-0 flex-1 truncate">{m.user.name}</span>
              <button
                type="button"
                onClick={() => unassignMut.mutate(m.userId)}
                disabled={unassignMut.isPending}
                className="text-fg-muted hover:text-danger rounded p-0.5 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/mem:opacity-100"
                aria-label={`Remover ${m.user.name}`}
                title="Remover do card"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setQuery('');
          }}
          className="border-border/70 text-fg-muted hover:text-primary hover:border-primary/50 inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs font-medium transition-colors"
        >
          <Plus size={12} />
          Adicionar contato
        </button>
        {open && (
          <div className="border-border bg-bg absolute left-0 top-full z-30 mt-1 flex w-64 flex-col overflow-hidden rounded-md border shadow-lg">
            <div className="border-border/70 flex items-center gap-2 border-b px-2 py-1.5">
              <Search size={12} className="text-fg-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="w-full bg-transparent text-xs focus:outline-none"
              />
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {membersQuery.isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={14} className="text-fg-muted animate-spin" />
                </div>
              )}
              {!membersQuery.isLoading && filtered.length === 0 && (
                <p className="text-fg-muted px-2 py-3 text-center text-xs">
                  {query ? 'Nenhum membro encontrado.' : 'Nenhum membro disponível.'}
                </p>
              )}
              {filtered.map((m) => {
                const alreadyAssigned = assignedIds.has(m.userId);
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => {
                      if (alreadyAssigned) {
                        unassignMut.mutate(m.userId);
                      } else {
                        assignMut.mutate(m.userId);
                      }
                    }}
                    className="hover:bg-bg-muted flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs"
                  >
                    <UserAvatar
                      name={m.user.name}
                      userId={m.user.id}
                      avatarUrl={m.user.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{m.user.name}</p>
                      <p className="text-fg-muted truncate text-[10px]">{m.user.email}</p>
                    </div>
                    {alreadyAssigned && <Check size={13} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
