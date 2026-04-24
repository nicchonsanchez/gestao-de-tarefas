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
      className={`bg-bg-muted flex h-full w-[280px] shrink-0 flex-col rounded-lg ${
        isOver ? 'ring-primary/50 ring-2' : ''
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{list.name}</h2>
          <span className="bg-bg-emphasis text-fg-muted rounded-full px-1.5 text-xs">
            {list.cards.length}
          </span>
        </div>
      </div>

      <div className="flex min-h-[60px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {children}
      </div>

      <div className="px-2 pb-2">
        {draft === null ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setDraft('')}
          >
            <Plus size={14} />
            Adicionar card
          </Button>
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
    </div>
  );
}
