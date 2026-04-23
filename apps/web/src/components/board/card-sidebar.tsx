'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, Layers, Users, Tag, ChevronsUp, Archive } from 'lucide-react';

import { Button } from '@ktask/ui';
import { archiveCard, cardsQueries, updateCard, type CardDetail } from '@/lib/queries/cards';
import { formatRelativeTime } from '@/lib/prose';

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baixa', classes: 'bg-bg-emphasis text-fg-muted' },
  { value: 'MEDIUM', label: 'Média', classes: 'bg-info/15 text-info' },
  { value: 'HIGH', label: 'Alta', classes: 'bg-warning-subtle text-warning' },
  { value: 'URGENT', label: 'Urgente', classes: 'bg-danger-subtle text-danger' },
] as const;

const ACTIVITY_LABELS: Record<string, string> = {
  CARD_CREATED: 'criou o card',
  CARD_UPDATED: 'atualizou o card',
  CARD_MOVED: 'moveu o card',
  CARD_ARCHIVED: 'arquivou o card',
  CARD_ASSIGNED: 'atribuiu alguém',
  CARD_UNASSIGNED: 'desatribuiu',
  LABEL_ADDED: 'adicionou etiqueta',
  LABEL_REMOVED: 'removeu etiqueta',
  COMMENT_ADDED: 'comentou',
  COMMENT_EDITED: 'editou comentário',
  COMMENT_DELETED: 'excluiu comentário',
};

interface Props {
  card: CardDetail;
  boardId: string;
  onClose: () => void;
}

export function CardSidebar({ card, boardId, onClose }: Props) {
  const queryClient = useQueryClient();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: cardsQueries.detail(card.id).queryKey });
    queryClient.invalidateQueries({ queryKey: ['boards', boardId] });
  }

  const priorityMut = useMutation({
    mutationFn: (priority: CardDetail['priority']) => updateCard(card.id, { priority }),
    onSuccess: invalidate,
  });

  const dueDateMut = useMutation({
    mutationFn: (isoDate: string | null) => updateCard(card.id, { dueDate: isoDate }),
    onSuccess: invalidate,
  });

  const archiveMut = useMutation({
    mutationFn: () => archiveCard(card.id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const dueLocal = card.dueDate ? toDatetimeLocal(card.dueDate) : '';

  return (
    <aside className="flex flex-col gap-6 text-sm">
      <Section title="Prioridade" icon={<ChevronsUp size={14} />}>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITY_OPTIONS.map((opt) => {
            const active = card.priority === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => priorityMut.mutate(opt.value)}
                disabled={priorityMut.isPending}
                className={`rounded-full px-2 py-0.5 text-xs font-medium transition-opacity ${opt.classes} ${
                  active
                    ? 'ring-primary ring-offset-bg ring-2 ring-offset-2'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                {opt.value === 'URGENT' && (
                  <AlertTriangle size={10} className="mr-0.5 inline-block" />
                )}
                {opt.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Prazo" icon={<CalendarDays size={14} />}>
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={dueLocal}
            onChange={(e) => {
              const v = e.target.value;
              dueDateMut.mutate(v ? new Date(v).toISOString() : null);
            }}
            className="bg-bg border-border focus-visible:ring-primary flex-1 rounded-md border px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2"
          />
          {card.dueDate && (
            <button
              type="button"
              onClick={() => dueDateMut.mutate(null)}
              className="text-fg-muted hover:text-fg text-xs"
            >
              Limpar
            </button>
          )}
        </div>
      </Section>

      <Section title="Membros" icon={<Users size={14} />}>
        {card.members.length === 0 ? (
          <p className="text-fg-muted text-xs">Nenhum membro atribuído.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {card.members.map((m) => (
              <li key={m.userId} className="flex items-center gap-2 text-xs">
                <div className="bg-primary-subtle text-primary flex size-6 items-center justify-center rounded-full text-[9px] font-semibold">
                  {m.user.name
                    .split(' ')
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <span className="truncate">{m.user.name}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-fg-subtle mt-2 text-[11px]">
          Atribuir novos membros estará disponível em breve.
        </p>
      </Section>

      <Section title="Etiquetas" icon={<Tag size={14} />}>
        {card.labels.length === 0 ? (
          <p className="text-fg-muted text-xs">Nenhuma etiqueta.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {card.labels.map((cl) => (
              <span
                key={cl.labelId}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: cl.label.color }}
              >
                {cl.label.name}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Lista" icon={<Layers size={14} />}>
        <p className="text-fg-muted text-xs">
          Atualmente em: <span className="text-fg">{card.list.name}</span>
        </p>
      </Section>

      <Section title="Atividade" icon={undefined}>
        {card.activities.length === 0 ? (
          <p className="text-fg-muted text-xs">Sem atividade ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-xs">
            {card.activities.map((a) => {
              const actor = a.actor?.name ?? 'Sistema';
              const label = ACTIVITY_LABELS[a.type] ?? a.type.toLowerCase();
              return (
                <li key={a.id} className="text-fg-muted">
                  <span className="text-fg font-medium">{actor}</span> {label}{' '}
                  <span className="text-fg-subtle">{formatRelativeTime(a.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <div className="border-border mt-auto border-t pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-danger-subtle w-full justify-start"
          onClick={() => {
            if (confirm('Arquivar este card?')) archiveMut.mutate();
          }}
          disabled={archiveMut.isPending}
        >
          <Archive size={14} />
          Arquivar card
        </Button>
      </div>
    </aside>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h4 className="text-fg-muted mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
