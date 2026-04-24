'use client';

import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, RotateCcw, X } from 'lucide-react';

import {
  boardsQueries,
  fetchCompletedCards,
  uncompleteCard,
  type CompletedCardsPage,
} from '@/lib/queries/boards';

export function CompletedDrawer({
  boardId,
  open,
  onOpenChange,
}: {
  boardId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const query = useInfiniteQuery({
    queryKey: ['boards', boardId, 'completed'],
    queryFn: ({ pageParam }) => fetchCompletedCards(boardId, { limit: 30, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last: CompletedCardsPage) => last.nextCursor,
    enabled: open,
  });

  const restore = useMutation({
    mutationFn: (cardId: string) => uncompleteCard(cardId),
    onMutate: (cardId) => setRestoringId(cardId),
    onSettled: () => {
      setRestoringId(null);
      queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'completed'] });
      queryClient.invalidateQueries({ queryKey: boardsQueries.detail(boardId).queryKey });
    },
  });

  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((p) => p.items);
  const total = items.length; // aproximação; usa o completedCount do board no header

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-fade-in fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content className="bg-bg border-border fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l shadow-xl">
          <div className="border-border flex items-center justify-between border-b px-5 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-accent" />
              <DialogPrimitive.Title className="text-base font-semibold">
                Cards finalizados
              </DialogPrimitive.Title>
              {total > 0 && (
                <span className="text-fg-muted text-xs">
                  ({total}
                  {query.hasNextPage ? '+' : ''})
                </span>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="text-fg-muted hover:text-fg focus-visible:ring-primary rounded-md p-1 focus-visible:outline-none focus-visible:ring-2"
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3">
            {query.isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={18} className="text-fg-muted animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-fg-muted flex flex-col items-center justify-center py-16 text-center text-sm">
                <CheckCircle2 size={32} className="text-fg-muted mb-2 opacity-50" />
                <p>Nenhum card finalizado ainda.</p>
                <p className="mt-1 text-xs">
                  Arraste um card para a coluna Finalizado para começar.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((c) => (
                  <li
                    key={c.id}
                    className="border-border bg-bg-subtle flex items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <div className="text-fg-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span>
                          Finalizado em{' '}
                          {new Date(c.completedAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {c.completedBy && <span>por {c.completedBy.name}</span>}
                        <span>
                          Origem:{' '}
                          <span className={c.list.isArchived ? 'italic' : ''}>
                            {c.list.name}
                            {c.list.isArchived ? ' (arquivada)' : ''}
                          </span>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => restore.mutate(c.id)}
                      disabled={restoringId === c.id}
                      className="text-fg-muted hover:text-fg focus-visible:ring-primary inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
                      title="Restaurar card"
                    >
                      {restoringId === c.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <RotateCcw size={12} />
                      )}
                      Restaurar
                    </button>
                  </li>
                ))}
                {query.hasNextPage && (
                  <li className="flex justify-center py-2">
                    <button
                      type="button"
                      onClick={() => query.fetchNextPage()}
                      disabled={query.isFetchingNextPage}
                      className="text-fg-muted hover:text-fg text-xs font-medium disabled:opacity-50"
                    >
                      {query.isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
