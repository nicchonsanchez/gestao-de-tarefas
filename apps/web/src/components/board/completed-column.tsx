'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { CheckCircle2, Eye } from 'lucide-react';
import { CompletedDrawer } from './completed-drawer';

export const COMPLETED_DROPPABLE_ID = '__completed__';

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
      <div
        ref={setNodeRef}
        className={`bg-bg-muted flex h-full w-[280px] shrink-0 flex-col rounded-lg ${
          isOver ? 'ring-accent/60 ring-2' : ''
        }`}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-accent" />
            <h2 className="text-sm font-semibold">Finalizado</h2>
            <span className="bg-accent/15 text-accent rounded-full px-1.5 text-xs font-medium">
              {completedCount}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-6 text-center">
          <div className="bg-accent/15 text-accent flex size-10 items-center justify-center rounded-full">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-fg-muted text-xs">Quantidade de cards finalizados</p>
            <p className="text-accent mt-0.5 text-2xl font-semibold tabular-nums">
              {completedCount}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="border-border hover:border-border-strong bg-bg inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors"
          >
            <Eye size={14} />
            Visualizar todos
          </button>
        </div>

        <div className="text-fg-muted px-3 pb-3 text-center text-[10px]">
          Arraste um card aqui para finalizar
        </div>
      </div>

      <CompletedDrawer boardId={boardId} open={open} onOpenChange={setOpen} />
    </>
  );
}
