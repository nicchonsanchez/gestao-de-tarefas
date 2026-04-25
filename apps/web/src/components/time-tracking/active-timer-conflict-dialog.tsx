'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '@ktask/ui';
import { startTimer, stopTimer, formatDuration } from '@/lib/queries/time-tracking';
import { ApiError } from '@/lib/api-client';
import { useTimerStore } from '@/stores/timer-store';

/**
 * Diálogo "Existe um timer ativo" — ver doc 18 §2b.
 * Aberto via useTimerStore.openConflict() de qualquer ponto do app.
 */
export function ActiveTimerConflictDialog() {
  const queryClient = useQueryClient();
  const { conflict, closeConflict } = useTimerStore((s) => ({
    conflict: s.conflict,
    closeConflict: s.closeConflict,
  }));
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!conflict) return;
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [conflict]);

  const stopAndStartMut = useMutation({
    mutationFn: async () => {
      if (!conflict) return;
      await stopTimer(conflict.active.id);
      await startTimer(conflict.target.cardId, conflict.target.note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-tracking'] });
      conflict?.onResolved?.();
      closeConflict();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Falha ao trocar de cronômetro.');
    },
  });

  if (!conflict) return null;

  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - new Date(conflict.active.startedAt).getTime()) / 1000),
  );
  void tick;

  return (
    <Dialog open onOpenChange={(open) => !open && closeConflict()}>
      <DialogContent hideClose className="max-w-md gap-0 p-0">
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <DialogTitle className="text-base font-semibold">Existe um timer ativo</DialogTitle>
          <button
            type="button"
            onClick={() => closeConflict()}
            className="text-fg-muted hover:bg-bg-muted rounded p-1"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-3 px-5 pb-5">
          <p className="text-fg-muted text-sm leading-relaxed">
            Para ativar o timetracking em um novo card, você precisa parar o timer ativo no momento.
            Deseja manter o timer atual em andamento?
          </p>
          <div className="border-border/70 bg-bg-subtle rounded-md border px-3 py-2 text-xs">
            <p className="text-fg-muted text-[10px] uppercase tracking-wide">Atualmente em</p>
            <p className="truncate font-medium">{conflict.active.cardTitle}</p>
            <p className="text-fg-muted text-[11px]">
              {conflict.active.boardName} ·{' '}
              <span className="font-mono tabular-nums">{formatDuration(elapsed)}</span>
            </p>
          </div>
          {error && (
            <p className="bg-danger-subtle text-danger rounded-md px-3 py-2 text-xs">{error}</p>
          )}
          <div className="border-border/70 mt-1 flex items-center justify-end gap-2 border-t pt-3">
            <button
              type="button"
              onClick={() => stopAndStartMut.mutate()}
              disabled={stopAndStartMut.isPending}
              className="text-fg-muted hover:text-fg text-sm font-medium disabled:opacity-50"
            >
              {stopAndStartMut.isPending && (
                <Loader2 size={14} className="mr-1.5 inline animate-spin" />
              )}
              Parar e iniciar no novo card
            </button>
            <button
              type="button"
              onClick={() => closeConflict()}
              disabled={stopAndStartMut.isPending}
              className="bg-primary text-primary-fg hover:bg-primary-hover rounded-md px-4 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              Manter o timer atual em andamento
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
