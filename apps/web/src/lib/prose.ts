/**
 * Helpers para lidar com body JSON do Tiptap/ProseMirror no MVP.
 * No MVP o editor envia plainText; o backend converte para um doc simples.
 * Aqui renderizamos de volta pra texto pra exibir.
 */

interface ProseNode {
  type?: string;
  text?: string;
  content?: ProseNode[];
}

export function proseToPlainText(body: unknown): string {
  if (typeof body === 'string') return body;
  if (!body || typeof body !== 'object') return '';

  function walk(node: ProseNode): string {
    if (typeof node.text === 'string') return node.text;
    if (Array.isArray(node.content)) {
      return node.content.map(walk).join('');
    }
    return '';
  }

  const root = body as ProseNode;
  if (!root.content) return '';

  // Cada parágrafo filho vira uma linha
  return root.content.map((p) => walk(p)).join('\n');
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'agora';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d atrás`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
