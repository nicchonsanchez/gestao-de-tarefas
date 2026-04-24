'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  CheckCircle2,
  ChevronsUp,
  Copy,
  ExternalLink,
  Layers,
  Link as LinkIcon,
  Loader2,
  Lock,
  MoreHorizontal,
  Tag,
  Users,
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '@ktask/ui';
import { archiveCard, cardsQueries, updateCard, type CardDetail } from '@/lib/queries/cards';
import { proseToPlainText } from '@/lib/prose';
import { TimelineFeed } from './timeline-feed';

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baixa', classes: 'bg-bg-emphasis text-fg-muted' },
  { value: 'MEDIUM', label: 'Média', classes: 'bg-info/15 text-info' },
  { value: 'HIGH', label: 'Alta', classes: 'bg-warning-subtle text-warning' },
  { value: 'URGENT', label: 'Urgente', classes: 'bg-danger-subtle text-danger' },
] as const;

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
      <DialogContent className="max-w-6xl p-0">
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
  const isCompleted = Boolean(card.completedAt);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: cardsQueries.detail(card.id).queryKey });
    queryClient.invalidateQueries({ queryKey: ['boards', boardId] });
  }

  const [title, setTitle] = useState(card.title);
  useEffect(() => setTitle(card.title), [card.title]);

  const titleMut = useMutation({
    mutationFn: (next: string) => updateCard(card.id, { title: next }),
    onSuccess: invalidate,
  });

  const [description, setDescription] = useState(proseToPlainText(card.description));
  useEffect(() => setDescription(proseToPlainText(card.description)), [card.description]);

  const descMut = useMutation({
    mutationFn: (plain: string) => updateCard(card.id, { description: plainTextToDoc(plain) }),
    onSuccess: invalidate,
  });

  const priorityMut = useMutation({
    mutationFn: (priority: CardDetail['priority']) => updateCard(card.id, { priority }),
    onSuccess: invalidate,
  });

  const dueDateMut = useMutation({
    mutationFn: (iso: string | null) => updateCard(card.id, { dueDate: iso }),
    onSuccess: invalidate,
  });

  const archiveMut = useMutation({
    mutationFn: () => archiveCard(card.id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  return (
    <div className="flex max-h-[90vh] flex-col">
      {/* Header */}
      <header className="border-border flex items-start justify-between gap-3 border-b px-6 py-4">
        <div className="min-w-0 flex-1">
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
            className="w-full bg-transparent text-lg font-semibold tracking-tight focus:outline-none"
          />
          <p className="text-fg-muted mt-0.5 text-xs">
            Em <span className="text-fg">{card.list.name}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DueDateInline value={card.dueDate} onChange={(iso) => dueDateMut.mutate(iso)} />
          <StatusBadge isCompleted={isCompleted} />
          <CardMenu
            cardId={card.id}
            boardId={boardId}
            onArchive={() => {
              if (confirm('Arquivar este card?')) archiveMut.mutate();
            }}
          />
        </div>
      </header>

      {/* Corpo: 2 colunas */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_380px]">
        {/* Coluna esquerda — dados */}
        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
          {/* Líder + Equipe + Privacidade */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <MembersInline card={card} />
            <button
              type="button"
              title="Privacidade (em breve)"
              className="text-fg-muted hover:text-fg disabled:opacity-60"
              disabled
            >
              <Lock size={14} />
            </button>
          </div>

          {/* Descrição */}
          <Block icon={<DescriptionIcon />} label="Descrição">
            <DescriptionEditor
              value={description}
              onSave={(next) => {
                setDescription(next);
                descMut.mutate(next);
              }}
            />
          </Block>

          {/* Tags (labels) */}
          <Block icon={<Tag size={14} />} label="Tags">
            {card.labels.length === 0 ? (
              <p className="text-fg-muted text-xs">Nenhuma etiqueta.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {card.labels.map((cl) => (
                  <span
                    key={cl.labelId}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                    style={{ backgroundColor: cl.label.color }}
                  >
                    {cl.label.name}
                  </span>
                ))}
              </div>
            )}
          </Block>

          {/* Contatos (= membros) */}
          <Block icon={<Users size={14} />} label="Contatos">
            {card.members.length === 0 ? (
              <p className="text-fg-muted text-xs">Nenhum contato atribuído.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {card.members.map((m) => (
                  <li key={m.userId} className="flex items-center gap-2 text-xs">
                    <MemberAvatar name={m.user.name} />
                    <span className="truncate">{m.user.name}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-fg-subtle mt-2 text-[11px]">
              Atribuir novos contatos estará disponível em breve.
            </p>
          </Block>

          {/* Prioridade + Prazo */}
          <Block icon={<ChevronsUp size={14} />} label="Detalhes">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-fg-muted mb-1 text-[11px]">Prioridade</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITY_OPTIONS.map((opt) => {
                    const active = card.priority === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => priorityMut.mutate(opt.value)}
                        disabled={priorityMut.isPending}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-opacity ${opt.classes} ${
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
              </div>

              <div>
                <p className="text-fg-muted mb-1 text-[11px]">Prazo</p>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={card.dueDate ? toDatetimeLocal(card.dueDate) : ''}
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
              </div>

              <div className="text-fg-muted flex items-center gap-2 text-[11px]">
                <Layers size={12} />
                <span>
                  Em <span className="text-fg">{card.list.name}</span>
                </span>
              </div>
            </div>
          </Block>

          {/* Tarefas do card (placeholder) */}
          <Block icon={<ChecklistIcon />} label={`Tarefas do card (${card.checklists.length})`}>
            <button
              type="button"
              disabled
              className="border-border text-fg-muted inline-flex items-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-xs opacity-60"
              title="Em breve"
            >
              + Adicionar tarefa
            </button>
            <p className="text-fg-subtle mt-2 text-[11px]">Checklists completas chegam em breve.</p>
          </Block>
        </div>

        {/* Coluna direita — Timeline */}
        <aside className="border-border bg-bg-subtle flex flex-col overflow-hidden border-t md:border-l md:border-t-0">
          <div className="border-border flex items-center gap-2 border-b px-5 py-3">
            <h3 className="text-sm font-semibold">Timeline</h3>
          </div>
          <div className="flex-1 overflow-hidden px-5 py-3">
            <TimelineFeed
              cardId={card.id}
              boardId={boardId}
              comments={card.comments}
              activities={card.activities}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------------- sub-componentes ---------------- */

function Block({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="text-fg-muted mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
        {icon}
        {label}
      </div>
      {children}
    </section>
  );
}

function DescriptionIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="15" y2="18" />
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
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
        placeholder="Escrever detalhes do card..."
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

function DueDateInline({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const has = Boolean(value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
          has ? 'bg-primary-subtle text-primary' : 'text-fg-muted hover:text-fg'
        }`}
        title="Prazo"
      >
        <CalendarDays size={14} />
        {has && value && (
          <span>
            {new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </button>
      {open && (
        <div className="border-border bg-bg absolute right-0 top-8 z-10 flex flex-col gap-2 rounded-md border p-2 shadow-lg">
          <input
            autoFocus
            type="datetime-local"
            value={value ? toDatetimeLocal(value) : ''}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v ? new Date(v).toISOString() : null);
            }}
            className="bg-bg border-border focus-visible:ring-primary rounded-md border px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2"
          />
          <div className="flex items-center justify-between gap-2">
            {has && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-fg-muted hover:text-fg text-[11px]"
              >
                Limpar
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-primary text-[11px] font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ isCompleted }: { isCompleted: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
        isCompleted ? 'bg-accent/15 text-accent' : 'bg-primary-subtle text-primary'
      }`}
    >
      {isCompleted ? <CheckCircle2 size={12} /> : null}
      {isCompleted ? 'Finalizado' : 'Ativo'}
    </span>
  );
}

function CardMenu({
  cardId,
  boardId,
  onArchive,
}: {
  cardId: string;
  boardId: string;
  onArchive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyUrl() {
    const url = `${window.location.origin}/b/${boardId}?card=${cardId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  function openNewTab() {
    const url = `${window.location.origin}/b/${boardId}?card=${cardId}`;
    window.open(url, '_blank', 'noopener');
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-fg-muted hover:text-fg focus-visible:ring-primary rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2"
        aria-label="Mais ações"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="border-border bg-bg absolute right-0 top-full z-20 mt-1 flex w-56 flex-col rounded-md border p-1 text-xs shadow-lg">
            <MenuItem disabled label="Duplicar card" icon={<Copy size={14} />} />
            <MenuItem disabled label="Criar card filho" icon={<Copy size={14} />} />
            <MenuItem disabled label="Tornar filho de..." icon={<Copy size={14} />} />
            <div className="border-border my-1 border-t" />
            <MenuItem
              label={copied ? 'URL copiada' : 'Copiar URL do card'}
              icon={<LinkIcon size={14} />}
              onClick={copyUrl}
            />
            <MenuItem
              label="Abrir em nova aba"
              icon={<ExternalLink size={14} />}
              onClick={openNewTab}
            />
            <div className="border-border my-1 border-t" />
            <MenuItem
              label="Arquivar card"
              icon={<Archive size={14} />}
              danger
              onClick={() => {
                setOpen(false);
                onArchive();
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-left transition-colors ${
        disabled
          ? 'text-fg-subtle cursor-not-allowed'
          : danger
            ? 'text-danger hover:bg-danger-subtle'
            : 'text-fg hover:bg-bg-muted'
      }`}
    >
      {icon}
      <span>{label}</span>
      {disabled && <span className="text-fg-subtle ml-auto text-[10px]">em breve</span>}
    </button>
  );
}

function MembersInline({ card }: { card: CardDetail }) {
  const lead = card.members[0];
  const rest = card.members.slice(1);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-fg-muted text-[11px] uppercase tracking-wide">Líder</span>
        {lead ? (
          <div
            className="bg-primary-subtle text-primary flex size-6 items-center justify-center rounded-full text-[10px] font-semibold"
            title={lead.user.name}
          >
            {initials(lead.user.name)}
          </div>
        ) : (
          <span className="text-fg-subtle text-[11px]">—</span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-fg-muted text-[11px] uppercase tracking-wide">Equipe</span>
        {rest.length === 0 ? (
          <span className="text-fg-subtle text-[11px]">—</span>
        ) : (
          <div className="flex -space-x-1.5">
            {rest.slice(0, 4).map((m) => (
              <div
                key={m.userId}
                className="border-bg bg-primary-subtle text-primary flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-semibold"
                title={m.user.name}
              >
                {initials(m.user.name)}
              </div>
            ))}
            {rest.length > 4 && (
              <div className="border-bg bg-bg-muted text-fg-muted flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-semibold">
                +{rest.length - 4}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberAvatar({ name }: { name: string }) {
  return (
    <div className="bg-primary-subtle text-primary flex size-6 items-center justify-center rounded-full text-[9px] font-semibold">
      {initials(name)}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function plainTextToDoc(text: string): unknown {
  const paragraphs = text.split(/\n{2,}/).map((p) => ({
    type: 'paragraph',
    content: p.length > 0 ? [{ type: 'text', text: p }] : [],
  }));
  return { type: 'doc', content: paragraphs };
}
