'use client';

import { useQuery } from '@tanstack/react-query';
import { GitBranch, MapPin, MoreHorizontal, Plus } from 'lucide-react';

import { boardsQueries, type BoardDetail, type BoardListItem } from '@/lib/queries/boards';
import type { CardDetail } from '@/lib/queries/cards';
import { UserAvatar } from '@/components/user-avatar';

/**
 * Aba "Família" do card — placeholder visual.
 *
 * Conceito: cards organizados em hierarquia pai/filho. Schema já tem
 * `Card.parentCardId` + relação `Subtasks`, mas zero UI/serviços ainda.
 *
 * Plano completo em `tarefas-md/17-familia-cards.md`.
 *
 * O que esse componente exibe:
 *   - Card atual destacado (com indicação se é pai ou filho)
 *   - Lista placeholder de filhos (vazia hoje, vai listar children quando
 *     a feature estiver implementada)
 *   - Botão "Criar card filho" disabled
 */
export function CardFamilyTab({ card }: { card: CardDetail }) {
  const boardQuery = useQuery(boardsQueries.detail(card.boardId));
  const boardListQuery = useQuery(boardsQueries.all());
  const board = boardQuery.data;
  const boardItem = boardListQuery.data?.find((b) => b.id === card.boardId);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-border/60 flex items-center justify-between gap-3 border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Família de cards</h2>
          <span className="bg-primary-subtle text-primary rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase">
            v1
          </span>
        </div>
        <button
          type="button"
          disabled
          title="Em breve"
          className="bg-primary-subtle text-primary inline-flex cursor-not-allowed items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium opacity-70"
        >
          <Plus size={14} />
          Criar card filho
        </button>
      </div>

      <div className="flex flex-col gap-3 px-6 py-6">
        {board && boardItem && (
          <FamilyRow card={card} board={board} boardItem={boardItem} highlight />
        )}

        <p className="text-fg-subtle bg-bg-subtle border-border/60 rounded-md border border-dashed px-3 py-3 text-[11px]">
          Cards organizados em hierarquia pai/filho permitem quebrar uma demanda grande em várias
          menores, mantendo o vínculo. Schema já existe (<code>parentCardId</code>), falta a UI
          completa: criar filhos a partir do pai, navegar pra cima/baixo na árvore, mostrar
          progresso agregado dos filhos no pai.
        </p>
      </div>
    </div>
  );
}

function FamilyRow({
  card,
  board,
  boardItem,
  highlight,
}: {
  card: CardDetail;
  board: BoardDetail;
  boardItem: BoardListItem;
  highlight?: boolean;
}) {
  const lists = board.lists ?? [];
  const currentIdx = lists.findIndex((l) => l.id === card.listId);
  const isCompleted = Boolean(card.completedAt);

  return (
    <div
      className={`relative flex items-center gap-4 rounded-md p-3 ${
        highlight ? 'bg-primary-subtle/40 border-primary/30 border' : 'border-border border'
      }`}
    >
      {highlight && (
        <span className="text-primary absolute -left-2 top-3" aria-label="Card atual">
          <MapPin size={16} fill="currentColor" />
        </span>
      )}

      <div className="min-w-0 flex-1 pl-3">
        <p className="truncate text-sm font-medium">{card.title}</p>
        <div className="text-fg-muted mt-1 flex items-center gap-1.5 text-[11px]">
          {boardItem.icon && <span>{boardItem.icon}</span>}
          <span className="font-medium">{board.name}</span>
        </div>
        {/* Mini-colunas do fluxo com anteriores + atual preenchidas */}
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
      </div>

      {/* Avatares dos membros */}
      <div className="flex shrink-0 -space-x-1.5">
        {card.members.slice(0, 4).map((m) => (
          <UserAvatar
            key={m.userId}
            name={m.user.name}
            userId={m.user.id}
            avatarUrl={m.user.avatarUrl}
            size="sm"
            stacked
          />
        ))}
        {card.members.length === 0 && (
          <span className="bg-bg-muted text-fg-muted flex size-6 items-center justify-center rounded-full">
            <GitBranch size={10} />
          </span>
        )}
      </div>

      <div className="text-fg-muted shrink-0 text-[11px]">
        {card.dueDate
          ? new Date(card.dueDate).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            })
          : '—'}
      </div>

      <button
        type="button"
        disabled
        title="Em breve"
        className="text-fg-muted hover:bg-bg-muted shrink-0 rounded p-1 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MoreHorizontal size={14} />
      </button>
    </div>
  );
}
