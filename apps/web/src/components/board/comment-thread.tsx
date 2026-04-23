'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Trash2, Send } from 'lucide-react';

import { Button } from '@ktask/ui';
import {
  type CommentNode,
  cardsQueries,
  createComment,
  deleteComment,
  updateComment,
} from '@/lib/queries/cards';
import { proseToPlainText, formatRelativeTime } from '@/lib/prose';
import { useAuthStore } from '@/stores/auth-store';

interface Props {
  cardId: string;
  boardId: string;
  comments: CommentNode[];
}

export function CommentThread({ cardId, boardId, comments }: Props) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [text, setText] = useState('');

  const createMut = useMutation({
    mutationFn: () => createComment({ cardId, plainText: text.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardsQueries.detail(cardId).queryKey });
      queryClient.invalidateQueries({ queryKey: ['boards', boardId] });
      setText('');
    },
  });

  const visible = comments.filter((c) => !c.deletedAt);

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim().length === 0) return;
          createMut.mutate();
        }}
        className="flex flex-col gap-2"
      >
        <textarea
          rows={3}
          placeholder="Escrever comentário... (use @usuario para mencionar)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              (e.currentTarget.form as HTMLFormElement).requestSubmit();
            }
          }}
          className="bg-bg border-border focus-visible:ring-primary w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
        />
        <div className="flex items-center justify-between">
          <p className="text-fg-subtle text-xs">
            Ctrl/⌘ + Enter para enviar · @email para mencionar
          </p>
          <Button
            type="submit"
            size="sm"
            disabled={createMut.isPending || text.trim().length === 0}
          >
            {createMut.isPending && <Loader2 size={14} className="animate-spin" />}
            <Send size={14} />
            Comentar
          </Button>
        </div>
      </form>

      {visible.length === 0 && <p className="text-fg-muted text-sm">Nenhum comentário ainda.</p>}

      <ul className="flex flex-col gap-4">
        {visible.map((comment) => (
          <CommentBubble
            key={comment.id}
            comment={comment}
            isAuthor={currentUser?.id === comment.authorId}
            cardId={cardId}
            boardId={boardId}
          />
        ))}
      </ul>
    </div>
  );
}

function CommentBubble({
  comment,
  isAuthor,
  cardId,
  boardId,
}: {
  comment: CommentNode;
  isAuthor: boolean;
  cardId: string;
  boardId: string;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const updateMut = useMutation({
    mutationFn: () => updateComment(comment.id, { plainText: draft.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardsQueries.detail(cardId).queryKey });
      queryClient.invalidateQueries({ queryKey: ['boards', boardId] });
      setEditing(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteComment(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardsQueries.detail(cardId).queryKey });
      queryClient.invalidateQueries({ queryKey: ['boards', boardId] });
    },
  });

  const plain = proseToPlainText(comment.body);
  const initials = comment.author.name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  function startEdit() {
    setDraft(plain);
    setEditing(true);
  }

  return (
    <li className="flex gap-3">
      <div className="bg-primary-subtle text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs">
          <span className="text-fg font-medium">{comment.author.name}</span>
          <span className="text-fg-subtle">{formatRelativeTime(comment.createdAt)}</span>
          {comment.editedAt && <span className="text-fg-subtle">· editado</span>}
        </div>

        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              autoFocus
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="bg-bg border-border focus-visible:ring-primary w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={updateMut.isPending || draft.trim().length === 0}
                onClick={() => updateMut.mutate()}
              >
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-bg-muted rounded-md px-3 py-2 text-sm">
              <p className="whitespace-pre-wrap">{plain}</p>
            </div>
            {isAuthor && (
              <div className="mt-1 flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={startEdit}
                  className="text-fg-muted hover:text-fg inline-flex items-center gap-1"
                >
                  <Pencil size={11} /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Excluir comentário?')) deleteMut.mutate();
                  }}
                  disabled={deleteMut.isPending}
                  className="text-fg-muted hover:text-danger inline-flex items-center gap-1"
                >
                  <Trash2 size={11} /> Excluir
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}
