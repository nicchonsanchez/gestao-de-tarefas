import type { ActivityNode } from '@/lib/queries/cards';

const FIELD_LABELS: Record<string, string> = {
  title: 'o título',
  description: 'a descrição',
  priority: 'a prioridade',
  dueDate: 'o prazo',
  startDate: 'a data de início',
  estimateMinutes: 'a estimativa',
};

const SIMPLE_LABELS: Record<string, string> = {
  CARD_CREATED: 'criou o card',
  CARD_ARCHIVED: 'arquivou o card',
  CARD_RESTORED: 'desarquivou o card',
  CARD_COMPLETED: 'finalizou o card',
  CARD_UNCOMPLETED: 'reabriu o card',
  CARD_ASSIGNED: 'atribuiu um membro',
  CARD_UNASSIGNED: 'removeu um membro',
  CARD_PARENT_LINKED: 'vinculou como filho',
  CARD_PARENT_UNLINKED: 'desvinculou do pai',
  COMMENT_ADDED: 'comentou',
  COMMENT_EDITED: 'editou um comentário',
  COMMENT_DELETED: 'excluiu um comentário',
  ATTACHMENT_ADDED: 'anexou um arquivo',
  ATTACHMENT_REMOVED: 'removeu um anexo',
  MEMBER_JOINED_BOARD: 'entrou no quadro',
  TIME_ENTRY_STARTED: 'iniciou cronômetro',
  TIME_ENTRY_STOPPED: 'parou cronômetro',
  TIME_ENTRY_CREATED: 'lançou tempo manual',
  TIME_ENTRY_UPDATED: 'editou um lançamento de tempo',
  TIME_ENTRY_DELETED: 'removeu um lançamento de tempo',
};

export function activityLabel(a: ActivityNode): string {
  const p = (a.payload ?? {}) as Record<string, unknown>;

  // Mensagens compostas dependem do payload — montadas aqui:
  switch (a.type) {
    case 'CARD_UPDATED': {
      const fields = Array.isArray(p.fields) ? (p.fields as string[]) : [];
      if (fields.length === 0) return 'atualizou o card';
      if (fields.length === 1) {
        const label = FIELD_LABELS[fields[0]!] ?? fields[0]!;
        return `alterou ${label}`;
      }
      // Múltiplos campos: lista todos
      const parts = fields.map((f) => FIELD_LABELS[f] ?? f);
      const last = parts.pop();
      return `alterou ${parts.join(', ')} e ${last}`;
    }

    case 'CARD_MOVED': {
      const from = typeof p.fromListName === 'string' ? p.fromListName : null;
      const to = typeof p.toListName === 'string' ? p.toListName : null;
      const board = typeof p.boardName === 'string' ? p.boardName : null;
      if (from && to && board) {
        return `moveu o card da coluna "${from}" para "${to}" no fluxo ${board}`;
      }
      if (from && to) return `moveu o card de "${from}" para "${to}"`;
      return 'moveu o card';
    }

    case 'CARD_LEAD_CHANGED': {
      // Sem nomes resolvidos no payload, mantém genérico
      return 'mudou o líder';
    }

    case 'CHECKLIST_CREATED': {
      const title = typeof p.title === 'string' ? p.title : null;
      return title ? `criou a lista "${title}"` : 'criou uma lista de tarefas';
    }

    case 'CHECKLIST_RENAMED': {
      const from = typeof p.fromTitle === 'string' ? p.fromTitle : null;
      const to = typeof p.toTitle === 'string' ? p.toTitle : null;
      if (from && to) return `renomeou a lista "${from}" para "${to}"`;
      return 'renomeou uma lista de tarefas';
    }

    case 'CHECKLIST_DELETED': {
      const title = typeof p.title === 'string' ? p.title : null;
      return title ? `excluiu a lista "${title}"` : 'excluiu uma lista de tarefas';
    }

    case 'CHECKLIST_ITEM_CREATED': {
      const text = typeof p.text === 'string' ? p.text : null;
      return text ? `adicionou a tarefa "${text}"` : 'adicionou uma tarefa';
    }

    case 'CHECKLIST_ITEM_RENAMED': {
      const from = typeof p.fromText === 'string' ? p.fromText : null;
      const to = typeof p.toText === 'string' ? p.toText : null;
      if (from && to) return `renomeou a tarefa "${from}" para "${to}"`;
      return 'renomeou uma tarefa';
    }

    case 'CHECKLIST_ITEM_DELETED': {
      const text = typeof p.text === 'string' ? p.text : null;
      return text ? `excluiu a tarefa "${text}"` : 'excluiu uma tarefa';
    }

    case 'CHECKLIST_ITEM_DONE': {
      const text = typeof p.text === 'string' ? p.text : null;
      return text ? `concluiu a tarefa "${text}"` : 'concluiu uma tarefa';
    }

    case 'CHECKLIST_ITEM_UNDONE': {
      const text = typeof p.text === 'string' ? p.text : null;
      return text ? `reabriu a tarefa "${text}"` : 'reabriu uma tarefa';
    }

    case 'LABEL_ADDED': {
      const name = typeof p.labelName === 'string' ? p.labelName : null;
      return name ? `adicionou a etiqueta "${name}"` : 'adicionou uma etiqueta';
    }
    case 'LABEL_REMOVED': {
      const name = typeof p.labelName === 'string' ? p.labelName : null;
      return name ? `removeu a etiqueta "${name}"` : 'removeu uma etiqueta';
    }

    default:
      return SIMPLE_LABELS[a.type] ?? a.type.toLowerCase().replace(/_/g, ' ');
  }
}

/**
 * Detalhe extra renderizado *depois* do label (cinza claro). Hoje usamos só
 * pra atividades que precisam de complemento além da mensagem principal.
 * A maioria dos tipos já embute tudo na label.
 */
export function activityDetail(_a: ActivityNode): string | null {
  return null;
}
