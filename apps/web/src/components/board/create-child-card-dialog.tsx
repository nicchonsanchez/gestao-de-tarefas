'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Loader2, X } from 'lucide-react';

import { Dialog, DialogContent, DialogTitle, Input, Label } from '@ktask/ui';
import { boardsQueries, type BoardListItem } from '@/lib/queries/boards';
import {
  cardFamilyQuery,
  cardsQueries,
  createChildCard,
  type CardDetail,
  type CreateChildInput,
} from '@/lib/queries/cards';
import { ApiError } from '@/lib/api-client';

const TOGGLES: Array<{ key: keyof CreateChildInput; label: string }> = [
  { key: 'copyLead', label: 'Líder' },
  { key: 'copyTeam', label: 'Equipe' },
  { key: 'copyTags', label: 'Tags' },
  { key: 'copyDueDate', label: 'Prazo' },
];

export function CreateChildCardDialog({
  parent,
  open,
  onOpenChange,
}: {
  parent: CardDetail;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [opts, setOpts] = useState<Record<string, boolean>>({});
  const [boardSel, setBoardSel] = useState<BoardListItem | null>(null);
  const [listSel, setListSel] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle('');
      setOpts({});
      setBoardSel(null);
      setListSel(null);
      setError(null);
    }
  }, [open]);

  const mut = useMutation({
    mutationFn: () =>
      createChildCard(parent.id, {
        title: title.trim(),
        ...opts,
        targetBoardId: boardSel?.id ?? null,
        targetListId: listSel?.id ?? null,
      } as CreateChildInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardFamilyQuery(parent.id).queryKey });
      queryClient.invalidateQueries({ queryKey: cardsQueries.detail(parent.id).queryKey });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      onOpenChange(false);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar card filho.');
    },
  });

  const canSubmit =
    title.trim().length > 0 && !mut.isPending && ((!boardSel && !listSel) || (boardSel && listSel));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="max-w-md gap-0 p-0">
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
          <div>
            <DialogTitle className="text-base font-semibold">Criar card filho</DialogTitle>
            <p className="text-fg-muted mt-1 text-xs">
              O novo card ficará vinculado a "{parent.title}".
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-fg-muted hover:bg-bg-muted rounded p-1"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 pb-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="child-title">Nome do card filho</Label>
            <Input
              id="child-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Subir Chatwoot"
              maxLength={500}
            />
          </div>

          <div className="border-border/70 mt-1 flex flex-col gap-2 border-t pt-3">
            <p className="text-fg-muted text-[11px] font-semibold uppercase tracking-wide">
              Copiar do pai
            </p>
            {TOGGLES.map((t) => (
              <label key={t.key} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={!!opts[t.key]}
                  onChange={() => setOpts((prev) => ({ ...prev, [t.key]: !prev[t.key as string] }))}
                />
                <span>{t.label}</span>
              </label>
            ))}
          </div>

          <div className="border-border/70 mt-1 flex flex-col gap-2 border-t pt-3">
            <p className="text-fg text-sm font-semibold">
              Vincular card filho a um fluxo (opcional)
            </p>
            <p className="text-fg-muted text-[11px]">Vazio = mesmo fluxo e coluna do pai.</p>
            <BoardCombobox
              value={boardSel}
              onChange={(b) => {
                setBoardSel(b);
                setListSel(null);
              }}
            />
            {boardSel && (
              <ListCombobox boardId={boardSel.id} value={listSel} onChange={setListSel} />
            )}
          </div>

          {error && (
            <p className="bg-danger-subtle text-danger rounded-md px-3 py-2 text-xs">{error}</p>
          )}

          <div className="border-border/70 mt-1 flex items-center justify-end gap-2 border-t pt-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-fg-muted hover:text-fg text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => mut.mutate()}
              disabled={!canSubmit}
              className="bg-primary text-primary-fg hover:bg-primary-hover inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mut.isPending && <Loader2 size={14} className="animate-spin" />}
              Criar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange?: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="checkbox"
      aria-checked={checked}
      className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
        checked
          ? 'bg-primary border-primary text-primary-fg'
          : 'border-border bg-bg hover:border-border-strong'
      }`}
    >
      {checked && <Check size={11} />}
    </button>
  );
}

function BoardCombobox({
  value,
  onChange,
}: {
  value: BoardListItem | null;
  onChange: (b: BoardListItem | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boardsQ = useQuery({ ...boardsQueries.all() });

  useEffect(() => {
    function click(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, [open]);

  const filtered = useMemo(() => {
    const items = (boardsQ.data ?? []).filter((b) => !b.isArchived);
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((b) => b.name.toLowerCase().includes(q));
  }, [boardsQ.data, query]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setQuery('');
        }}
        className="border-border bg-bg hover:border-border-strong flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm"
      >
        <span className={value ? 'text-fg' : 'text-fg-muted'}>
          {value ? value.name : 'Selecione um fluxo'}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="text-fg-muted hover:text-fg"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown size={14} className="text-fg-muted" />
        </div>
      </button>
      {open && (
        <div className="border-border bg-bg absolute left-0 right-0 top-full z-50 mt-1 flex max-h-72 flex-col overflow-hidden rounded-md border shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome do fluxo..."
            className="border-border/70 bg-bg border-b px-3 py-2 text-sm focus:outline-none"
          />
          <div className="overflow-y-auto py-1">
            {boardsQ.isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={14} className="text-fg-muted animate-spin" />
              </div>
            )}
            {!boardsQ.isLoading && filtered.length === 0 && (
              <p className="text-fg-muted px-3 py-3 text-center text-xs">
                {query ? 'Nenhum fluxo encontrado.' : 'Sem fluxos disponíveis.'}
              </p>
            )}
            {filtered.map((b) => {
              const isSelected = value?.id === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    onChange(b);
                    setOpen(false);
                  }}
                  className={`hover:bg-bg-muted flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                    isSelected ? 'bg-primary-subtle text-primary' : ''
                  }`}
                >
                  <span className="flex-1 truncate">{b.name}</span>
                  {isSelected && <Check size={13} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ListCombobox({
  boardId,
  value,
  onChange,
}: {
  boardId: string;
  value: { id: string; name: string } | null;
  onChange: (l: { id: string; name: string } | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const boardQ = useQuery({ ...boardsQueries.detail(boardId) });

  useEffect(() => {
    function click(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, [open]);

  const lists = boardQ.data?.lists ?? [];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="border-border bg-bg hover:border-border-strong flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm"
      >
        <span className={value ? 'text-fg' : 'text-fg-muted'}>
          {value ? value.name : 'Selecione a coluna'}
        </span>
        <ChevronDown size={14} className="text-fg-muted" />
      </button>
      {open && (
        <div className="border-border bg-bg absolute left-0 right-0 top-full z-50 mt-1 flex max-h-64 flex-col overflow-y-auto rounded-md border py-1 shadow-lg">
          {boardQ.isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={14} className="text-fg-muted animate-spin" />
            </div>
          )}
          {!boardQ.isLoading && lists.length === 0 && (
            <p className="text-fg-muted px-3 py-3 text-center text-xs">
              Esse fluxo não tem colunas.
            </p>
          )}
          {lists.map((l) => {
            const isSelected = value?.id === l.id;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  onChange({ id: l.id, name: l.name });
                  setOpen(false);
                }}
                className={`hover:bg-bg-muted flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                  isSelected ? 'bg-primary-subtle text-primary' : ''
                }`}
              >
                <span className="flex-1 truncate">{l.name}</span>
                {isSelected && <Check size={13} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
