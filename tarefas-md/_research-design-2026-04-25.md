# Research design 2026-04-25 — fontes brutas

> Arquivo de trabalho. **Não é doc final** — é o material bruto que serviu de base pra atualização do [20-ux-ui-patterns.md](20-ux-ui-patterns.md). Mantido pra rastreabilidade ("de onde veio essa decisão?") e pra futuras revisões. O `_` no nome do arquivo sinaliza que é nota interna.
>
> Pesquisa feita em 2026-04-25 via 5 agents paralelos cobrindo: Refactoring UI, apps modernos (Linear/Vercel/Notion/Height), acessibilidade, design systems oficiais (HIG/Material/Fluent/Carbon/Polaris) e patterns específicos (empty states/skeletons/toasts/forms/motion).

---

## 1. Refactoring UI (Adam Wathan + Steve Schoger)

### Hierarquia visual

- **Peso, não tamanho** — font-weight (500/600/700) e cor (gray-900 vs gray-500) antes de aumentar tamanho.
- **Hierarquia por de-emphasis** — não destacar o importante; apagar o secundário (reduz saturação/contraste do menos relevante).
- **Eixo primário vs secundário** — cada tela tem UMA ação principal (botão sólido), o resto é ghost/link.

### Espaçamento

- **Escala discreta**: 4/8/12/16/24/32/48 (Tailwind spacing). Nunca arbitrário.
- **White space proporcional ao agrupamento** — Lei da Proximidade: itens relacionados ficam mais juntos que grupos diferentes.

### Cor

- **Define funções, não decoração** — Primary = ação, success/warning/danger = estado, gray = 90% da UI.
- **HSL com saturação reduzida em backgrounds** — cor saturada só em CTAs e badges; resto cinza levemente tingido.

### Tipografia em UI

- **2-3 tamanhos no máximo** — text-xs (meta), text-sm (corpo), text-base (títulos de card). text-lg+ só em headers de página.
- **Line-height curto em UI densa** — leading-tight (1.2-1.3) em títulos, leading-normal em descrições longas.

### Density vs whitespace

- **Densidade onde há repetição** — listas/Kanban toleram; formulários e detalhe pedem ar.

### Estados

- **Empty states vendem o valor** — ilustração leve + 1 frase + CTA. Nunca "Nenhum item".
- **Loading com skeleton** — formato real do conteúdo, não spinners genéricos.
- **Error específico + ação** — "Não conseguimos salvar. Tentar novamente."

### Microcopy

- **Verbos diretos em botões** — "Criar quadro", não "Enviar".
- **Confirmações na voz do usuário** — "Excluir card permanentemente?" e botão "Sim, excluir".

**Fontes**: refactoringui.com, twitter.com/steveschoger, tailwindui.com, adamwathan.me

---

## 2. Apps modernos (Linear, Vercel, Notion, Height, Superhuman, Arc)

### Linear

- **Optimistic UI everywhere** — mutations aplicam instante; rollback no server error. "App should feel like it has no latency" (Karri Saarinen).
- **Command Menu (Cmd+K)** como primary nav — toda ação acessível por busca textual; reduz dependência de menus.
- **Keyboard-first com hints visuais** — atalhos single-key (C=create, A=assign, P=priority) mostrados em tooltips.
- **Skeleton screens com layout exato** — replicam estrutura final, não spinners genéricos.
- **Density toggle** — compact/comfortable; respeita preferência de power users.
- **Agrupamento colapsável** — sections com header sticky, count, expand/collapse persistido.

### Vercel

- **Prefetch agressivo no hover** — Next Link prefetch + dados via SWR no hover/focus.
- **Stale-while-revalidate** — mostra dado cached imediatamente, revalida em background, atualiza sem flash.

### Notion

- **Inline editing universal** — sem modais para edições simples; clica e edita no lugar. Save on blur com debounce.
- **Slash commands** — `/` abre menu contextual de blocos/ações no editor.

### Height

- **Real-time collaboration cursors** — presença visível sem ser intrusiva; avatares pequenos no canto.

### Superhuman

