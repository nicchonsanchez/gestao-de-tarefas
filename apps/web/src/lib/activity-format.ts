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

/**
 * Parte de uma mensagem de activity. Texto simples (string) ou trecho que
 * deve ser renderizado em negrito (`{ bold: string }`). O componente
 * <ActivityMessage> renderiza isso pra JSX.
 */
export type ActivityPart = string | { bold: string };

function fieldLabel(f: string): string {
  return FIELD_LABELS[f] ?? f;
}

function listFields(fields: string[]): ActivityPart[] {
  if (fields.length === 1) return [{ bold: fieldLabel(fields[0]!) }];
  if (fields.length === 2)
    return [{ bold: fieldLabel(fields[0]!) }, ' e ', { bold: fieldLabel(fields[1]!) }];
  // 3+: "X, Y e Z"
  const parts: ActivityPart[] = [];
  fields.forEach((f, i) => {
    parts.push({ bold: fieldLabel(f) });
    if (i < fields.length - 2) parts.push(', ');
    else if (i === fields.length - 2) parts.push(' e ');
  });
  return parts;
}

/**
 * Retorna a mensagem da activity como uma sequência de partes (texto simples
 * + trechos em negrito). Permite o componente renderizar com tipografia
 * rica (substantivos importantes em negrito).
 */
export function activityParts(a: ActivityNode): ActivityPart[] {
  const p = (a.payload ?? {}) as Record<string, unknown>;

  switch (a.type) {
    case 'CARD_UPDATED': {
      const fields = Array.isArray(p.fields) ? (p.fields as string[]) : [];
      if (fields.length === 0) return ['atualizou o card'];
      return ['alterou ', ...listFields(fields)];
    }

    case 'CARD_MOVED': {
      const from = typeof p.fromListName === 'string' ? p.fromListName : null;
      const to = typeof p.toListName === 'string' ? p.toListName : null;
      const board = typeof p.boardName === 'string' ? p.boardName : null;
      if (from && to && board) {
        return [
          'moveu o card da coluna ',
          { bold: from },
          ' para a coluna ',
          { bold: to },
          ' no fluxo ',
          { bold: board },
        ];
      }
      if (from && to) {
        return ['moveu o card da coluna ', { bold: from }, ' para ', { bold: to }];
      }
      return ['moveu o card'];
    }

    case 'CARD_LEAD_CHANGED':
      return ['mudou o líder'];

    case 'CHECKLIST_CREATED': {
      const title = typeof p.title === 'string' ? p.title : null;
      return title ? ['criou a lista ', { bold: title }] : ['criou uma lista de tarefas'];
    }

    case 'CHECKLIST_RENAMED': {
      const from = typeof p.fromTitle === 'string' ? p.fromTitle : null;
      const to = typeof p.toTitle === 'string' ? p.toTitle : null;
      if (from && to) return ['renomeou a lista ', { bold: from }, ' para ', { bold: to }];
      return ['renomeou uma lista de tarefas'];
    }

    case 'CHECKLIST_DELETED': {
      const title = typeof p.title === 'string' ? p.title : null;
      return title ? ['excluiu a lista ', { bold: title }] : ['excluiu uma lista de tarefas'];
    }

    case 'CHECKLIST_ITEM_CREATED': {
      const text = typeof p.text === 'string' ? p.text : null;
      return text ? ['adicionou a tarefa ', { bold: text }, ' ao card'] : ['adicionou uma tarefa'];
    }

    case 'CHECKLIST_ITEM_RENAMED': {
      const from = typeof p.fromText === 'string' ? p.fromText : null;
      const to = typeof p.toText === 'string' ? p.toText : null;
      if (from && to) return ['renomeou a tarefa ', { bold: from }, ' para ', { bold: to }];
      return ['renomeou uma tarefa'];
    }

    case 'CHECKLIST_ITEM_DELETED': {
      const text = typeof p.text === 'string' ? p.text : null;
      return text ? ['excluiu a tarefa ', { bold: text }] : ['excluiu uma tarefa'];
    }

    case 'CHECKLIST_ITEM_DONE': {
      const text = typeof p.text === 'string' ? p.text : null;
      return text ? ['concluiu a tarefa ', { bold: text }] : ['concluiu uma tarefa'];
    }

    case 'CHECKLIST_ITEM_UNDONE': {
      const text = typeof p.text === 'string' ? p.text : null;
      return text ? ['reabriu a tarefa ', { bold: text }] : ['reabriu uma tarefa'];
    }

    case 'LABEL_ADDED': {
      const name = typeof p.labelName === 'string' ? p.labelName : null;
      return name ? ['adicionou a etiqueta ', { bold: name }] : ['adicionou uma etiqueta'];
    }
    case 'LABEL_REMOVED': {
      const name = typeof p.labelName === 'string' ? p.labelName : null;
      return name ? ['removeu a etiqueta ', { bold: name }] : ['removeu uma etiqueta'];
    }

    default:
      return [SIMPLE_LABELS[a.type] ?? a.type.toLowerCase().replace(/_/g, ' ')];
  }
}

/** Versão "string" da mensagem (sem formatação) — útil em contextos plain. */
export function activityLabel(a: ActivityNode): string {
  return activityParts(a)
    .map((p) => (typeof p === 'string' ? p : p.bold))
    .join('');
}

/** Detalhe extra. Hoje tudo já vai embutido em activityParts. */
export function activityDetail(_a: ActivityNode): string | null {
  return null;
}
