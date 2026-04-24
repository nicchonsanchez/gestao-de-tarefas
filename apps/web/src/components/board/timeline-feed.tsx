'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Send, Trash2 } from 'lucide-react';

import { Button } from '@ktask/ui';
import {
  cardsQueries,
  createComment,
  deleteComment,
  updateComment,
  type ActivityNode,
  type CommentNode,
} from '@/lib/queries/cards';
import { formatRelativeTime, proseToPlainText } from '@/lib/prose';
import { activityLabel, activityDetail } from '@/lib/activity-format';
import { UserAvatar } from '@/components/user-avatar';
import { useAuthStore } from '@/stores/auth-store';
import { MentionTextarea } from './mention-textarea';

type TabKey = 'all' | 'comments' | 'mine' | 'records';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'comments', label: 'Anotações' },
  { key: 'mine', label: 'Minhas anotações' },
  { key: 'records', label: 'Registros' },
];

type FeedItem =
  | { kind: 'comment'; at: string; comment: CommentNode }
  | { kind: 'activity'; at: string; activity: ActivityNode };

export function TimelineFeed({
  cardId,
  boardId,
  comments,
  activities,
}: {
  cardId: string;
  boardId: string;
  comments: CommentNode[];
  activities: ActivityNode[];
}) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<TabKey>('all');
  const [text, setText] = useState('');

  const createMut = useMutation({
    mutationFn: () => createComment({ cardId, plainText: text.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardsQueries.detail(cardId).queryKey });
      queryClient.invalidateQueries({ queryKey: ['boards', boardId] });
      setText('');
    },
  });

  const items = useMemo<FeedItem[]>(() => {
    const commentItems = comments
      .filter((c) => !c.deletedAt)
      .map<FeedItem>((c) => ({ kind: 'comment', at: c.createdAt, comment: c }));

    const activityItems = activities
      // activity COMMENT_ADDED duplica o comentário no feed, oculta
      .filter(
        (a) =>
          a.type !== 'COMMENT_ADDED' && a.type !== 'COMMENT_EDITED' && a.type !== 'COMMENT_DELETED',
      )
      .map<FeedItem>((a) => ({ kind: 'activity', at: a.createdAt, activity: a }));

    const merged = [...commentItems, ...activityItems];
    merged.sort((a, b) => (a.at < b.at ? 1 : -1)); // mais recente primeiro

    switch (tab) {
      case 'comments':
        return merged.filter((i) => i.kind === 'comment');
      case 'mine':
        return merged.filter((i) => i.kind === 'comment' && i.comment.authorId === user?.id);
      case 'records':
        return merged.filter((i) => i.kind === 'activity');
      default:
        return merged;
    }
  }, [comments, activities, tab, user?.id]);

  return (
    <div className="flex h-full flex-col">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim().length === 0) return;
          createMut.mutate();
        }}
        className="flex flex-col gap-2 pb-3"
      >
        <MentionTextarea
          value={text}
          onChange={setText}
          onSubmit={() => {
            if (text.trim().length > 0) createMut.mutate();
          }}
          rows={3}
          placeholder="Escreva uma anotação neste card. Use @ para mencionar um usuário."
        />
        <div className="flex items-center justify-between">
          <p className="text-fg-subtle text-[11px]">Ctrl/⌘ + Enter para enviar</p>
          <Button
            type="submit"
            size="sm"
            disabled={createMut.isPending || text.trim().length === 0}
          >
            {createMut.isPending && <Loader2 size={14} className="animate-spin" />}
            <Send size={14} />
            Enviar
          </Button>
        </div>
      </form>

      <div className="border-border flex items-center gap-1 border-b pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              tab === t.key ? 'text-primary bg-primary-subtle' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul className="flex flex-1 flex-col gap-3 overflow-y-auto pt-3">
        {items.length === 0 ? (
          <li className="text-fg-muted py-6 text-center text-xs">Nada por aqui ainda.</li>
        ) : (
          items.map((item) =>
            item.kind === 'comment' ? (
              <CommentItem
                key={`c-${item.comment.id}`}
                comment={item.comment}
                isAuthor={user?.id === item.comment.authorId}
                cardId={cardId}
                boardId={boardId}
              />
            ) : (
              <ActivityItem key={`a-${item.activity.id}`} activity={item.activity} />
            ),
          )
        )}
      </ul>
    </div>
  );
}

function CommentItem({
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

  return (
    <li className="flex gap-2.5">
      <UserAvatar
        name={comment.author.name}
        userId={comment.author.id}
        avatarUrl={comment.author.avatarUrl}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs">
          <span className="text-fg font-medium">{comment.author.name}</span>
          <span className="text-fg-subtle">{formatRelativeTime(comment.createdAt)}</span>
          {comment.editedAt && <span className="text-fg-subtle">· editado</span>}
        </div>
        {editing ? (
          <div className="flex flex-col gap-2">
            <MentionTextarea
              autoFocus
              rows={3}
              value={draft}
              onChange={setDraft}
              onSubmit={() => {
                if (draft.trim().length > 0) updateMut.mutate();
              }}
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
              <div className="mt-1 flex items-center gap-3 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(plain);
                    setEditing(true);
                  }}
                  className="text-fg-muted hover:text-fg inline-flex items-center gap-1"
                >
                  <Pencil size={11} /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Excluir anotação?')) deleteMut.mutate();
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

function ActivityItem({ activity }: { activity: ActivityNode }) {
  const actor = activity.actor?.name ?? 'Sistema';
  const label = activityLabel(activity);
  const detail = activityDetail(activity);
  return (
    <li className="flex gap-2.5">
      <UserAvatar
        name={actor}
        userId={activity.actor?.id}
        avatarUrl={activity.actor?.avatarUrl}
        size="md"
        muted={!activity.actor}
      />
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-xs">
          <span className="text-fg font-medium">{actor}</span>{' '}
          <span className="text-fg-muted">{label}</span>
          {detail && <span className="text-fg-muted"> {detail}</span>}
          <span className="text-fg-subtle"> · {formatRelativeTime(activity.createdAt)}</span>
        </p>
      </div>
    </li>
  );
}
