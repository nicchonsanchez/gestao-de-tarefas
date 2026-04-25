'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronsUp,
  Copy,
  ExternalLink,
  Layers,
  Link as LinkIcon,
  Loader2,
  Lock,
  MoreHorizontal,
  Paperclip,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '@ktask/ui';
import {
  archiveCard,
  cardsQueries,
  deleteCardPermanent,
  unassignMember,
  updateCard,
  uploadAttachment,
  type CardDetail,
} from '@/lib/queries/cards';
import { RichEditor } from '@/components/editor';
import { UserAvatar } from '@/components/user-avatar';
import { TimelineFeed } from './timeline-feed';
import { LeadPicker } from './lead-picker';
import { TeamPicker } from './team-picker';
import { ChecklistBlock } from './checklist-block';
import { AttachmentsBlock } from './attachments-block';
import { DueDatePicker } from './due-date-picker';
import { DuplicateCardDialog } from './duplicate-card-dialog';
import { CreateChildCardDialog } from './create-child-card-dialog';
import { CardSidebarTabs, type CardTab } from './card-sidebar-tabs';
import { CardFlowsTab } from './card-flows-tab';
import { CardFamilyTab } from './card-family-tab';

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
      <DialogContent
        hideClose
        className="h-[100dvh] max-h-[100dvh] w-screen max-w-[100vw] gap-0 overflow-hidden rounded-none p-0 sm:h-[calc(100vh-4rem)] sm:max-h-[960px] sm:w-[calc(100vw-4rem)] sm:max-w-[1200px] sm:rounded-md"
      >
        {query.isLoading && (
          <div className="flex h-full items-center justify-center">
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

  const descMut = useMutation({
    mutationFn: (doc: unknown) => updateCard(card.id, { description: doc }),
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

  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [createChildOpen, setCreateChildOpen] = useState(false);
  const [tab, setTab] = useState<CardTab>('home');

  const deleteMut = useMutation({
    mutationFn: () => deleteCardPermanent(card.id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <header className="border-border flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
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
            className="w-full bg-transparent text-base font-semibold tracking-tight focus:outline-none sm:text-lg"
          />
          <p className="text-fg-muted mt-0.5 text-xs">
            Em <span className="text-fg">{card.list.name}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <DueDatePicker value={card.dueDate} onChange={(iso) => dueDateMut.mutate(iso)} />
          <span className="hidden sm:inline-flex">
            <StatusBadge isCompleted={isCompleted} />
          </span>
          <CardMenu
            cardId={card.id}
            boardId={boardId}
            busy={deleteMut.isPending}
            onArchive={() => {
              if (confirm('Arquivar este card?')) archiveMut.mutate();
            }}
            onDuplicate={() => setDuplicateOpen(true)}
            onCreateChild={() => setCreateChildOpen(true)}
            onDelete={() => {
              const confirmation = prompt(
                `Excluir "${card.title}" permanentemente?\n\nEsta ação é IRREVERSÍVEL — o card, comentários, checklists e anexos serão apagados.\n\nDigite "EXCLUIR" para confirmar:`,
              );
              if (confirmation === 'EXCLUIR') deleteMut.mutate();
            }}
          />
          <div className="bg-border mx-1 h-6 w-px" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-fg-muted hover:bg-bg-muted hover:text-fg focus-visible:ring-primary inline-flex size-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Corpo: sidebar de abas (esquerda) + conteúdo da aba */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <CardSidebarTabs tab={tab} onChange={setTab} />

        {tab !== 'home' && (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {tab === 'flows' && <CardFlowsTab card={card} />}
            {tab === 'family' && <CardFamilyTab card={card} />}
          </div>
        )}

        {tab === 'home' && (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_400px]">
            {/* Coluna esquerda — dados */}
            <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-6 py-5">
              {/* Líder + Equipe + Privacidade */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <MembersInline card={card} boardId={boardId} />
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
                <RichEditor
                  value={card.description}
                  onChange={(doc) => descMut.mutate(doc)}
                  placeholder="Escrever detalhes do card..."
                  isSaving={descMut.isPending}
                  onUploadImage={async (file) => {
                    const att = await uploadAttachment(card.id, file, { embedded: true });
                    if (!att.publicUrl) {
                      throw new Error('Imagem enviada, mas a URL pública não está disponível.');
                    }
                    return { src: att.publicUrl, alt: att.fileName };
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

              {/* Prioridade + Lista (prazo mora no header).
                  O bloco "Contatos" foi removido por equivoco de modelo: no
                  Ummense "Contatos" significa contatos externos (clientes,
                  fornecedores) — diferente de membros da equipe. A feature
                  real esta planejada em tarefas-md/19-contatos-externos.md. */}
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

                  <div className="text-fg-muted flex items-center gap-2 text-[11px]">
                    <Layers size={12} />
                    <span>
                      Em <span className="text-fg">{card.list.name}</span>
                    </span>
                  </div>
                </div>
              </Block>

              {/* Tarefas do card */}
              <Block icon={<ChecklistIcon />} label={tarefasDoCardLabel(card)}>
                <ChecklistBlock card={card} boardId={boardId} />
              </Block>

              {/* Anexos */}
              <Block icon={<Paperclip size={14} />} label={`Anexos (${card.attachments.length})`}>
                <AttachmentsBlock card={card} boardId={boardId} />
              </Block>
            </div>

            {/* Coluna direita — Timeline */}
            <aside className="border-border bg-bg-subtle flex min-h-0 flex-col overflow-hidden border-t md:border-l md:border-t-0">
              <div className="border-border flex shrink-0 items-center gap-2 border-b px-5 py-3">
                <h3 className="text-sm font-semibold">Timeline</h3>
              </div>
              <div className="flex min-h-0 flex-1 flex-col px-5 py-3">
                <TimelineFeed
                  cardId={card.id}
                  boardId={boardId}
                  comments={card.comments}
                  activities={card.activities}
                />
              </div>
            </aside>
          </div>
        )}
      </div>

      <DuplicateCardDialog card={card} open={duplicateOpen} onOpenChange={setDuplicateOpen} />
      <CreateChildCardDialog
        parent={card}
        open={createChildOpen}
        onOpenChange={setCreateChildOpen}
      />
    </div>
  );
}

/* ---------------- sub-componentes ---------------- */

function tarefasDoCardLabel(card: CardDetail): string {
  let total = 0;
  let done = 0;
  for (const cl of card.checklists) {
    total += cl.items.length;
    done += cl.items.filter((it) => it.isDone).length;
  }
  if (total === 0) return 'Tarefas do card';
  return `Tarefas do card (${done}/${total})`;
}

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
  onDuplicate,
  onDelete,
  onCreateChild,
  busy,
}: {
  cardId: string;
  boardId: string;
  onArchive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCreateChild: () => void;
  busy: boolean;
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
        disabled={busy}
        className="text-fg-muted hover:text-fg focus-visible:ring-primary rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
        aria-label="Mais ações"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="border-border bg-bg absolute right-0 top-full z-20 mt-1 flex w-56 flex-col rounded-md border p-1 text-xs shadow-lg">
            <MenuItem
              label="Duplicar card"
              icon={<Copy size={14} />}
              onClick={() => {
                setOpen(false);
                onDuplicate();
              }}
            />
            <MenuItem
              label="Criar card filho"
              icon={<Copy size={14} />}
              onClick={() => {
                setOpen(false);
                onCreateChild();
              }}
            />
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
              onClick={() => {
                setOpen(false);
                onArchive();
              }}
            />
            <MenuItem
              label="Excluir card..."
              icon={<Trash2 size={14} />}
              danger
              onClick={() => {
                setOpen(false);
                onDelete();
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

function MembersInline({ card, boardId }: { card: CardDetail; boardId: string }) {
  const queryClient = useQueryClient();
  // "Equipe" = membros do card que não são o líder atual
  const team = card.members.filter((m) => m.userId !== card.leadId);

  const unassignMut = useMutation({
    mutationFn: (userId: string) => unassignMember(card.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardsQueries.detail(card.id).queryKey });
      queryClient.invalidateQueries({ queryKey: ['boards', boardId] });
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <LeadPicker card={card} boardId={boardId} />
      <div className="flex items-center gap-2">
        <span className="text-fg-muted text-[11px] uppercase tracking-wide">Equipe</span>
        <TeamPicker card={card} boardId={boardId} />
        {team.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {team.slice(0, 4).map((m) => (
              <RemovableTeamAvatar
                key={m.userId}
                user={m.user}
                onRemove={() => unassignMut.mutate(m.userId)}
                disabled={unassignMut.isPending}
              />
            ))}
            {team.length > 4 && (
              <span className="border-bg bg-bg-muted text-fg-muted inline-flex size-6 shrink-0 select-none items-center justify-center rounded-full border-2 text-[10px] font-semibold">
                +{team.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RemovableTeamAvatar({
  user,
  onRemove,
  disabled,
}: {
  user: { id: string; name: string; avatarUrl: string | null };
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <span className="group/ta relative inline-flex">
      <UserAvatar name={user.name} userId={user.id} avatarUrl={user.avatarUrl} size="sm" stacked />
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="bg-bg border-bg text-fg-muted hover:text-danger absolute -right-1 -top-1 hidden size-3.5 items-center justify-center rounded-full border shadow-sm disabled:opacity-50 group-hover/ta:flex"
        aria-label={`Remover ${user.name}`}
        title="Remover do card"
      >
        <X size={9} />
      </button>
    </span>
  );
}
