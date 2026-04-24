'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, Calendar, MessageSquare, CheckSquare, Paperclip } from 'lucide-react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import type { CardListItem } from '@/lib/queries/boards';

const PRIORITY_COLOR: Record<CardListItem['priority'], string> = {
  LOW: 'bg-bg-emphasis text-fg-muted',
  MEDIUM: 'bg-info/15 text-info',
  HIGH: 'bg-warning-subtle text-warning',
  URGENT: 'bg-danger-subtle text-danger',
};

const PRIORITY_LABEL: Record<CardListItem['priority'], string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export function CardItem({ card }: { card: CardListItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  const router = useRouter();
  const params = useSearchParams();
  const routeParams = useParams<{ boardId: string }>();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  function openCard() {
    const next = new URLSearchParams(params.toString());
    next.set('card', card.id);
    router.push(`/b/${routeParams.boardId}?${next.toString()}`, { scroll: false });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Só abre modal se o pointer não estava arrastando
        // (dnd-kit já filtra via activationConstraint distance:6)
        if ((e.target as HTMLElement).closest('[data-no-modal]')) return;
        openCard();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCard();
        }
      }}
      role="button"
      tabIndex={0}
      className="bg-bg cursor-pointer rounded-lg p-3 text-left shadow-[0_1px_2px_rgba(15,15,20,0.06)] ring-1 ring-black/[0.04] transition-shadow hover:shadow-[0_2px_8px_rgba(15,15,20,0.08)] hover:ring-black/[0.06]"
    >
      <CardInner card={card} />
    </div>
  );
}

export function CardOverlay({ card }: { card: CardListItem }) {
  return (
    <div className="bg-bg cursor-grabbing rounded-lg p-3 shadow-[0_8px_24px_rgba(15,15,20,0.18)] ring-1 ring-black/10">
      <CardInner card={card} />
    </div>
  );
}

function CardInner({ card }: { card: CardListItem }) {
  const hasLabels = card.labels.length > 0;
  const hasDue = !!card.dueDate;
  const due = card.dueDate ? new Date(card.dueDate) : null;
  const isOverdue = due ? due.getTime() < Date.now() : false;

  return (
    <div className="flex flex-col gap-2">
      {hasLabels && (
        <div className="-mx-3 -mt-3 flex h-1 overflow-hidden rounded-t-lg">
          {card.labels.map((l) => (
            <div
              key={l.label.id}
              className="flex-1"
              style={{ backgroundColor: l.label.color }}
              title={l.label.name}
            />
          ))}
        </div>
      )}

      <p className="line-clamp-3 text-sm font-medium">{card.title}</p>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${PRIORITY_COLOR[card.priority]}`}
        >
          {card.priority === 'URGENT' && <AlertTriangle size={10} />}
          {PRIORITY_LABEL[card.priority]}
        </span>

        {hasDue && due && (
          <span
            className={`inline-flex items-center gap-1 ${
              isOverdue ? 'text-danger' : 'text-fg-muted'
            }`}
          >
            <Calendar size={12} />
            {due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        )}

        {card._count.comments > 0 && (
          <span className="text-fg-muted inline-flex items-center gap-1">
            <MessageSquare size={12} />
            {card._count.comments}
          </span>
        )}

        {card._count.checklists > 0 && (
          <span className="text-fg-muted inline-flex items-center gap-1">
            <CheckSquare size={12} />
            {card._count.checklists}
          </span>
        )}

        {card._count.attachments > 0 && (
          <span className="text-fg-muted inline-flex items-center gap-1">
            <Paperclip size={12} />
            {card._count.attachments}
          </span>
        )}
      </div>

      {card.members.length > 0 && (
        <div className="flex -space-x-1.5">
          {card.members.slice(0, 4).map((m) => (
            <div
              key={m.user.id}
              className="border-bg bg-primary-subtle text-primary flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-semibold"
              title={m.user.name}
            >
              {m.user.name
                .split(' ')
                .map((w) => w[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
          ))}
          {card.members.length > 4 && (
            <div className="border-bg bg-bg-muted text-fg-muted flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-semibold">
              +{card.members.length - 4}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
