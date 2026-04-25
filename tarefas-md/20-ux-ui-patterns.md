# 20 — UX/UI Patterns aplicados (catálogo vivo)

> **Objetivo:** referência prática pra padrões já decididos e aplicados no KTask. Quando for mexer no front, **leia este doc primeiro** pra manter consistência. Toda nova feature que introduz pattern novo adiciona uma seção aqui.
>
> **Não duplica** o [07-design-system.md](07-design-system.md) (tokens, paleta, princípios). Este doc é sobre **patterns aplicados** — composições, decisões de interação, anti-patterns.

## Como usar

1. **Antes de criar componente novo**, busque aqui se já existe pattern análogo.
2. **Antes de quebrar um pattern existente**, justifique por que (e atualize o doc se for nova decisão).
3. **Ao terminar uma feature** que introduziu pattern reutilizável, **adicione seção** aqui.
4. Cada pattern referencia arquivos com `path:linha` pra navegação rápida.

---

## 1. Layout e composição

### 1.1 Listas de cards em árvore (família, busca, indicadores)

**Quando usar:** rendering de lista de cards onde a hierarquia importa (pais, filhos, irmãos).

**Pattern:**

- Cada row usa **grid template fixo** compartilhado entre todos os tipos:
  ```
  grid-cols-[minmax(0,1fr)_180px_110px_75px_75px_28px] gap-3
  ```
  Colunas: Título · Fluxo+Barra · Avatares · Tempo · Prazo · Menu
- Indentação por nível via `paddingLeft: indent * 28px` no wrapper externo (não no grid). Mantém alinhamento das colunas mesmo em níveis diferentes.
- **Faixa lateral colorida** (`border-l-4`) usando `Board.color` quando setada — identifica fluxo sem ler o nome.
- **Click em qualquer parte da row** abre o card (`role="button"` + `onClick` no container, `data-row-action` no menu pra evitar duplo disparo).

