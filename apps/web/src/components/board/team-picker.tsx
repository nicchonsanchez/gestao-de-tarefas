'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, UsersRound, X } from 'lucide-react';

import {
  assignMember,
  cardsQueries,
  orgMembersQuery,
  unassignMember,
  type CardDetail,
} from '@/lib/queries/cards';
import { UserAvatar } from '@/components/user-avatar';
import { ApiError } from '@/lib/api-client';

/**
 * Picker inline de equipe do card — segue o padrão Ummense:
 * botão "team+" colorido em primary que abre popover com chips dos membros
 * já adicionados (cada um com X) + busca pra adicionar novos.
 */
export function TeamPicker({
  card,
  boardId,
}: {
  card: Pick<CardDetail, 'id' | 'members' | 'leadId'>;
  boardId: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
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
      setQuery('');
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
    const base = q
      ? members.filter(
          (m) => m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q),
        )
      : members;
    return base.filter((m) => !assignedIds.has(m.userId));
  }, [membersQuery.data, query, assignedIds]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setQuery('');
        }}
        className="bg-primary/10 text-primary hover:bg-primary/20 flex size-6 items-center justify-center rounded-full transition-colors"
        title="Adicionar/remover membros da equipe"
        aria-label="Adicionar membros à equipe do card"
      >
        <UsersRound size={13} />
      </button>
      {open && (
        <div className="border-border bg-bg absolute left-0 top-full z-30 mt-1 flex w-[min(20rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-md border shadow-lg">
          <div className="border-border/70 flex items-start justify-between gap-2 border-b px-3 py-2.5">
            <div className="flex items-start gap-2">
              <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full">
                <UsersRound size={13} />
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">Equipe do card</p>
                <p className="text-fg-muted text-[11px] leading-tight">
                  Adicione ou remova usuários e equipes com facilidade.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-fg-muted hover:bg-bg-muted hover:text-fg shrink-0 rounded p-0.5"
              aria-label="Fechar"
            >
              <X size={13} />
            </button>
          </div>

          <div className="border-border/70 flex flex-wrap items-center gap-1.5 border-b px-3 py-2">
            {card.members.map((m) => (
              <span
                key={m.userId}
                className="bg-bg-muted inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1.5 text-xs"
              >
                <UserAvatar
                  name={m.user.name}
                  userId={m.user.id}
                  avatarUrl={m.user.avatarUrl}
                  size="sm"
                />
                <span className="max-w-[140px] truncate">{m.user.name}</span>
                <button
                  type="button"
                  onClick={() => unassignMut.mutate(m.userId)}
                  disabled={unassignMut.isPending}
                  className="text-fg-muted hover:text-danger rounded transition-colors"
                  aria-label={`Remover ${m.user.name}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={card.members.length === 0 ? 'Buscar pessoa...' : ''}
              className="min-w-[80px] flex-1 bg-transparent text-xs focus:outline-none"
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
                {query ? 'Nenhum resultado.' : 'Todos já estão na equipe.'}
              </p>
            )}
            {filtered.map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() => assignMut.mutate(m.userId)}
                disabled={assignMut.isPending}
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
              </button>
            ))}
          </div>

          {error && (
            <p className="text-danger border-border/70 border-t px-3 py-2 text-xs">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
