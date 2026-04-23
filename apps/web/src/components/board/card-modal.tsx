'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '@ktask/ui';
import { cardsQueries, updateCard, type CardDetail } from '@/lib/queries/cards';
import { proseToPlainText } from '@/lib/prose';
import { CommentThread } from './comment-thread';
import { CardSidebar } from './card-sidebar';

/**
 * Modal de detalhe do card. Abre quando searchParams.card está presente.
 * Layout: 2/3 conteúdo (título + descrição + comentários), 1/3 sidebar.
 */
export function CardModal({ boardId }: { boardId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const cardId = params.get('card');

  const query = useQuery({
    ...cardsQueries.detail(cardId ?? ''),
    enabled: Boolean(cardId),
  });

  function close() {
    const next = new URLSearchParams(params.toString());
    next.delete('card');
    router.replace(next.size ? `?${next.toString()}` : `/b/${boardId}`, { scroll: false });
  }

  return (
    <Dialog open={Boolean(cardId)} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-5xl p-0">
        {query.isLoading && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 size={20} className="text-fg-muted animate-spin" />
          </div>
        )}
        {query.data && <CardModalContent card={query.data} boardId={boardId} onClose={close} />}
        {!query.isLoading && !query.data && (
          <div className="p-8">
            <DialogTitle>Card não encontrado</DialogTitle>
            <p className="text-fg-muted mt-2 text-sm">
              Pode ter sido arquivado ou você não tem acesso.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CardModalContent({
  card,
  boardId,
  onClose,
}: {
  card: CardDetail;
  boardId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(card.title);
  useEffect(() => setTitle(card.title), [card.title]);

  const titleMut = useMutation({
    mutationFn: (next: string) => updateCard(card.id, { title: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardsQueries.detail(card.id).queryKey });
      queryClient.invalidateQueries({ queryKey: ['boards', boardId] });
    },
  });

  const [description, setDescription] = useState(proseToPlainText(card.description));
  useEffect(() => setDescription(proseToPlainText(card.description)), [card.description]);

  const descMut = useMutation({
    mutationFn: (plain: string) => updateCard(card.id, { description: plainTextToDoc(plain) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardsQueries.detail(card.id).queryKey });
      queryClient.invalidateQueries({ queryKey: ['boards', boardId] });
    },
  });

  return (
    <div className="grid max-h-[85vh] grid-cols-1 gap-0 md:grid-cols-[1fr_320px]">
      <div className="flex flex-col overflow-y-auto px-6 pb-6 pt-8">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const v = title.trim();
            if (v && v !== card.title) titleMut.mutate(v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="bg-transparent text-xl font-semibold tracking-tight focus:outline-none"
        />

        <p className="text-fg-muted mt-1 text-xs">
          Em "<span className="text-fg">{card.list.name}</span>"
        </p>

        <section className="mt-6">
          <h3 className="text-fg-muted mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Descrição
          </h3>
          <DescriptionEditor
            value={description}
            onSave={(next) => {
              setDescription(next);
              descMut.mutate(next);
            }}
          />
        </section>

        <section className="mt-8">
          <h3 className="text-fg-muted mb-3 text-[10px] font-semibold uppercase tracking-wide">
            Comentários
          </h3>
          <CommentThread cardId={card.id} boardId={boardId} comments={card.comments} />
        </section>
      </div>

      <div className="border-border bg-bg-subtle overflow-y-auto border-t p-6 md:border-l md:border-t-0">
        <CardSidebar card={card} boardId={boardId} onClose={onClose} />
      </div>
    </div>
  );
}

function DescriptionEditor({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  const [dirty, setDirty] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <textarea
        rows={5}
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          setDirty(e.target.value !== value);
        }}
        placeholder="Adicionar descrição..."
        className="bg-bg border-border focus-visible:ring-primary w-full resize-y rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
      />
      {dirty && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onSave(local);
              setDirty(false);
            }}
            className="bg-primary text-primary-fg hover:bg-primary-hover rounded-md px-3 py-1.5 text-xs font-medium"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => {
              setLocal(value);
              setDirty(false);
            }}
            className="text-fg-muted hover:text-fg text-xs"
          >
            Descartar
          </button>
        </div>
      )}
    </div>
  );
}

function plainTextToDoc(text: string): unknown {
  const paragraphs = text.split(/\n{2,}/).map((p) => ({
    type: 'paragraph',
    content: p.length > 0 ? [{ type: 'text', text: p }] : [],
  }));
  return { type: 'doc', content: paragraphs };
}