- **Toast undo de 5s para ações destrutivas** — em vez de confirm dialog, executa otimista com botão "Undo".
- **Onboarding 1:1 substituído por tooltips contextuais** — atalho exato no momento do uso, não tour antecipado.

### Arc

- **Empty states acionáveis** — empty state é CTA, não decoração. "Create your first issue (C)" com atalho.

### Cron / Notion Calendar

- **Transições spring (framer-motion)** — animações curtas (150-250ms) com easing natural; nunca bloqueiam input.

### Rauno Freiberg

- **Interruptible animations** — usuário pode cancelar/reverter animação em curso clicando em outro lugar.

**Fontes**: linear.app/blog, karrisaarinen.com, rauno.me, brianlovin.com, jordansinger.notion.site, vercel.com/blog, notion.so/blog, superhuman.com/blog

---

## 3. Acessibilidade (Heydon, Sara Soueidan, A11y Project, WCAG 2.2)

### Foco visível

- Nunca `outline: none` sem substituto. Use `focus-visible:ring-2 focus-visible:ring-ring`.

### Skip link

- `<a href="#main" class="sr-only focus:not-sr-only">Pular para conteúdo</a>` no layout root.

### Modais (Radix Dialog)

- Sempre `DialogTitle` (mesmo `sr-only`) + `aria-describedby`. Trap, ESC, focus return — Radix já faz.

### Listas selecionáveis

- `role="listbox"` + filhos `role="option"` com `aria-selected`. Em listas normais: `<ul><li>` semântico.

### Combobox / autocomplete

- Padrão APG: input + listbox separado, `aria-activedescendant`. Usar React Aria `useComboBox` ou `cmdk` (já no shadcn).

### Drag-drop acessível

- `@dnd-kit/core` tem `KeyboardSensor` + `announcements` (live region). Adicionar menu "Mover para..." como alternativa por teclado.

### Live regions

- `<div aria-live="polite" aria-atomic="true">` pra updates assíncronos. Toasts já fazem (sonner/Radix). Eventos críticos = `assertive`.

### Contraste

- WCAG 2.2 AA = 4.5:1 texto, 3:1 UI/foco. Validar `--muted-foreground` >= 4.5:1 contra `--background`.

### Erros de form

- `<input aria-invalid="true" aria-describedby="email-error">` + `<p id="email-error" role="alert">`. react-hook-form + shadcn `Form` já gera id correto.

**Fontes**: inclusive-components.design, a11yproject.com, w3.org/WAI/ARIA/apg, w3.org/TR/WCAG22, radix-ui.com, react-spectrum.adobe.com, sarasoueidan.com, moderncss.dev, docs.dndkit.com

---

## 4. Design systems oficiais (HIG, Material 3, Fluent 2, Carbon, Polaris)

### Affordance

- Elementos clicáveis devem PARECER clicáveis (elevação, contorno, cor, cursor).
- Botões: fill / outline / text em hierarquia clara. Cursor pointer sempre.

### 5 estados de elementos interativos

- default, hover, focus, pressed, disabled. Focus ring 2px sempre visível. Disabled com opacity 0.38–0.5.

### Grid / Layout

- Grid 4px ou 8px base. Spacing tokens múltiplos de 4 (4/8/12/16/24/32).
- Breakpoints semânticos: compact (<600), medium (600-905), expanded (>905-1240), large (>1240).

### Motion

- Micro-interações: 150-250ms ease-out. Transições de página: 300-400ms ease-in-out. Nunca animar layout crítico.

### Densidade

- Touch targets mínimo 44px (HIG) / 48dp (Material). Compact reduz padding mas mantém hit area.

### Cor semântica universal

- Vermelho=erro/destrutivo, Verde=sucesso, Amarelo=aviso, Azul=info/primário.
- Nunca usar cor como único sinal — sempre + ícone + texto. Contraste mínimo 4.5:1.

### Iconografia

- Ícone sozinho só se universalmente reconhecido (X, lixeira, +). Resto exige label OU tooltip obrigatório (após 500ms hover).

### Forms

- Label sempre visível (não usar placeholder como label).
- Helper text abaixo. Validação on-blur, não on-change. Erro em vermelho + ícone + texto.

