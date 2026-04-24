'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, Globe, Loader2, Lock } from 'lucide-react';

import { Button, Dialog, DialogContent, DialogTitle } from '@ktask/ui';
import { archiveBoard, boardsQueries, updateBoard, type BoardDetail } from '@/lib/queries/boards';
import { ApiError } from '@/lib/api-client';
import { BoardMemberPicker } from './board-member-picker';

type Visibility = 'PRIVATE' | 'ORGANIZATION';

export function BoardSettingsDialog({
  board,
  open,
  onOpenChange,
}: {
  board: BoardDetail;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState(board.description ?? '');
  const [visibility, setVisibility] = useState<Visibility>(board.visibility);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDescription(board.description ?? '');
      setVisibility(board.visibility);
      setError(null);
    }
  }, [open, board.description, board.visibility]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: boardsQueries.detail(board.id).queryKey });
    queryClient.invalidateQueries({ queryKey: ['boards'] });
  }

  const saveMut = useMutation({
    mutationFn: () =>
      updateBoard(board.id, {
        description: description.trim() ? description.trim() : null,
        visibility,
      }),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Erro ao salvar.'),
  });

  const archiveMut = useMutation({
    mutationFn: () => archiveBoard(board.id),
    onSuccess: () => {
      invalidate();
      window.location.href = '/quadros';
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Erro ao inativar.'),
  });

  const dirty = description !== (board.description ?? '') || visibility !== board.visibility;

  function handleSave(closeAfter: boolean) {
    saveMut.mutate(undefined, {
      onSuccess: () => {
        if (closeAfter) onOpenChange(false);
      },
    });
  }

  function handleArchive() {
    if (
      confirm(
        `Inativar o fluxo "${board.name}"? Ele sai da listagem de quadros mas pode ser restaurado depois.`,
      )
    ) {
      archiveMut.mutate();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[calc(100vh-4rem)] max-h-[760px] w-[calc(100vw-4rem)] max-w-[1100px] gap-0 overflow-hidden p-0">
        <div className="border-border flex items-center justify-between border-b px-6 py-3">
          <DialogTitle className="text-base">Configurações do fluxo</DialogTitle>
        </div>

        <div className="grid h-full grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-[1fr_320px]">
          {/* Coluna esquerda: configurações */}
          <div className="flex flex-col gap-5">
            <section className="border-border rounded-lg border p-4">
              <h2 className="mb-2 text-sm font-semibold">Descrição do fluxo</h2>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o propósito deste fluxo..."
                rows={4}
                className="border-border bg-bg focus-visible:ring-primary w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
              />
            </section>

            <section className="border-border rounded-lg border p-4">
              <h2 className="mb-3 text-sm font-semibold">Inativar fluxo</h2>
              <p className="text-fg-muted mb-3 text-xs">
                Fluxos inativos saem da listagem de quadros, mas podem ser restaurados depois. Os
                cards continuam preservados.
              </p>
              <Button
                variant="outline"
                onClick={handleArchive}
                disabled={archiveMut.isPending}
                className="text-danger border-danger/40 hover:bg-danger-subtle"
              >
                {archiveMut.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Archive size={14} />
                )}
                Inativar fluxo
              </Button>
            </section>
          </div>

          {/* Coluna direita: privacidade + equipe */}
          <div className="flex flex-col gap-5">
            <section className="border-border rounded-lg border p-4">
              <h2 className="mb-3 text-sm font-semibold">Privacidade</h2>
              <div className="flex flex-col gap-2">
                <VisibilityOption
                  label="Público"
                  description="Todos da organização podem acessar o fluxo."
                  icon={<Globe size={15} />}
                  selected={visibility === 'ORGANIZATION'}
                  onClick={() => setVisibility('ORGANIZATION')}
                />
                <VisibilityOption
                  label="Secreto"
                  description="Somente membros adicionados ao fluxo podem acessar."
                  icon={<Lock size={15} />}
                  selected={visibility === 'PRIVATE'}
                  onClick={() => setVisibility('PRIVATE')}
                />
              </div>
            </section>

            <section className="border-border rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Equipe do fluxo</h2>
                <span className="text-fg-muted text-[11px]">{board.members.length}</span>
              </div>
              <BoardMemberPicker boardId={board.id} members={board.members} />
            </section>

            <div className="flex flex-col gap-2">
              <Button onClick={() => handleSave(false)} disabled={!dirty || saveMut.isPending}>
                {saveMut.isPending && <Loader2 size={14} className="animate-spin" />}
                Salvar todas as alterações
              </Button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={!dirty || saveMut.isPending}
                className="text-primary hover:text-primary/80 text-sm font-medium disabled:opacity-50"
              >
                Salvar e fechar
              </button>
              {error && <p className="text-danger text-xs">{error}</p>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VisibilityOption({
  label,
  description,
  icon,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-2.5 rounded-md border px-3 py-2 text-left transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-bg-muted'
      }`}
      aria-pressed={selected}
    >
      <span className={`mt-0.5 shrink-0 ${selected ? 'text-primary' : 'text-fg-muted'}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-fg-muted text-[11px]">{description}</p>
      </div>
    </button>
  );
}
