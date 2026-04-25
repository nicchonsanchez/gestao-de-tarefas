'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { GitBranch, Loader2, MapPin, MoreHorizontal, Plus, Unlink } from 'lucide-react';

import {
  cardFamilyQuery,
  cardsQueries,
  setCardParent,
  type CardDetail,
  type FamilyCard,
} from '@/lib/queries/cards';
import { boardsQueries } from '@/lib/queries/boards';
import { formatRelativeTime } from '@/lib/prose';
import { UserAvatar } from '@/components/user-avatar';
import { CreateChildCardDialog } from './create-child-card-dialog';

/**
 * Aba "Família" do card — layout em árvore com indentação progressiva.
 *
 * Hierarquia exibida:
 *   - Pai (depth 0, sem indent)
 *   - Card atual + Irmãos (depth 1, indent 1)
 *   - Filhos do atual (depth 2, indent 2)
 *   - Netos (depth 3, indent 3)
 *   - Bisnetos (depth 4, indent 4)
 *   - ...
 *
 * Cada card mostra: título · fluxo · barra de progresso, avatares, tempo relativo
 * e menu (visualizar / desvincular).
 */
export function CardFamilyTab({ card }: { card: CardDetail }) {
  const familyQuery = useQuery({ ...cardFamilyQuery(card.id) });
  const [createOpen, setCreateOpen] = useState(false);

  const family = familyQuery.data;
  const parent = family?.parent ?? null;
  const siblings = family?.siblings ?? [];
  const descendants = family?.descendants ?? [];
  const directChildren = descendants.filter((d) => d.depth === 1);
  const totalDescendants = descendants.length;

  return (
    <div className="flex h-full w-full flex-1 flex-col overflow-y-auto">
      <div className="border-border/60 flex items-center justify-between gap-3 border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Família de cards</h2>
          {(parent || siblings.length > 0 || totalDescendants > 0) && (
            <span className="text-fg-muted text-xs">
              {summary(parent, siblings.length, directChildren.length, totalDescendants)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="bg-primary text-primary-fg hover:bg-primary-hover inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium"
        >
          <Plus size={14} />
          Criar card filho
        </button>
      </div>

      <div className="flex flex-col gap-1.5 px-4 py-5 sm:px-6">
        {familyQuery.isLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={18} className="text-fg-muted animate-spin" />
          </div>
        )}

        {/* Pai (depth 0) */}
        {parent && <FamilyRow family={parent} role="parent" cardId={card.id} indent={0} />}

        {/* Card atual + Irmãos (depth 1) */}
        {!familyQuery.isLoading && <CurrentCardRow card={card} indent={parent ? 1 : 0} />}
        {siblings.map((s) => (
          <FamilyRow
            key={s.id}
            family={s}
            role="sibling"
            cardId={card.id}
            indent={parent ? 1 : 0}
          />
        ))}

        {/* Descendentes (depth >= 1, mas indent ajustado relativo ao card atual) */}
        {descendants.map((d) => {
          const indentBase = parent ? 1 : 0;
          return (
            <FamilyRow
              key={d.id}
              family={d}
              role="descendant"
              cardId={card.id}
              indent={indentBase + d.depth}
            />
          );
        })}

        {!familyQuery.isLoading && !parent && siblings.length === 0 && descendants.length === 0 && (
          <p className="text-fg-subtle bg-bg-subtle border-border/60 mt-2 rounded-md border border-dashed px-3 py-3 text-[11px]">
            Esse card não tem pai, irmãos nem filhos. Use &quot;Criar card filho&quot; pra quebrar
            essa demanda em pedaços menores e ainda manter o vínculo.
          </p>
        )}
      </div>

      <CreateChildCardDialog parent={card} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function summary(
  parent: unknown,
  siblingsCount: number,
  childrenCount: number,
  totalDescendants: number,
): string {
  const parts: string[] = [];
  if (parent) parts.push('1 pai');
  if (siblingsCount > 0) parts.push(`${siblingsCount} irmão${siblingsCount === 1 ? '' : 's'}`);
  if (totalDescendants > 0) {
    if (totalDescendants === childrenCount) {
      parts.push(`${childrenCount} filho${childrenCount === 1 ? '' : 's'}`);
    } else {
      parts.push(
        `${childrenCount} filho${childrenCount === 1 ? '' : 's'} (${totalDescendants} descendentes)`,
      );
    }
  }
  return parts.join(' · ');
}

const INDENT_PX = 28; // espaçamento por nível, igual ao Ummense

function CurrentCardRow({ card, indent }: { card: CardDetail; indent: number }) {
  const boardQuery = useQuery({ ...boardsQueries.detail(card.boardId) });
  const board = boardQuery.data;
  const lists = board?.lists ?? [];
  const currentIdx = lists.findIndex((l) => l.id === card.listId);
  const isCompleted = Boolean(card.completedAt);

  return (
    <div style={{ paddingLeft: indent * INDENT_PX }} className="relative w-full">
      <div className="bg-primary-subtle/40 border-primary/40 hover:border-primary/70 relative flex w-full items-center gap-4 rounded-md border p-3 transition-colors">
        <span className="text-primary absolute -left-2 top-3" aria-label="Card atual">
          <MapPin size={16} fill="currentColor" />
        </span>
        <div className="min-w-0 flex-1 pl-3">
          <p className="truncate text-sm font-medium">{card.title}</p>
          <p className="text-fg-muted mt-1 text-[11px]">{board?.name ?? '...'}</p>
          <Minicolumns lists={lists} currentIdx={currentIdx} isCompleted={isCompleted} />
        </div>
        <Avatars members={card.members} />
        <RelativeTime date={card.updatedAt} />
        <DueDate date={card.dueDate} />
      </div>
    </div>
  );
}

function FamilyRow({
  family,
  role,
  cardId,
  indent,
}: {
  family: FamilyCard;
  role: 'parent' | 'sibling' | 'descendant';
  cardId: string;
  indent: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const routeParams = useParams<{ boardId: string }>();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const lists = useQuery({ ...boardsQueries.detail(family.boardId) }).data?.lists ?? [];
  const currentIdx = lists.findIndex((l) => l.id === family.listId);
  const isCompleted = Boolean(family.completedAt);

  const unlinkMut = useMutation({
    mutationFn: () =>
      role === 'parent'
        ? // desvincula o card atual do seu pai
          setCardParent(cardId, null)
        : // desvincula este descendant/sibling do seu pai (família.id)
          setCardParent(family.id, null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardFamilyQuery(cardId).queryKey });
      queryClient.invalidateQueries({ queryKey: cardsQueries.detail(cardId).queryKey });
    },
  });

  function open() {
    const next = new URLSearchParams(params.toString());
    next.set('card', family.id);
    if (family.boardId !== routeParams.boardId) {
      router.push(`/b/${family.boardId}?card=${family.id}`);
    } else {
      router.push(`/b/${routeParams.boardId}?${next.toString()}`, { scroll: false });
    }
  }

  return (
    <div style={{ paddingLeft: indent * INDENT_PX }} className="w-full">
      <div className="border-border hover:border-border-strong hover:bg-bg-subtle flex w-full items-center gap-4 rounded-md border p-3 transition-colors">
        <button type="button" onClick={open} className="min-w-0 flex-1 cursor-pointer text-left">
          <p className="truncate text-sm font-medium">{family.title}</p>
          <p className="text-fg-muted mt-1 text-[11px]">{family.board.name}</p>
          <Minicolumns lists={lists} currentIdx={currentIdx} isCompleted={isCompleted} />
        </button>
        <Avatars members={family.members} />
        <RelativeTime date={family.updatedAt} />
        <DueDate date={family.dueDate} />
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="text-fg-muted hover:bg-bg-muted hover:text-fg rounded p-1"
            aria-label="Mais ações"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="border-border bg-bg absolute right-0 top-full z-20 mt-1 flex w-52 flex-col rounded-md border p-1 text-xs shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    open();
                  }}
                  className="hover:bg-bg-muted flex items-center gap-2 rounded-sm px-2 py-1.5 text-left"
                >
                  <GitBranch size={13} />
                  Visualizar card
                </button>
                <div className="border-border/70 my-1 border-t" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (
                      confirm(
                        role === 'parent'
                          ? 'Desvincular este card do pai?'
                          : role === 'sibling'
                            ? 'Desvincular este irmão do pai? Vira card independente.'
                            : 'Desvincular este descendente? Vira card independente.',
                      )
                    ) {
                      unlinkMut.mutate();
                    }
                  }}
                  disabled={unlinkMut.isPending}
                  className="text-danger hover:bg-danger-subtle flex items-center gap-2 rounded-sm px-2 py-1.5 text-left disabled:opacity-50"
                >
                  <Unlink size={13} />
                  {role === 'parent'
                    ? 'Desvincular do pai'
                    : role === 'sibling'
                      ? 'Desvincular do pai comum'
                      : 'Desvincular do card'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Minicolumns({
  lists,
  currentIdx,
  isCompleted,
}: {
  lists: Array<{ id: string; name: string }>;
  currentIdx: number;
  isCompleted: boolean;
}) {
  return (
    <div
      className="mt-2 flex h-2 w-full gap-[2px] overflow-hidden rounded-full"
      title={currentIdx >= 0 ? `Coluna atual: ${lists[currentIdx]?.name}` : 'Sem coluna atual'}
    >
      {lists.length === 0 ? (
        <div className="bg-bg-emphasis h-full flex-1 rounded-full" />
      ) : (
        lists.map((l, idx) => {
          const isFilled = !isCompleted && currentIdx >= 0 && idx <= currentIdx;
          const isCurrent = !isCompleted && idx === currentIdx;
          return (
            <div
              key={l.id}
              className={`h-full flex-1 ${
                isFilled ? (isCurrent ? 'bg-primary' : 'bg-primary/70') : 'bg-bg-emphasis'
              }`}
            />
          );
        })
      )}
    </div>
  );
}

function Avatars({
  members,
}: {
  members: Array<{ user: { id: string; name: string; avatarUrl: string | null } }>;
}) {
  if (members.length === 0) {
    return (
      <span className="bg-bg-muted text-fg-muted flex size-6 shrink-0 items-center justify-center rounded-full">
        <GitBranch size={10} />
      </span>
    );
  }
  return (
    <div className="flex shrink-0 -space-x-1.5">
      {members.slice(0, 4).map((m) => (
        <UserAvatar
          key={m.user.id}
          name={m.user.name}
          userId={m.user.id}
          avatarUrl={m.user.avatarUrl}
          size="sm"
          stacked
        />
      ))}
    </div>
  );
}

function RelativeTime({ date }: { date: string | undefined }) {
  if (!date) return null;
  return (
    <span className="text-fg-muted shrink-0 whitespace-nowrap text-[11px]">
      {formatRelativeTime(date)}
    </span>
  );
}

function DueDate({ date }: { date: string | null }) {
  return (
    <div className="text-fg-muted shrink-0 text-[11px]">
      {date ? new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
    </div>
  );
}
