'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { CheckCircle2 } from 'lucide-react';
import { CompletedDrawer } from './completed-drawer';

export const COMPLETED_DROPPABLE_ID = '__completed__';

/**
 * Faixa compacta no fim do quadro (estilo Ummense). Não é uma coluna cheia
 * pra não comer espaço horizontal.
 *   - Idle: ~56px de largura com ícone check + contagem na vertical
 *   - Hover: expande suavemente e revela o rótulo "Finalizado"
 *   - Drop aceita card → dispara finalização
 *   - Click abre o drawer com a lista completa
 */
export function CompletedColumn({
  boardId,
  completedCount,
}: {
  boardId: string;
  completedCount: number;
}) {
  const [open, setOpen] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: COMPLETED_DROPPABLE_ID });

  return (
    <>
      <button
        ref={setNodeRef}
        type="button"
        onClick={() => setOpen(true)}
        title={`${completedCount} card${completedCount === 1 ? '' : 's'} finalizado${completedCount === 1 ? '' : 's'} — clique para ver todos`}
        aria-label={`Ver cards finalizados (${completedCount})`}
        className={`group/completed bg-bg-muted hover:bg-bg-emphasis flex h-full w-14 shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-lg py-3 transition-all duration-200 hover:w-36 ${
          isOver ? 'ring-accent/60 w-36 ring-2' : ''
        }`}
      >
        <div className="bg-accent/15 text-accent flex size-9 items-center justify-center rounded-full">
          <CheckCircle2 size={18} />
        </div>
        <span className="text-accent text-lg font-semibold tabular-nums">{completedCount}</span>
        <span className="text-fg-muted max-h-0 overflow-hidden text-[11px] font-medium uppercase tracking-wide opacity-0 transition-all duration-200 group-hover/completed:max-h-6 group-hover/completed:opacity-100">
          Finalizado
        </span>
        <span className={`text-fg-subtle text-[9px] ${isOver ? 'text-accent font-medium' : ''}`}>
          {isOver ? 'Solte aqui' : ''}
        </span>
      </button>

      <CompletedDrawer boardId={boardId} open={open} onOpenChange={setOpen} />
    </>
  );
}
