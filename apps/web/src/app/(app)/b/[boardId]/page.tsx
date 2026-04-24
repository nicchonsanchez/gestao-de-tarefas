'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  closestCenter,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Loader2 } from 'lucide-react';

import {
  boardsQueries,
  completeCard,
  moveCard,
  type BoardDetail,
  type CardListItem,
} from '@/lib/queries/boards';
import { CardItem, CardOverlay } from '@/components/board/card-item';
import { ListColumn } from '@/components/board/list-column';
import { CardModal } from '@/components/board/card-modal';
import { CompletedColumn, COMPLETED_DROPPABLE_ID } from '@/components/board/completed-column';
import { ApiError } from '@/lib/api-client';
import { useRealtimeBoard } from '@/hooks/use-realtime-board';

export default function BoardPage() {
  const params = useParams<{ boardId: string }>();
  const boardId = params.boardId;
  const boardQuery = useQuery(boardsQueries.detail(boardId));
  const queryClient = useQueryClient();
  const [activeCard, setActiveCard] = useState<CardListItem | null>(null);

  useRealtimeBoard({
    boardId,
    organizationId: boardQuery.data?.organizationId ?? null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /**
   * Estratégia de colisão p/ kanban multi-coluna:
   *  1. Se o ponteiro está dentro de algum droppable, usa ele (prioriza o mais
   *     profundo: cards ganham da coluna que os contém). Isso resolve o caso
   *     da coluna vazia — assim que o cursor entra nela, ela ganha sem ser
   *     "ofuscada" por cards de outras colunas.
   *  2. Senão, fallback pra rectIntersection (drag saiu da zona do ponteiro).
   *  3. Último recurso: closestCenter pra não deixar sem `over`.
   */
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointer = pointerWithin(args);
    if (pointer.length > 0) return pointer;
    const rect = rectIntersection(args);
    if (rect.length > 0) return rect;
    return closestCenter(args);
  }, []);

  const board = boardQuery.data;

  const cardIdToListId = useMemo(() => {
    const map = new Map<string, string>();
    board?.lists.forEach((l) => l.cards.forEach((c) => map.set(c.id, l.id)));
    return map;
  }, [board]);

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const listId = cardIdToListId.get(id);
    if (!board || !listId) return;
    const list = board.lists.find((l) => l.id === listId);
    const card = list?.cards.find((c) => c.id === id) ?? null;
    setActiveCard(card);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!board || !over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    // Drop em coluna "Finalizado" é tratado só no handleDragEnd (não move card entre listas)
    if (overId === COMPLETED_DROPPABLE_ID) return;

    const activeListId = cardIdToListId.get(activeId);
    const overListId = cardIdToListId.get(overId) ?? overId; // overId pode ser um listId
    if (!activeListId || !overListId) return;

    if (activeListId === overListId) return;

    // Move optimistically entre listas no cache
    queryClient.setQueryData<BoardDetail>(boardsQueries.detail(boardId).queryKey, (prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const from = next.lists.find((l) => l.id === activeListId);
      const to = next.lists.find((l) => l.id === overListId);
      if (!from || !to) return prev;
      const idx = from.cards.findIndex((c) => c.id === activeId);
      if (idx < 0) return prev;
      const [moved] = from.cards.splice(idx, 1);
      to.cards.push(moved!);
      return next;
    });
    cardIdToListId.set(activeId, overListId);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);
    if (!board || !over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Drop na coluna virtual "Finalizado" = finalizar card
    if (overId === COMPLETED_DROPPABLE_ID) {
      // Remove otimisticamente da lista atual e incrementa contagem
      queryClient.setQueryData<BoardDetail>(boardsQueries.detail(boardId).queryKey, (prev) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        for (const l of next.lists) {
          const idx = l.cards.findIndex((c) => c.id === activeId);
          if (idx >= 0) {
            l.cards.splice(idx, 1);
            break;
          }
        }
        next.completedCount = (next.completedCount ?? 0) + 1;
        return next;
      });
      try {
        await completeCard(activeId);
        queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'completed'] });
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Erro ao finalizar card.';
        console.error('[board] complete failed:', msg);
        queryClient.invalidateQueries({ queryKey: boardsQueries.detail(boardId).queryKey });
      }
      return;
    }

    const activeListId = cardIdToListId.get(activeId);
    if (!activeListId) return;

    const destList = board.lists.find((l) => l.id === activeListId);
    if (!destList) return;

    // Se droppou em outro card, reordena dentro da lista
    const overIsCard = cardIdToListId.has(overId);
    let afterCardId: string | null = null;
    let toListId = activeListId;

    if (overIsCard && overId !== activeId) {
      // Reorder: pegar índice do card alvo e usar o anterior como afterCardId
      const overListId = cardIdToListId.get(overId)!;
      toListId = overListId;
      const destList2 = board.lists.find((l) => l.id === overListId);
      if (destList2) {
        const overIndex = destList2.cards.findIndex((c) => c.id === overId);
        if (overIndex >= 0) {
          // Reflete posição otimista no cache local
          queryClient.setQueryData<BoardDetail>(boardsQueries.detail(boardId).queryKey, (prev) => {
            if (!prev) return prev;
            const next = structuredClone(prev);
            const sourceList = next.lists.find((l) => l.cards.some((c) => c.id === activeId));
            const targetList = next.lists.find((l) => l.id === overListId);
            if (!sourceList || !targetList) return prev;
            const fromIdx = sourceList.cards.findIndex((c) => c.id === activeId);
            const toIdx = targetList.cards.findIndex((c) => c.id === overId);
            if (sourceList === targetList) {
              targetList.cards = arrayMove(targetList.cards, fromIdx, toIdx);
            } else {
              const [moved] = sourceList.cards.splice(fromIdx, 1);
              targetList.cards.splice(toIdx, 0, moved!);
            }
            return next;
          });
          afterCardId = overIndex > 0 ? (destList2.cards[overIndex - 1]?.id ?? null) : null;
        }
      }
    }

    try {
      await moveCard(activeId, { toListId, afterCardId });
    } catch (err) {
      // Rollback em caso de erro
      const msg = err instanceof ApiError ? err.message : 'Erro ao mover card.';
      console.error('[board] move failed:', msg);
      queryClient.invalidateQueries({ queryKey: boardsQueries.detail(boardId).queryKey });
    }
  }

  if (boardQuery.isLoading) {
    return (
      <div className="flex h-[calc(100vh-52px)] items-center justify-center">
        <Loader2 size={20} className="text-fg-muted animate-spin" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="container py-10">
        <p className="text-fg-muted text-sm">Quadro não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-52px)] flex-col">
      <div className="border-border bg-bg-subtle border-b px-6 py-3">
        <h1 className="text-lg font-semibold">{board.name}</h1>
        {board.description && <p className="text-fg-muted mt-0.5 text-xs">{board.description}</p>}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="inline-flex h-full gap-3 p-3">
            {board.lists.map((list) => (
              <ListColumn key={list.id} list={list}>
                <SortableContext
                  items={list.cards.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {list.cards.map((card) => (
                    <CardItem key={card.id} card={card} />
                  ))}
                </SortableContext>
              </ListColumn>
            ))}
            <CompletedColumn boardId={boardId} completedCount={board.completedCount ?? 0} />
          </div>
        </div>

        <DragOverlay>{activeCard && <CardOverlay card={activeCard} />}</DragOverlay>
      </DndContext>

      <Suspense fallback={null}>
        <CardModal boardId={boardId} />
      </Suspense>
    </div>
  );
}
