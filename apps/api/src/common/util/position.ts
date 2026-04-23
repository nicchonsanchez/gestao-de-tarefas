/**
 * Helpers para posicionamento float de listas e cards.
 *
 * Convenção: novos itens são colocados no meio entre os vizinhos, multiplicando
 * por POSITION_STEP quando não há vizinhos. Um job periódico re-indexa quando
 * a diferença entre vizinhos fica abaixo de POSITION_MIN_GAP.
 */

export const POSITION_STEP = 1024;
export const POSITION_MIN_GAP = 1e-3;

/**
 * Calcula a posição de um item inserido entre `before` e `after`.
 *   - Sem vizinhos → POSITION_STEP.
 *   - Só `before` → before + POSITION_STEP (inserção no fim).
 *   - Só `after` → after / 2 (inserção no início).
 *   - Ambos → média.
 */
export function computeInsertPosition(before: number | null, after: number | null): number {
  if (before == null && after == null) return POSITION_STEP;
  if (before == null) return after! / 2;
  if (after == null) return before + POSITION_STEP;
  return (before + after) / 2;
}

/**
 * Indica se duas posições estão perto o suficiente pra disparar rebalanceamento.
 */
export function needsRebalance(a: number, b: number): boolean {
  return Math.abs(b - a) < POSITION_MIN_GAP;
}
