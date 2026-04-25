# 20 — UX/UI Patterns aplicados (catálogo vivo)

> **Objetivo:** referência prática pra padrões já decididos e aplicados no KTask. Quando for mexer no front, **leia este doc primeiro** pra manter consistência. Toda nova feature que introduz pattern novo adiciona uma seção aqui.
>
> **Não duplica** o [07-design-system.md](07-design-system.md) (tokens, paleta, princípios visuais base). Este doc é sobre **patterns aplicados** — composições, decisões de interação, anti-patterns.
>
> **Atualizado em 2026-04-25** com pesquisa de fontes externas (Refactoring UI, Linear, Vercel, Notion, Apple HIG, Material 3, Fluent 2, WCAG 2.2, Heydon Pickering, Rauno Freiberg). Material bruto preservado em [\_research-design-2026-04-25.md](_research-design-2026-04-25.md).

## Como usar

1. **Antes de criar componente novo**, busque aqui se já existe pattern análogo.
2. **Antes de quebrar um pattern existente**, justifique por que (e atualize o doc se for nova decisão).
3. **Ao terminar uma feature** que introduziu pattern reutilizável, **adicione seção** aqui.
4. Cada pattern referencia arquivos com `path:linha` pra navegação rápida quando aplicável.

---

## 0. Princípios fundamentais (norteadores)

Quando estiver em dúvida sobre uma decisão de UI, volte aqui. Estes 7 princípios saem todos do que fazem Linear, Vercel, Notion, refactoringui.com e os design systems oficiais (HIG/Material/Fluent/Carbon/Polaris) — destilados pra contexto SaaS B2B interno.

### 0.1 Hierarquia por de-emphasis (Refactoring UI)

**Não destaque o importante; apague o secundário.** Reduza saturação/contraste/peso do que é metadado, e o conteúdo principal emerge sozinho.

**Exemplos no KTask**: avatares de membros da equipe são pequenos e neutros, contadores de comentários/anexos são ícones leves; só o título do card está em alto contraste. Em listas de cards, o "fluxo" e o "tempo relativo" são `text-fg-muted text-[11px]`, o título é `text-sm font-semibold text-fg`.

### 0.2 Peso e cor antes de tamanho (Refactoring UI)

Pra criar hierarquia de tipografia, **mexa em font-weight e cor primeiro**. Tamanho grande pesa demais em UI densa.

- Títulos de card: `font-semibold text-fg`
- Metadados: `font-normal text-fg-muted text-[11px]`
- Subhead/labels uppercase: `text-[10px] font-semibold tracking-wide uppercase`

Use no máximo 2-3 tamanhos por tela (`text-xs`, `text-sm`, `text-base`). `text-lg+` só em headers de página.

### 0.3 Eixo primário vs secundário

Cada tela tem **uma** ação principal (botão `bg-primary`), o resto é ghost/link/outline.

**Exemplos KTask**: header do board tem só "Configurações" + "Filtrar" como ghost; "Adicionar card" é ghost no fim da coluna pra não competir com cards reais. "Criar quadro" é primário só na página `/quadros`.

### 0.4 Espaçamento por agrupamento (Lei da Proximidade)

Itens relacionados ficam **mais juntos** que grupos diferentes. Use a escala discreta `4 / 8 / 12 / 16 / 24 / 32 / 48` (Tailwind spacing). Nunca valor arbitrário.

**Exemplos KTask**:

- Dentro do card: `gap-2` entre título/labels
- Entre cards na coluna: `gap-3`
- Entre colunas: `gap-4`
- Padding interno de coluna > gap entre cards (sinaliza container)

### 0.5 Densidade onde há repetição

**Listas/Kanban toleram densidade alta; modais e formulários pedem ar.**

KTask: Kanban com cards compactos (sem `padding` exagerado, `text-sm`). Modal de card aberto é generoso (gap-5 entre seções, padding-6 nas blocks).

### 0.6 5 estados de elementos interativos (Carbon, Fluent)

Todo elemento interativo expõe: **default, hover, focus, pressed, disabled**.

- `focus-visible` 2px + offset (WCAG 2.2 AA)
- `disabled`: `opacity-50` + `cursor-not-allowed`
- `pressed`: `:active` darken 8-12% (subtle)