**Implementado em:** [card-family-tab.tsx:175](apps/web/src/components/board/card-family-tab.tsx#L175)

**Anti-pattern evitado:** título + fluxo + barra empilhados na esquerda. Quebra varredura visual quando há muitos rows.

### 1.2 Modal de conteúdo (card, board settings, etc)

**Pattern:**

- **Mobile (<sm):** fullscreen — `h-[100dvh] w-screen max-w-[100vw] rounded-none`
- **Desktop (sm+):** centralizado com margem — `sm:h-[calc(100vh-4rem)] sm:max-w-[1200px] sm:w-[calc(100vw-4rem)] sm:rounded-md`
- **Layout interno:** `flex flex-col` com header fixo no topo e conteúdo scrollável
- Em modais com sidebar de abas: `flex` row entre `<CardSidebarTabs>` (largura fixa) + conteúdo (`flex-1`)

**Implementado em:** [card-modal.tsx:73](apps/web/src/components/board/card-modal.tsx#L73), [board-settings-dialog.tsx](apps/web/src/components/board/board-settings-dialog.tsx)

### 1.3 Header global (Topbar)

**Pattern:**

- Altura fixa `h-[52px]` em desktop
- Layout: `[Logo] [|] [Nav central]  ··· flex-1 ···  [Search][Timer][Bell][Theme] | [Avatar+Nome]`
- **Mobile:** nav central some do header e vai pra **segunda linha** abaixo (`hidden sm:flex` no nav primário, segundo nav `sm:hidden`)
- Avatar do user esconde o nome em <md (`hidden md:inline`)
- Separadores `bg-border/70 h-5 w-px` entre grupos lógicos

**Implementado em:** [topbar.tsx](apps/web/src/components/topbar.tsx)

### 1.4 Sidebar de abas (dentro do modal)

**Pattern:**

- Largura fixa `w-[72px] shrink-0`
- Vertical: ícones (Lucide) + label `text-[10px] uppercase tracking-wide`
- Indicador de ativo: barra `bg-primary w-[3px]` na borda esquerda
- Footer com timer placeholder (substituído por widget real depois)

**Implementado em:** [card-sidebar-tabs.tsx:29](apps/web/src/components/board/card-sidebar-tabs.tsx#L29)

---

## 2. Inputs e seletores

### 2.1 Combobox com search inline (board picker, list picker, member picker)

**Pattern:**

- Trigger: `<button>` com label do valor selecionado + `<ChevronDown>`
- Quando aberto: dropdown com `<input>` de busca no topo + lista filtrada abaixo
- Largura responsiva: `w-[min(Xrem,calc(100vw-1rem))]` pra evitar overflow em mobile
- Z-index 30 (popover) + overlay invisível `fixed inset-0 z-[anterior-1]` pra fechar ao clicar fora
- Escape key fecha
- Estados: loading (spinner), empty ("Nenhum resultado"), filtrado

**Implementado em:** [create-child-card-dialog.tsx:351](apps/web/src/components/board/create-child-card-dialog.tsx) (BoardCombobox)

### 2.2 Chips removíveis (TeamPicker, anexos pendentes)

**Pattern:**

```tsx
<span className="bg-bg-muted inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1.5">
  <Avatar size="sm" />
  <span className="max-w-[140px] truncate">{name}</span>
  <button onClick={onRemove}>
    <X size={11} />
  </button>
</span>
```

- Avatar dentro do chip quando representa pessoa
- `truncate` + `max-w-[Xpx]` no nome
- X é um botão clicável separado (não a chip toda)

**Implementado em:** [team-picker.tsx](apps/web/src/components/board/team-picker.tsx), [timeline-feed.tsx](apps/web/src/components/board/timeline-feed.tsx) (pending attachments)

### 2.3 Avatares stacked com hover-X (Equipe inline)

**Pattern:**

- Lista de até N avatares com `-space-x-1.5` (sobreposição) + `+N` chip se passar
- **Hover no avatar individual** mostra X pequeno no canto superior direito
- X tem `bg-bg border-bg shadow-sm` (parece flutuar acima do avatar)
- Sem botão visível em repouso — descoberta por exploração

```tsx
<span className="group/ta relative inline-flex">
  <UserAvatar size="sm" stacked />
  <button className="absolute -right-1 -top-1 hidden size-3.5 group-hover/ta:flex ...">
    <X size={9} />
  </button>
</span>
```

**Implementado em:** [card-modal.tsx](apps/web/src/components/board/card-modal.tsx) (RemovableTeamAvatar)

### 2.4 Toggle "Selecionar todas" + lista de checkboxes

**Pattern:**

- Switch toggle no topo (não checkbox) — diferencia visualmente do "marcar item"
- Checkboxes individuais abaixo
- Items disabled mostram `text-fg-subtle` + `cursor-not-allowed` + tag "em breve" à direita

**Implementado em:** [create-child-card-dialog.tsx](apps/web/src/components/board/create-child-card-dialog.tsx)

---

## 3. Feedback visual

### 3.1 Estados de timer (idle/running)

**Pattern:**

- **Idle:** pílula compacta verde (`bg-success/15 text-success`) — só ícone Play
- **Running:** pílula expandida magenta (`bg-fuchsia-600 text-white`) — Pause + tempo + ícone expandir
- **Tempo é sempre `Date.now() - startedAt`** (não acumular contador local) — sobrevive a refresh, sleep, mudança de aba

**Implementado em:** [timer-widget.tsx](apps/web/src/components/time-tracking/timer-widget.tsx)

### 3.2 Prazo colorido por urgência

**Pattern:**

```ts
function dueDateColor(iso: string | null): string {
  if (!iso) return 'text-fg-muted';
  const days = (new Date(iso).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return 'text-danger font-semibold'; // vencido
  if (days < 1) return 'text-danger'; // <24h
  if (days < 3) return 'text-warning'; // próximo
  return 'text-fg-muted';
}
```

**Onde aplicar:** qualquer lugar que mostre `dueDate` de um card numa lista.

**Implementado em:** [card-family-tab.tsx:159](apps/web/src/components/board/card-family-tab.tsx#L159)

### 3.3 Coalescing de eventos repetidos

**Quando aplicar:** activities/notifications onde a mesma ação do mesmo autor em janela curta tendem a ser ruído (ex: editar descrição 5 vezes em 30s).

**Pattern (backend):**

- Função `upsertRecentActivity({ ..., coalesceWindowSec: 60, mergeFields: true })`
- Verifica se há activity existente com mesma chave (`organizationId, cardId, actorId, type`) nos últimos N segundos
- Se sim, faz `UPDATE` mergeando payloads e bumpando `createdAt`
- Se não, cria nova
- **Coalescing só agrupa mesmo autor** — múltiplas pessoas mantêm registros separados

**Implementado em:** [cards.service.ts:upsertRecentActivity](apps/api/src/modules/cards/cards.service.ts) (CARD_UPDATED)

### 3.4 Mensagens de activity com negrito em substantivos

**Pattern:** mensagens de timeline retornam `Array<string | { bold: string }>` em vez de string. Componente renderiza com `<strong>` nas partes-chave.

```ts
case 'CARD_MOVED':
  return [
    'moveu o card da coluna ',
    { bold: from },
    ' para a coluna ',
    { bold: to },
    ' no fluxo ',
    { bold: board },
  ];
```

**Onde aplicar:** qualquer lista de eventos/auditoria com nomes de entidades (cards, colunas, fluxos, tarefas, etiquetas).

**Implementado em:** [activity-format.ts](apps/web/src/lib/activity-format.ts)

### 3.5 Estados de loading inline (mutations)

**Pattern:**

- Botão clicado durante mutation: spinner pequeno (`<Loader2 className="animate-spin" size={14} />`) **dentro do botão**, antes do label
- Botão fica `disabled={mutation.isPending}` (não esconde)
- Para uploads/operações longas: linha de status sutil ("Enviando imagem...", "Salvando...")

---

## 4. Interação

### 4.1 Click na row inteira vs botões internos

**Pattern:**

- Row clicável: `<div role="button" tabIndex={0} onClick={...} onKeyDown={...}>`
- Botões internos (menu, ações específicas): `<div data-row-action>` ao redor + `e.stopPropagation()` no click
- Função handler verifica:
  ```ts
  function onRowClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-row-action]')) return;
    open();
  }
  ```

**Implementado em:** [card-family-tab.tsx:336](apps/web/src/components/board/card-family-tab.tsx#L336)

### 4.2 Drag-drop com touch (mobile + desktop)

**Pattern dnd-kit:**

- Sensor diferenciado: `MouseSensor` separado de `TouchSensor` — touch precisa de **long-press 250ms** pra ativar drag (evita conflito com scroll)
- Visual feedback: `opacity-0.4` no item dragged + `ring-primary/40` na droppable de destino
- Optimistic update no React Query cache (não esperar resposta do server)

**Implementado em:** [page.tsx (board)](<apps/web/src/app/(app)/b/[boardId]/page.tsx>)

### 4.3 Drop zone de arquivos (timeline)

**Pattern:**

- Wrapper outermost com handlers `onDragEnter/Leave/Over/Drop`
- Counter ref (`dragCounter`) pra rastrear nested enter/leave (eventos disparam em filhos também)
- Visual feedback: `ring-2 ring-primary` quando arrastando
- Aceita `Files` only (filtra outros tipos)

```ts
function onDragEnter(e: React.DragEvent) {
  e.preventDefault();
  if (Array.from(e.dataTransfer.types).includes('Files')) {
    dragCounter.current += 1;
    setDragActive(true);
  }
}
```

**Implementado em:** [timeline-feed.tsx](apps/web/src/components/board/timeline-feed.tsx)

### 4.4 Diálogo de confirmação para troca de estado conflitante

**Quando usar:** ação destrutiva implícita (parar timer ativo pra iniciar outro).

**Pattern:**

- Detectar conflito **no client antes** de chamar a API
- Modal com:
  - Título descrevendo o estado atual
  - Texto explicando o que vai acontecer
  - **2 botões**: ação destrutiva (ghost, à esquerda) + ação não-destrutiva (primary, à direita)
- Sempre mostrar contexto do estado atual (ex: "atualmente em: Card X · 00:25:14")

**Implementado em:** [active-timer-conflict-dialog.tsx](apps/web/src/components/time-tracking/active-timer-conflict-dialog.tsx)

---

## 5. Mobile

### 5.1 Modal fullscreen em mobile

Ver §1.2.

### 5.2 Popovers responsivos

**Pattern:** sempre usar `w-[min(Xrem,calc(100vw-1rem))]` em popovers/dropdowns que poderiam estourar 320px.

```tsx
className = 'w-[min(20rem,calc(100vw-1rem))]';
```

**Onde aplicar:** todo dropdown/popover com largura fixa em px ou rem.

### 5.3 Touch targets mínimos

- Botões interativos: mínimo `size-9` (36px) em mobile, `size-8` (32px) é o limite
- Links de texto pequeno: aumentar área clicável com `py-2` ou `padding inline`
- Drag handles em mobile: ativação 250ms (long-press) pra distinguir de scroll

### 5.4 Tipografia mínima legível

- Texto principal: nunca abaixo de `text-xs` (12px)
- Metadata (timestamps, hints): `text-[11px]` é OK
- `text-[10px]` ou `text-[9px]`: só pra **decoração/badges** (contadores, status), nunca pra info crítica
- Mobile: considerar subir 1 step (`text-xs` → `text-sm`) onde houver espaço

---

## 6. Anti-patterns (NÃO fazer)

### 6.1 Placeholder `—` pra valores ausentes

**Errado:**

```tsx
{
  date ? formatDate(date) : '—';
}
```

**Certo:** retornar `null` ou esconder a coluna inteira. Em layouts em grid, retornar `<div />` vazio mantém o alinhamento sem ruído.

```tsx
function DueDate({ date }) {
  if (!date) return <div />;
  return <span>{formatDate(date)}</span>;
}
```

### 6.2 Blocos duplicados que parecem features diferentes

**Errado:** ter "Equipe" no header do card e "Contatos" no body — ambos editam o mesmo `card.members`.

**Certo:** uma fonte da verdade visual. Se quiser duas representações, deixe explícito que é "vista alternativa", não componente independente.

**Caso real evitado:** [doc 19 - contatos-externos](19-contatos-externos.md) (no Ummense, "Contatos" é entidade separada — clientes externos. Não confundir com membros do card.)

### 6.3 Cores cruas (`bg-emerald-500`, `text-blue-600`, etc)

**Errado:** Tailwind colors crus — quebram dark mode + não respeitam o design system.

**Certo:** sempre usar tokens do projeto:

- Estado positivo: `bg-success/15 text-success`
- Atenção: `bg-warning-subtle text-warning`
- Erro: `bg-danger-subtle text-danger`
- Primary action: `bg-primary text-primary-fg`
- Acento decorativo: `bg-accent` (teal)

**Exceção rara:** o magenta do timer running (`bg-fuchsia-600`) — único lugar onde fugimos do token, justificado por reproduzir Ummense fielmente.

### 6.4 `<img>` sem `alt` ou Next `<Image>` desnecessário

- Avatares e thumbnails de attachments: `<img>` regular OK (Next Image complica com URLs externas do MinIO/S3)
- Sempre passar `alt` (vazio `alt=""` se decoração, descritivo caso contrário)
- Se o usuário tem `eslint-disable-next-line @next/next/no-img-element`: **não adicionar** — a regra não está registrada no projeto, vai quebrar o lint.

### 6.5 Seletores Zustand v5 que retornam objeto novo

**Errado (causa loop infinito):**

```tsx
const { conflict, closeConflict } = useTimerStore((s) => ({
  conflict: s.conflict,
  closeConflict: s.closeConflict,
}));
```

**Certo:**

```tsx
const conflict = useTimerStore((s) => s.conflict);
const closeConflict = useTimerStore((s) => s.closeConflict);
```

Ou usar `useShallow` se realmente precisar agrupar.

**Caso real:** quebrou o app em produção em [bda1525](https://github.com/kharis-edu/gestao-de-tarefas/commit/bda1525).

### 6.6 Comentário decorativo extenso

**Errado:** comentários multi-linha explicando o "que" do código (já é dito pelos identificadores).

**Certo:** comentário curto **só quando o "porquê" não é óbvio** — workaround, decisão não-trivial, hidden constraint.

---

## 7. Convenções por componente principal

### 7.1 Timer widget

- **Posição:** entre `<SearchTrigger>` e `<NotificationsBell>` no Topbar
- **Estado idle:** ícone `<Play>` apenas
- **Estado running:** ícone `<Pause>` + tempo `HH:MM:SS` em `font-mono tabular-nums` + ícone `<Maximize2>`
- **Click no Play sem card no contexto:** alerta nativo pedindo abrir um card primeiro (não abre combobox — desnecessário pra MVP)
- **Click no Play com `?card=X` no URL:** inicia direto
- **Click no Play com timer já rodando em outro card:** abre `<ActiveTimerConflictDialog>`

### 7.2 Card family tab

- Layout em árvore com indent progressivo de 28px por nível
- Pai (depth 0) sem indent. Card atual + irmãos (depth 1). Filhos/netos/bisnetos (depth 2-6).
- Card atual destacado com `bg-primary-subtle/50`, faixa lateral colorida, e pin `<MapPin>` flutuante.
- Menu de 3 pontos em todas as rows (incluindo card atual) — ações: Duplicar, Criar filho, Tornar filho de... (em breve), Copiar URL, Abrir em nova aba, Desvincular (pra rows não-atuais).

### 7.3 Comments e Activities (timeline)

- **Layout 2 linhas:** Nome (`text-sm font-semibold`) + tempo relativo (`text-[11px] text-fg-subtle`) na primeira; mensagem na segunda.
- Negrito (`text-fg font-semibold`) nos substantivos importantes (nome de coluna, fluxo, tarefa, etiqueta).
- Avatar `size="md"` à esquerda, gap-3 com conteúdo.
- Lista do feed: `gap-5 pt-4` (respiração).
- Coalescing de CARD_UPDATED do mesmo autor em janela 60s.

---

## 8. Padrões de **dados** (não-visual mas afeta UI)

### 8.1 Tempo relativo

- Sempre usar `formatRelativeTime(iso)` de [`@/lib/prose`](apps/web/src/lib/prose.ts)
- "agora", "há X min", "há Xh", "há X dia(s)", "ontem"
- Tooltip com data exata (futuro pendente)

### 8.2 Tempo absoluto em datas

- Formato BR: `new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })`
- Sempre forçar locale `pt-BR` — não confiar no default do browser
- Em listas: dia + mês curto ("25 abr"). Em modais: completo ("quinta, 25 de abril de 2026")

### 8.3 Anexos no S3/MinIO

- Backend retorna `publicUrl` hidratado — **sempre** usar isso, nunca construir URL no front
- Em dev: MinIO em `http://localhost:9000/ktask-attachments/`
- Em prod: S3 público
- Imagens com fallback `?? ''` no `src` pra evitar quebra com Image extension
- Filtros de listagem:
  - `commentId IS NULL && embedded = false` → anexo direto do card (seção "Anexos")
  - `commentId IS NULL && embedded = true` → imagem inline na descrição (não aparece em lista)
  - `commentId IS NOT NULL` → anexo de comment (renderizado dentro do comment)

---

## 9. Como adicionar pattern novo aqui

1. Implementou algo reutilizável? Identifique a categoria (Layout, Input, Feedback, Interação, Mobile, Anti-pattern, Convenção de componente).
2. Adicione subseção com:
   - **Quando usar** (situações)
   - **Pattern** (regra ou snippet)
   - **Implementado em** (path:linha)
   - **Anti-pattern evitado** (se aplicável)
3. Linkar de outros docs (`07-design-system.md`, `checklist.md`) quando relevante.
4. Commitar junto com a feature que introduziu (não em commit separado de doc).

## 10. Pendências de doc

- [ ] Padrão de Empty States (lista vazia, busca sem resultado, etc)
- [ ] Padrão de Skeleton de loading (cards, listas, modais)
- [ ] Padrão de Toast/Notification system (não temos ainda)
- [ ] Padrão de Forms (validação inline vs no submit)
- [ ] Acessibilidade: foco, leitores de tela, contraste mínimo
- [ ] Animations & motion (transitions, framer-motion?)
