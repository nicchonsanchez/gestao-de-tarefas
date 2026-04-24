import type { ActivityNode } from '@/lib/queries/cards';

const LABELS: Record<string, string> = {
  CARD_CREATED: 'criou o card',
  CARD_UPDATED: 'atualizou o card',
  CARD_MOVED: 'moveu o card',
  CARD_ARCHIVED: 'arquivou o card',
  CARD_RESTORED: 'desarquivou o card',
  CARD_COMPLETED: 'finalizou o card',
  CARD_UNCOMPLETED: 'reabriu o card',
  CARD_ASSIGNED: 'atribuiu um membro',
  CARD_UNASSIGNED: 'removeu um membro',
  LABEL_ADDED: 'adicionou uma etiqueta',
  LABEL_REMOVED: 'removeu uma etiqueta',
  COMMENT_ADDED: 'comentou',
  COMMENT_EDITED: 'editou um comentário',
  COMMENT_DELETED: 'excluiu um comentário',
  CHECKLIST_CREATED: 'criou uma tarefa',
  CHECKLIST_ITEM_DONE: 'concluiu um item da tarefa',
  CHECKLIST_ITEM_UNDONE: 'reabriu um item da tarefa',
  ATTACHMENT_ADDED: 'anexou um arquivo',
  ATTACHMENT_REMOVED: 'removeu um anexo',
  MEMBER_JOINED_BOARD: 'entrou no quadro',
};

export function activityLabel(a: ActivityNode): string {
  return LABELS[a.type] ?? a.type.toLowerCase().replace(/_/g, ' ');
}

/**
 * Transforma activity em linha textual descritiva quando há payload útil.
 * Ex: "moveu o card de 'A fazer' para 'Em andamento'"
 */
export function activityDetail(a: ActivityNode): string | null {
  const p = a.payload ?? {};
  switch (a.type) {
    case 'CARD_MOVED': {
      const from = typeof p.fromListId === 'string' ? p.fromListId : null;
      const to = typeof p.toListId === 'string' ? p.toListId : null;
      if (from && to) return null; // listIds crus não ajudam o humano
      return null;
    }
    case 'LABEL_ADDED':
    case 'LABEL_REMOVED': {
      const name = typeof p.labelName === 'string' ? p.labelName : null;
      return name ? `"${name}"` : null;
    }
    default:
      return null;
  }
}
