'use client';

import { useDroppable } from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@ktask/ui';
import { boardsQueries, createCard, type ListWithCards } from '@/lib/queries/boards';

export function ListColumn({ list, children }: { list: ListWithCards; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: list.id });
  const params = useParams<{ boardId: string }>();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (title: string) => createCard({ listId: list.id, title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardsQueries.detail(params.boardId).queryKey });
      setDraft('');
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-bg border-border/60 flex h-full w-[280px] shrink-0 flex-col rounded-lg border shadow-sm ${
        isOver ? 'ring-primary/40 ring-2' : ''
      }`}
    >
      <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{list.name}</h2>
          <span className="bg-bg-muted text-fg-muted rounded-full px-1.5 text-xs">
            {list.cards.length}
          </span>
        </div>
      </div>

      {/* Botão "Adicionar card" — sempre no topo, estilo Ummense:
          idle: barra discreta com só ícone no centro
          hover: expande, cor primária e texto "Adicionar card" */}
      <div className="px-2 pt-1">
        {draft === null ? (
          <button
            type="button"
            onClick={() => setDraft('')}
            className="group/add bg-primary-subtle text-primary hover:bg-primary hover:text-primary-fg flex h-8 w-full items-center justify-center overflow-hidden rounded-md text-xs font-medium transition-all duration-200 hover:h-9 hover:shadow-sm"
            aria-label="Adicionar card"
          >
            <span className="flex items-center gap-1.5">
              <Plus
                size={14}
                className="transition-transform duration-200 group-hover/add:rotate-90"
              />
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/add:max-w-[160px] group-hover/add:opacity-100">
                Adicionar card
              </span>
            </span>
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim().length === 0) return;
              mutation.mutate(draft.trim());
            }}
            className="flex flex-col gap-2"
          >
            <textarea
              autoFocus
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  (e.currentTarget.form as HTMLFormElement).requestSubmit();
                }
                if (e.key === 'Escape') setDraft(null);
              }}
              placeholder="Título do card"
              className="bg-bg border-border focus-visible:ring-primary w-full resize-none rounded-md border px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2"
            />
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={mutation.isPending}>
                Adicionar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="flex min-h-[60px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 pt-2">
        {children}
      </div>
    </div>
  );
}