**Fontes**: developer.apple.com/design/human-interface-guidelines, m3.material.io, fluent2.microsoft.design, carbondesignsystem.com, polaris.shopify.com

---

## 5. Patterns específicos (Empty States, Skeletons, Toasts, Forms, Motion)

### Empty States (4 tipos)

**1. First-use onboarding**

- Usuário nunca teve dados. 1 frase + CTA + ilustração leve.
- Ex: tela inicial sem boards.

**2. User-cleared (estado conquistado)**

- Usuário zerou inbox/tarefas. Tom positivo ("Tudo em dia"), sem CTA agressivo.

**3. No-results (busca/filtro)**

- Filtro retornou zero. Mostrar critérios aplicados + "limpar filtros".

**4. Error / permission empty**

- Falha ou sem acesso. Causa + ação ("Tentar novamente" / "Solicitar acesso").

### Skeleton screens

- **Skeleton para layouts conhecidos (>400ms)** — shape-matching dos blocos reais; shimmer 1.2-1.5s.
- **Spinner só para ações curtas/indeterminadas (<300ms)** ou submit.
- **Progressive reveal** — dados em partes (SSR + hydrate, socket); revelar por seção.
- **Stale-while-revalidate** — mostrar cache + indicador discreto de refetch. Sem skeleton.

### Toast / Notifications

- **Sonner-style stacking** — empilhar com escala/opacidade, expandir on-hover, max 3 visíveis. Bottom-right desktop, top mobile.
- **Undo inline (Gmail-style)** — toast 5-7s com "Desfazer"; executar ação só após timeout (optimistic delete).
- **Durações por tipo** — success 4s, info 5s, warning 6s, error persistente até dismiss. Pausar timer on-hover/focus.
- **Promise toast** — `toast.promise(fn, {loading, success, error})`.

### Forms

- **Validação on-blur + on-submit (NÃO on-change inicial)** — on-change só depois de erro existir.
- **Schema-driven (zod + react-hook-form)** — schema único compartilhado com API (DTO).
- **Error placement** — hint cinza permanente acima/abaixo, erro vermelho substitui hint. `aria-describedby` + `aria-invalid`.
- **Inline async validation** — debounce 400ms, indicador "verificando", success check.

### Motion

- **Durations curtas + easing natural** — 150-200ms micro (hover, toggle), 250-300ms transições, 400ms+ só pra entrada de página. Easing `cubic-bezier(0.4, 0, 0.2, 1)` ou spring suave.
- **Layout animations (framer `layout`)** — `<motion.div layout>` em cards do kanban; `LayoutGroup` em colunas.
- **Shared layout / morph** — `layoutId` pra card → modal expandido (Linear/Notion peek).
- **`prefers-reduced-motion`** — `useReducedMotion()` do framer; substituir por fade simples ou nada. Nunca animar >500ms se usuário pediu reduzido.
- **Stagger discreto** — `staggerChildren: 0.03-0.05`. Acima vira lento.

**Fontes**: nngroup.com, pagelaubheimer.com, smashingmagazine.com, linear.app/blog, sonner.emilkowal.ski, react-hot-toast.com, ui.shadcn.com/docs/components/sonner, react-hook-form.com, zod.dev, framer.com/motion, rauno.me, web.dev/prefers-reduced-motion

---

## Síntese: o que entra no doc 20

**Seções novas:**

- Princípios fundamentais (de Refactoring UI)
- Estados (Empty / Skeleton / Stale-while-revalidate)
- Toasts / Notifications
- Forms
- Motion
- Acessibilidade
- Power user (Cmd+K, atalhos, inline editing)
- Microcopy

**Seções existentes a refinar:**

- Layout: incluir grid 4/8 base, breakpoints semânticos
- Feedback visual: 5 estados padrão (default/hover/focus/pressed/disabled)
- Mobile: touch targets reforçar, densidade
- Anti-patterns: cores cruas, ícone sem label/tooltip, animações longas

**Pendências (futuras):**

- Slash commands no editor (Notion-style)
- Real-time presence cursors (Height-style)
- Density toggle (Linear-style)
- Onboarding contextual via tooltips (Superhuman)