**Anti-pattern**: `outline: none` sem substituto. Sempre garantir foco visível.

### 0.7 Cor semântica universal (não decoração)

| Função            | Token KTask                                   |
| ----------------- | --------------------------------------------- |
| Ação primária     | `bg-primary text-primary-fg`                  |
| Sucesso           | `text-success` / `bg-success/15 text-success` |
| Aviso             | `text-warning` / `bg-warning-subtle`          |
| Erro/destrutivo   | `text-danger` / `bg-danger-subtle`            |
| Info/neutro       | `text-fg-muted`                               |
| Acento decorativo | `bg-accent` (teal)                            |

**Nunca use cor como único sinal** — sempre acompanhe de ícone OU texto. Daltonismo + leitor de tela exigem isso.

---

## 1. Layout e composição

### 1.1 Listas de cards em árvore (família, busca, indicadores)

**Pattern:**

- Grid template fixo compartilhado entre todos os tipos de row:
  ```
  grid-cols-[minmax(0,1fr)_180px_110px_75px_75px_28px] gap-3
  ```
  Colunas: Título · Fluxo+Barra · Avatares · Tempo · Prazo · Menu
- Indentação por nível via `paddingLeft: indent * 28px` no wrapper externo (não no grid). Mantém alinhamento das colunas mesmo em níveis diferentes.
- **Faixa lateral colorida** (`border-l-4`) usando `Board.color` quando setada.
- **Click em qualquer parte da row** abre o card.

**Implementado em:** [card-family-tab.tsx:175](apps/web/src/components/board/card-family-tab.tsx#L175)

### 1.2 Modal de conteúdo (card, board settings, etc)

- **Mobile (<sm):** fullscreen — `h-[100dvh] w-screen max-w-[100vw] rounded-none`
- **Desktop (sm+):** centralizado — `sm:h-[calc(100vh-4rem)] sm:max-w-[1200px] sm:w-[calc(100vw-4rem)] sm:rounded-md`
- **Layout interno:** `flex flex-col` com header fixo no topo + conteúdo scrollável
- Em modais com sidebar de abas: `flex` row entre `<CardSidebarTabs>` (largura fixa) + conteúdo (`flex-1`)

### 1.3 Header global (Topbar)

- Altura fixa `h-[52px]` em desktop
- Layout: `[Logo] [|] [Nav central]  ··· flex-1 ···  [Search][Timer][Bell][Theme] | [Avatar+Nome]`
- **Mobile:** nav central some do header e vai pra **segunda linha** abaixo (`hidden sm:flex` no nav primário, segundo nav `sm:hidden`)
- Avatar do user esconde o nome em <md (`hidden md:inline`)

### 1.4 Sidebar de abas (dentro do modal)

- Largura fixa `w-[72px] shrink-0`
- Vertical: ícones (Lucide) + label `text-[10px] uppercase tracking-wide`
- Indicador de ativo: barra `bg-primary w-[3px]` na borda esquerda

### 1.5 Breakpoints semânticos (Material/Carbon)

- `sm`: 640px (mobile portrait/landscape)
- `md`: 768px (tablet portrait)
- `lg`: 1024px (tablet landscape / desktop pequeno)
- `xl`: 1280px (desktop comum)

Exigência: tudo deve ser **utilizável** em sm. Funcionalidades secundárias (sidebars, abas) podem reorganizar.

---

## 2. Inputs e seletores

### 2.1 Combobox com search inline (board picker, list picker, member picker)

- Trigger: `<button>` com label do valor + `<ChevronDown>`
- Aberto: dropdown com `<input>` de busca no topo + lista filtrada
- Largura responsiva: `w-[min(Xrem,calc(100vw-1rem))]` pra evitar overflow em mobile
- Z-index 30 (popover) + overlay invisível pra fechar ao clicar fora
- Escape key fecha
- Estados: loading (spinner), empty ("Nenhum resultado"), filtrado
- **A11y**: usar `cmdk` (já no shadcn `Command`) ou React Aria `useComboBox` em vez de inventar.

### 2.2 Chips removíveis

```tsx
<span className="bg-bg-muted inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1.5">
  <Avatar size="sm" />
  <span className="max-w-[140px] truncate">{name}</span>
  <button onClick={onRemove}>
    <X size={11} />
  </button>
</span>
```

X é botão clicável separado (não a chip toda).

### 2.3 Avatares stacked com hover-X

- Lista de até N avatares com `-space-x-1.5` + `+N` chip se passar
- Hover no avatar individual mostra X pequeno no canto. `bg-bg border-bg shadow-sm`.

### 2.4 Toggle "Selecionar todas"

- Switch toggle no topo (não checkbox) — diferencia visualmente de "marcar item"
- Items disabled mostram `text-fg-subtle` + `cursor-not-allowed` + tag "em breve" à direita

---

## 3. Estados (loading, empty, error, success)

### 3.1 Empty States — 4 tipos

| Tipo                 | Quando                     | Tom                                                    | KTask exemplo                                                 |
| -------------------- | -------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| **First-use**        | Usuário nunca teve dados   | Convidativo + CTA primário + atalho                    | `/quadros` vazio: "Crie seu primeiro fluxo" + botão + `Cmd+N` |
| **User-cleared**     | Zerou tarefas/inbox        | Positivo, sem CTA agressivo                            | "Tudo em dia"                                                 |
| **No-results**       | Filtro/busca retornou zero | Mostrar critérios + "limpar filtros"                   | Search Ctrl+K vazio                                           |
| **Error/permission** | Falha ou sem acesso        | Causa + ação ("Tentar novamente" / "Solicitar acesso") | Board sem permissão                                           |

**Pattern:** ilustração leve **opcional** (sem ela ainda funciona). 1 frase explicando + 1 ação primária.

**Anti-pattern:** "Nada aqui" / "Lista vazia" sem contexto. Sempre dizer **o que o usuário pode fazer**.

### 3.2 Skeleton vs Spinner

| Caso                                      | Use                                                            | Por quê                       |
| ----------------------------------------- | -------------------------------------------------------------- | ----------------------------- |
| Carregamento >400ms com layout previsível | Skeleton (forma real)                                          | Reduz percepção de espera     |
| Carregamento <300ms                       | Spinner pequeno OU nada                                        | Skeleton flicka               |
| Submit de form                            | Spinner no botão                                               | Operação curta, indeterminada |
| Re-fetch de dado já cached                | **Stale-while-revalidate** (mostra cache + indicador discreto) | Sem skeleton, sem spinner     |

**Skeleton bem feito:**

- Shapes batem com layout final (mesma altura, mesmas colunas)
- Shimmer sutil 1.2-1.5s (não psicodélico)
- **Progressive reveal**: revelar por seção conforme dados chegam (não tudo de uma vez)

### 3.3 Stale-while-revalidate (Vercel/Linear pattern)

Quando voltar a uma tela já visitada:

1. Mostra dado cached **imediatamente** (TanStack Query default)
2. Refetch em background
3. Atualiza **sem flash** quando chega resposta

**Anti-pattern:** mostrar skeleton por cima de dado já existente.

### 3.4 Loading inline em mutations

- Botão clicado: `<Loader2 className="animate-spin" size={14} />` **dentro do botão**, antes do label
- Botão fica `disabled={mut.isPending}` (não esconde)
- Operações longas: linha de status sutil ("Enviando imagem…", "Salvando…")

---

## 4. Toast / Notifications

> **Stack recomendado pro KTask**: `sonner` (já vem no shadcn). Não temos toast hoje — pendente implementar como dep da próxima feature que precisar.

### 4.1 Stacking

- Empilhar com escala/opacidade decrescentes
- Expandir on-hover (mostra todos lado a lado)
- Max 3 visíveis simultâneos
- Posição: bottom-right desktop, top mobile

### 4.2 Undo inline (Gmail-style)

**Quando usar**: ação destrutiva reversível.

- Toast por 5-7s com botão "Desfazer"
- **Executa a ação só após timeout** (optimistic delete)
- Cancelar = cancelar mutation
- Caso real: arquivar card, mover entre colunas, deletar checklist

**Anti-pattern**: confirm dialog modal pra ação reversível. Toast undo é mais rápido e menos invasivo.

### 4.3 Durações por tipo

| Tipo    | Duração     | Comportamento  |
| ------- | ----------- | -------------- |
| Success | 4s          | Auto-dismiss   |
| Info    | 5s          | Auto-dismiss   |
| Warning | 6s          | Auto-dismiss   |
| Error   | Persistente | Dismiss manual |

**Sempre pausar timer on-hover/focus.**

### 4.4 Promise toast

```tsx
toast.promise(saveCard(), {
  loading: 'Salvando...',
  success: 'Card salvo',
  error: (e) => `Erro: ${e.message}`,
});
```

Usar em mutations com sucesso/erro claros.

### 4.5 Live region (a11y)

Toasts já usam `role="status"` ou `aria-live="polite"`. Eventos críticos podem usar `assertive`.

---

## 5. Forms

### 5.1 Stack: react-hook-form + zod

Schema único compartilhado com API (DTO do NestJS):

```ts
// packages/contracts/src/cards.ts
export const CreateCardSchema = z.object({
  title: z.string().min(1).max(120),
  ...
});

// front
const form = useForm({ resolver: zodResolver(CreateCardSchema) });
```

### 5.2 Validação on-blur, NÃO on-change inicial

**Quando validar:**

1. **on-blur** após primeiro touch — não interromper digitação
2. **on-change** depois que erro existe — corrigir feedback imediato
3. **on-submit** valida tudo

**Anti-pattern:** validar on-change desde o primeiro caractere ("Email inválido" antes de terminar de digitar).

### 5.3 Layout de campo

```
┌─────────────────────────────┐
│ Label (sempre visível)      │
├─────────────────────────────┤
│ Input com valor             │
├─────────────────────────────┤
│ Helper cinza (acima ou      │
│  abaixo, fixo)              │
└─────────────────────────────┘
```

Ao haver erro: helper é **substituído** (mesmo lugar) por mensagem em `text-danger` + ícone.

```tsx
<Input aria-invalid={hasError} aria-describedby={`${id}-msg`} />
<p id={`${id}-msg`} className={hasError ? 'text-danger' : 'text-fg-muted'} role={hasError ? 'alert' : undefined}>
  {hasError ? errorMessage : helperText}
</p>
```

**Anti-pattern**: placeholder como label ("Email" só dentro do input). Sempre `<label>` visível.

### 5.4 Async validation (unicidade)

- Debounce 400ms após `change`
- Indicador "verificando..." inline
- Success check (✓ verde) quando válido
- Casos: slug de board, e-mail de convite

### 5.5 Submit

- Botão primário com label do verbo: "Criar card", "Salvar alterações"
- `disabled` enquanto inválido OU pending
- Spinner inline durante submit

---

## 6. Motion design

### 6.1 Stack

`framer-motion` quando precisa de layout animations / shared layout. Senão, CSS transitions são mais leves.

### 6.2 Durations + easings

| Tipo                             | Duração                   | Easing                         |
| -------------------------------- | ------------------------- | ------------------------------ |
| Micro (hover, toggle)            | 150-200ms                 | ease-out                       |
| Transições de UI (modal, drawer) | 250-300ms                 | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Entrada de página                | 400ms                     | ease-in-out                    |
| Spring natural (drag)            | tension/friction defaults | spring                         |

**Anti-pattern**: animação >500ms em ação produtiva. Bounce em apps profissionais (parece brinquedo).

### 6.3 Layout animations

```tsx
<motion.div layout transition={{ duration: 0.2 }} />
```

- Reorder de cards no Kanban
- Lista de comentários ao expandir/colapsar
- Adição/remoção de chips

### 6.4 Shared layout (peek/morph)

```tsx
<motion.div layoutId={`card-${id}`} />
```

- Card → modal expandido (Linear-style peek)
- Imagem do thumbnail → lightbox

### 6.5 prefers-reduced-motion

```tsx
const reduced = useReducedMotion();
<motion.div animate={reduced ? false : { x: 100 }} />;
```

**Sempre respeitar.** Substituir animações por fade simples ou nada quando o usuário pediu.

### 6.6 Stagger discreto em listas

`staggerChildren: 0.03-0.05`. Acima vira lento.

### 6.7 Interruptible animations (Rauno)

Animação em curso deve poder ser cancelada/revertida (clicar em outro lugar para o drag, fechar modal interrompe entrada).

### 6.8 Quando NÃO animar

- Layout crítico (forms, listas que vão receber input imediato)
- Em sequência (B só anima depois de A terminar) → frustra power user
- Loading > 300ms em transição (vira gargalo)

---

## 7. Acessibilidade (essencial, não compliance)

### 7.1 Foco visível sempre

```tsx
className = 'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';
```

Nunca `outline-none` sem substituto.

### 7.2 Skip link

```tsx
<a href="#main" className="sr-only focus:not-sr-only">
  Pular para conteúdo
</a>
```

No layout root, antes da topbar.

### 7.3 Modais com Radix Dialog

- `<DialogTitle>` sempre presente (mesmo `sr-only` se design não pede label visível)
- `<DialogDescription>` ou `aria-describedby` apontando pro corpo
- Trap, ESC, focus return — Radix já cuida

### 7.4 Listas semânticas

- `<ul role="list">` com `<li>` filhos
- Item interativo: `<button>` (não `<div onClick>`)
- Selecionável: `role="listbox"` + `role="option"` + `aria-selected`

### 7.5 Combobox APG

Não inventar. Usar `cmdk` do shadcn (`Command`) ou React Aria `useComboBox`.

### 7.6 Drag-drop acessível

- `@dnd-kit` tem `KeyboardSensor` + `announcements` (live region) — ativar
- Sempre fornecer **alternativa por teclado** via menu de contexto: "Mover card → ..." abre lista de colunas/posições

### 7.7 Live regions pra eventos assíncronos

```tsx
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

- Toasts (sonner já faz)
- Notificações em tempo real (sininho): `polite` quando chega
- Updates de board não anunciar (ruidoso demais)

### 7.8 Contraste mínimo

- WCAG 2.2 AA: 4.5:1 texto normal, 3:1 texto grande/UI
- Validar tokens com [Stark](https://www.getstark.co/) ou DevTools
- Ponto de atenção: labels coloridas com texto branco — vermelho/amarelo costumam falhar

### 7.9 Form errors

```tsx
<input aria-invalid={hasError} aria-describedby={`${id}-error`} />
<p id={`${id}-error`} role="alert">{error}</p>
```

react-hook-form + shadcn `Form` já gera ids corretos — auditar forms custom (login, criar quadro, convite).

---

## 8. Interação

### 8.1 Click na row inteira vs botões internos

- Row clicável: `<div role="button" tabIndex={0} onClick onKeyDown>`
- Botões internos (menu, ações específicas): `<div data-row-action>` ao redor + `e.stopPropagation()` no click
- Handler:
  ```ts
  if ((e.target as HTMLElement).closest('[data-row-action]')) return;
  open();
  ```

### 8.2 Drag-drop com touch (dnd-kit)

- `MouseSensor` separado de `TouchSensor`
- Touch: **long-press 250ms** pra ativar drag (evita conflito com scroll)
- Visual: `opacity-0.4` no item dragged + `ring-primary/40` na droppable

### 8.3 Drop zone de arquivos

- Wrapper outermost com `onDragEnter/Leave/Over/Drop`
- `dragCounter` ref pra rastrear nested enter/leave
- Visual feedback: `ring-2 ring-primary` quando arrastando
- Aceita só `Files` (`e.dataTransfer.types.includes('Files')`)

### 8.4 Diálogo de conflito de estado

Quando ação implica ação destrutiva implícita (parar timer ativo pra iniciar outro):

- Detectar **no client** antes de chamar API
- Modal com 2 botões: ghost à esquerda (destrutiva) + primary à direita (não-destrutiva)
- Mostrar contexto do estado atual ("atualmente em: Card X · 00:25:14")

### 8.5 Optimistic updates (Linear-style)

Mutations aplicam **no client antes** do server confirmar. TanStack Query:

```tsx
const mut = useMutation({
  mutationFn: ...,
  onMutate: async (vars) => {
    await queryClient.cancelQueries({ queryKey });
    const prev = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, optimisticUpdate(prev, vars));
    return { prev };
  },
  onError: (_err, _vars, ctx) => {
    queryClient.setQueryData(queryKey, ctx?.prev);
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey }),
});
```

**Quando aplicar**: drag-drop de card, edição inline de título, toggle de checklist, etc. Tudo que parece "instantâneo".

### 8.6 Inline editing universal (Notion-style)

- Sem modal pra edições simples (título, descrição, checklist item)
- Click no campo → vira input
- Save on blur com debounce 500-800ms
- Visual: hover destaca leve borda `hover:bg-bg-subtle`, foco mostra border

---

## 9. Power user

### 9.1 Command Palette (Cmd+K) — pendente

**Status**: search global atual é busca; falta um **command palette** com ações ("Criar card", "Mover", "Atribuir a X").

**Pattern Linear/Vercel**:

- `Cmd+K` (Mac) / `Ctrl+K` (Win) abre palette modal
- Lista contextual: ações disponíveis no contexto atual + busca global
- Itens com keyboard hint: `[C] Criar card`, `[M] Mover`

**Stack**: `cmdk` do shadcn (já temos no `Command`).

### 9.2 Atalhos single-key

Ações frequentes têm atalho **sem modificador**:

- `C`: criar card
- `?`: mostra cheat sheet de atalhos
- `Esc`: fecha modal/popover
- `/`: foca search
- Setas: navegar entre cards/colunas

**Mostrar** em tooltips (ex: "Criar card · `C`").

### 9.3 Onboarding contextual (Superhuman)

Em vez de tour modal antecipado, **tooltips no momento do uso**:

- Hover na coluna vazia → "Press C to create"
- Primeira vez que abre o card → tooltip explicando atalhos

Pattern em vez de:

- ❌ Modal de boas-vindas com 5 slides
- ❌ "Spotlight tour" com setas

### 9.4 Density toggle (futuro)

Linear: usuário escolhe compact/comfortable. Power users com 50+ cards/coluna querem compact.

Pendente implementar. Por agora, default "regular".

---

## 10. Microcopy

### 10.1 Verbos diretos em botões

| ❌ Genérico                   | ✅ Direto      |
| ----------------------------- | -------------- |
| "Enviar"                      | "Criar quadro" |
| "OK"                          | "Sim, excluir" |
| "Confirmar"                   | "Mover card"   |
| "Salvar" (em form de criação) | "Criar card"   |

### 10.2 Confirmações na voz do usuário

Diálogo: "Excluir card permanentemente?"
Botão: "Sim, excluir" (não "OK")

### 10.3 Empty states

| ❌ Frio          | ✅ Convidativo                                     |
| ---------------- | -------------------------------------------------- |
| "Nenhum card"    | "Crie seu primeiro card"                           |
| "Lista vazia"    | "Adicione um card pra começar"                     |
| "Sem resultados" | "Não encontramos cards com este filtro · [limpar]" |

### 10.4 Erros

- Específico: o que falhou + ação
- ❌ "Erro" / "Algo deu errado"
- ✅ "Não conseguimos salvar este card. Tentar novamente."

### 10.5 Tom

- **Direto, não formal.** "Você" é OK, "Vossa Senhoria" não.
- **Sem exclamações.** Produto profissional não fica gritando.
- **Sem emojis em UI/CLI/seeds** (regra global do projeto). Em mensagens de notificação WA/email pra humanos, ainda evitar — manter consistência.

---

## 11. Mobile

### 11.1 Modal fullscreen em mobile

Ver §1.2.

### 11.2 Popovers responsivos

```tsx
className = 'w-[min(20rem,calc(100vw-1rem))]';
```

Todo dropdown/popover com largura fixa em rem/px.

### 11.3 Touch targets mínimos

- Botões: `size-9` (36px) mínimo, `size-10` (40px) ideal
- HIG/Material recomenda 44x44 / 48x48 — adotamos 36 como mínimo aceitável (seguindo shadcn) com hit area expandida via padding
- Drag handles: ativação 250ms (long-press) pra distinguir de scroll

### 11.4 Tipografia mínima legível

- Texto principal: nunca abaixo de `text-xs` (12px)
- Metadata: `text-[11px]` é OK
- `text-[10px]` ou `[9px]`: só decoração/badges, nunca info crítica

---

## 12. Anti-patterns (NÃO fazer)

### 12.1 Placeholder `—` pra valores ausentes

❌ `{date ? formatDate(date) : '—'}`
✅ Retornar `null` ou esconder coluna. Em grid, retornar `<div />` vazio mantém alinhamento sem ruído.

### 12.2 Blocos duplicados que parecem features diferentes

Caso real evitado: bloco "Equipe" no header E "Contatos" no body editando o mesmo `card.members`. Ver [doc 19](19-contatos-externos.md).

### 12.3 Cores cruas (`bg-emerald-500`, `text-blue-600`, etc)

❌ Tailwind colors crus — quebram dark mode + não respeitam o design system.
✅ Sempre tokens do projeto (ver §0.7).

### 12.4 `<img>` sem `alt` ou Next `<Image>` desnecessário

- Avatares e thumbs de attachments S3/MinIO: `<img>` regular OK (Next Image complica com URLs externas)
- Sempre `alt` (vazio se decoração, descritivo caso contrário)
- **NÃO** adicionar `eslint-disable-next-line @next/next/no-img-element` — a regra não tá registrada no projeto, quebra o lint

### 12.5 Seletores Zustand v5 que retornam objeto novo

❌

```tsx
const { a, b } = useStore((s) => ({ a: s.a, b: s.b }));
```

Causa loop infinito.

✅

```tsx
const a = useStore((s) => s.a);
const b = useStore((s) => s.b);
```

Caso real: [bda1525](https://github.com/kharis-edu/gestao-de-tarefas/commit/bda1525).

### 12.6 Validação on-change desde o primeiro caractere

Frustra usuário. Validar on-blur após primeiro touch + on-submit. Ver §5.2.

### 12.7 Comentário decorativo extenso

Comentário curto **só quando o "porquê" não é óbvio** — workaround, decisão não-trivial, hidden constraint.

### 12.8 Spinner pra carregamento >400ms

Spinner em loading longo é frustrante. Usar skeleton (forma real do conteúdo) que reduz percepção de espera. Ver §3.2.

### 12.9 Confirm dialog modal pra ação reversível

Pra arquivar, mover, soft-delete — usar **toast undo** em vez de modal. Ver §4.2.

### 12.10 Animação >500ms em ação produtiva

Bloqueia o fluxo. Mantenha micro-interações em 150-300ms. Ver §6.2.

### 12.11 Cor como único sinal de estado

Daltonismo + leitor de tela exigem **cor + ícone + texto**. Etiqueta vermelha sem ícone de "alerta" é problema.

### 12.12 Modal de boas-vindas / tour com setas

Ver §9.3. Tooltips contextuais são mais eficazes.

---

## 13. Convenções por componente principal

### 13.1 Timer widget

- Posição: entre `<SearchTrigger>` e `<NotificationsBell>` no Topbar
- Idle: ícone `<Play>` apenas (verde)
- Running: pílula `<Pause>` + tempo `font-mono tabular-nums` + `<Maximize2>` (magenta)
- Click no Play sem card no contexto: alerta nativo
- Click no Play com `?card=X` no URL: inicia direto
- Click no Play com timer já rodando em outro card: abre `<ActiveTimerConflictDialog>`

### 13.2 Card family tab

- Layout em árvore com indent progressivo de 28px por nível
- Pai (depth 0) sem indent. Card atual + irmãos (depth 1). Filhos/netos/bisnetos (depth 2-6)
- Card atual: `bg-primary-subtle/50` + faixa lateral colorida + pin `<MapPin>` flutuante
- Menu de 3 pontos em todas as rows (incluindo card atual): Duplicar, Criar filho, Tornar filho de... (em breve), Copiar URL, Abrir em nova aba, Desvincular

### 13.3 Comments e Activities (timeline)

- Layout 2 linhas: Nome (`text-sm font-semibold`) + tempo relativo (`text-[11px] text-fg-subtle`); mensagem na segunda
- Negrito (`text-fg font-semibold`) nos substantivos importantes (coluna, fluxo, tarefa, etiqueta)
- Avatar `size="md"` à esquerda, gap-3 com conteúdo
- Lista do feed: `gap-5 pt-4`
- Coalescing de CARD_UPDATED do mesmo autor em janela 60s

---

## 14. Padrões de dados (afetam UI)

### 14.1 Tempo relativo

`formatRelativeTime(iso)` de [`@/lib/prose`](apps/web/src/lib/prose.ts). "agora", "há X min", "há Xh", "há X dia(s)", "ontem".
Tooltip com data exata (pendente).

### 14.2 Tempo absoluto

```ts
new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
```

Sempre forçar `pt-BR`. Em listas: dia + mês curto ("25 abr"). Em modais: completo.

### 14.3 Anexos S3/MinIO

- Backend retorna `publicUrl` hidratado — **sempre** usar isso, nunca construir URL no front
- Filtros:
  - `commentId IS NULL && embedded = false` → anexo direto do card (seção "Anexos")
  - `commentId IS NULL && embedded = true` → imagem inline na descrição (não aparece em lista)
  - `commentId IS NOT NULL` → anexo de comment (renderizado dentro do comment)

### 14.4 Cores funcionais derivadas

`dueDateColor(iso)`: vencido → danger+bold, <24h → danger, <3d → warning, normal → fg-muted.

---

## 15. Como adicionar pattern novo aqui

1. Implementou algo reutilizável? Identifique a categoria.
2. Adicione subseção com:
   - **Quando usar** (situações)
   - **Pattern** (regra ou snippet)
   - **Implementado em** (path:linha)
   - **Anti-pattern evitado** (se aplicável)
3. Linkar de outros docs (`07-design-system.md`, `checklist.md`) quando relevante.
4. Commitar **junto com a feature** que introduziu (não em commit separado de doc).

---

## 16. Pendências de implementação (referenciadas neste doc)

Patterns documentados que ainda não temos em código:

- [ ] **Toast/Notification system** com `sonner` — undo inline, durações por tipo, promise toasts (§4)
- [ ] **Skeleton screens** pra board, modal de card, lista de notificações (§3.2)
- [ ] **Empty states** em cada caso (first-use, no-results, error) — hoje só temos placeholder genérico (§3.1)
- [ ] **Optimistic updates** em mutations principais (drag-drop, edit inline) — §8.5
- [ ] **Command Palette (Cmd+K)** com ações além de busca (§9.1)
- [ ] **Atalhos single-key** + cheat sheet `?` (§9.2)
- [ ] **Inline editing** universal (não só descrição) (§8.6)
- [ ] **Skip link** no layout root (§7.2)
- [ ] **Drag-drop acessível**: `@dnd-kit` `KeyboardSensor` + announcements + menu "Mover para..." (§7.6)
- [ ] **Live region** pra notificações em tempo real (§7.7)
- [ ] **Auditar contraste** dos tokens custom (§7.8)
- [ ] **Layout animations** com framer (`<motion.div layout>`) em reorder de Kanban (§6.3)
- [ ] **Shared layout** card → modal (Linear peek) (§6.4)
- [ ] **`prefers-reduced-motion`** wrapper global (§6.5)

## 17. Pendências de doc

- [ ] Padrão de tabelas (timesheet, lista de membros, indicadores)
- [ ] Real-time presence cursors (Height-style)
- [ ] Density toggle (Linear)
- [ ] Slash commands no editor (Notion)
- [ ] Importação CSV pattern

## 18. Fontes de inspiração

Quando precisar resolver pattern não coberto aqui, consultar nessa ordem:

1. **Refactoring UI** (refactoringui.com) — princípios de hierarquia, espaçamento, cor
2. **Linear blog** (linear.app/blog) — patterns SaaS modernos, optimistic UI, command menu
3. **A11y Project + WAI-ARIA APG** — quando dúvida de acessibilidade
4. **Apple HIG / Material 3** — quando dúvida de princípio universal
5. **Inclusive Components** (Heydon Pickering) — componentes a11y específicos
6. **Sonner / cmdk / shadcn** — referência de implementação concreta (já estão no nosso stack)
7. **Rauno Freiberg** (rauno.me) — motion design e interruptible animations

Ver material bruto em [\_research-design-2026-04-25.md](_research-design-2026-04-25.md).
