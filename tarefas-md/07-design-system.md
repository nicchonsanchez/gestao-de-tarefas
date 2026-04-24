# Design System — KTask

Documento único de referência para identidade visual, tokens, componentes e padrões de interação.

Inspirações visuais: **Linear**, **Height**, **Notion**, **Vercel Dashboard**. Anti-inspirações: Jira (caótico), Asana (pesado), Salesforce (caixas de caixas).

---

## 1. Princípios

1. **Clean > decorado** — nada de sombras pesadas, gradientes em UI interna ou ilustrações sem função.
2. **Hierarquia por tipografia e cor**, não por caixas coloridas empilhadas.
3. **Um único roxo** no ecossistema. Tudo mais é neutro + o teal de accent quando necessário.
4. **Whitespace generoso**. Menos densidade = mais foco. Kanban é exceção funcional.
5. **Velocidade percebida** — toda interação tem feedback < 100ms (skeleton, spinner, otimista).
6. **Teclado em primeiro lugar** — tudo navegável sem mouse. Atalhos visíveis em tooltips.
7. **Acessibilidade WCAG 2.1 AA**, não negociável.

## 2. Identidade

- **Nome**: KTask
- **Logo**: reutiliza a marca Kharis (arquivo na raiz). No produto, versão pequena com "KTask" em wordmark ao lado.
- **Favicon**: o "K" triangular da Kharis em violet-600 sobre fundo branco (light) / transparent (dark).
- **Tagline interna**: "Gestão de tarefas e fluxos da Kharis."

## 3. Paleta de cores (tokens)

Tokens semânticos. Nunca usar hex cru em componentes — sempre via CSS variable + utilitário Tailwind.

### 🌞 Light

| Token              | Hex           | Uso                                         |
| ------------------ | ------------- | ------------------------------------------- |
| `--bg`             | `#FFFFFF`     | fundo base                                  |
| `--bg-subtle`      | `#FAFAFA`     | áreas de navegação, topbar                  |
| `--bg-muted`       | `#F4F4F5`     | cards em lista, áreas secundárias           |
| `--bg-emphasis`    | `#E4E4E7`     | hover sutil de superfície                   |
| `--border`         | `#E4E4E7`     | divisores e bordas finas                    |
| `--border-strong`  | `#D4D4D8`     | bordas de input em foco                     |
| `--fg`             | `#0F0F12`     | texto principal                             |
| `--fg-muted`       | `#71717A`     | texto secundário, placeholders              |
| `--fg-subtle`      | `#A1A1AA`     | texto terciário, metadata                   |
| **`--primary`**    | **`#6D28D9`** | botão primário, link, item ativo            |
| `--primary-hover`  | `#5B21B6`     | hover primário                              |
| `--primary-fg`     | `#FFFFFF`     | texto sobre primário                        |
| `--primary-subtle` | `#F5F3FF`     | fundos de badges primários, highlight sutil |
| **`--accent`**     | **`#2EE8B8`** | success, destaques, badges positivos        |
| `--accent-hover`   | `#10B981`     | hover / darker variant                      |
| `--warning`        | `#F59E0B`     | alertas, SLA amarelo                        |
| `--warning-subtle` | `#FEF3C7`     | fundo de alerta                             |
| `--danger`         | `#DC2626`     | erros, ações destrutivas, SLA vermelho      |
| `--danger-subtle`  | `#FEE2E2`     | fundo de erro                               |
| `--info`           | `#2563EB`     | neutro-azulado para dicas                   |

### 🌙 Dark

| Token              | Hex           | Uso                                               |
| ------------------ | ------------- | ------------------------------------------------- |
| `--bg`             | `#0A0A0B`     | near-black, nunca `#000000` puro                  |
| `--bg-subtle`      | `#131316`     | navegação, topbar                                 |
| `--bg-muted`       | `#1A1A1E`     | cards, listas                                     |
| `--bg-emphasis`    | `#26262B`     | hover                                             |
| `--border`         | `#26262B`     | divisores                                         |
| `--border-strong`  | `#3F3F46`     | foco de input                                     |
| `--fg`             | `#FAFAFA`     | texto principal                                   |
| `--fg-muted`       | `#A1A1AA`     | secundário                                        |
| `--fg-subtle`      | `#71717A`     | metadata                                          |
| **`--primary`**    | **`#7C3AED`** | (violet-600, mais vibrante no dark pra contraste) |
| `--primary-hover`  | `#8B5CF6`     | violet-500                                        |
| `--primary-fg`     | `#FFFFFF`     | texto sobre primário                              |
| `--primary-subtle` | `#2E1065`     | badges primários no dark                          |
| **`--accent`**     | **`#2EE8B8`** | mantém                                            |
| `--accent-hover`   | `#10B981`     |                                                   |
| `--warning`        | `#FBBF24`     | amber-400 (melhor contraste no dark)              |
| `--warning-subtle` | `#451A03`     |                                                   |
| `--danger`         | `#EF4444`     |                                                   |
| `--danger-subtle`  | `#450A0A`     |                                                   |
| `--info`           | `#3B82F6`     |                                                   |

**Regras de uso do primário**:

- Apenas **uma ação primária por tela** (botão destacado).
- Links em texto corrido usam `--primary` com `underline` no hover.
- Cor de item ativo em nav: fundo `--primary-subtle` + texto `--primary`.

**Cores de labels de card**: 8 cores fixas, estilo Trello. O usuário escolhe uma da paleta, não digita hex livre.

```
#EF4444 (vermelho)  #F59E0B (laranja)  #EAB308 (amarelo)  #22C55E (verde)
#06B6D4 (ciano)     #3B82F6 (azul)     #A855F7 (roxo)     #EC4899 (rosa)
```

## 4. Tipografia

**Fonte**: [Inter](https://fonts.google.com/specimen/Inter) (variável, pesos 400/500/600/700). Alternativa futura: Geist.

**Escala** (line-height entre parênteses):

| Classe      | Tamanho   | Uso                                      |
| ----------- | --------- | ---------------------------------------- |
| `text-xs`   | 12px (16) | metadata, timestamps                     |
| `text-sm`   | 14px (20) | UI padrão, cards, inputs                 |
| `text-base` | 15px (24) | corpo de texto (comentários, descrições) |
| `text-lg`   | 17px (24) | títulos de seção                         |
| `text-xl`   | 20px (28) | título de card modal                     |
| `text-2xl`  | 24px (32) | título de página                         |
| `text-3xl`  | 30px (36) | heading de empty state                   |

**Pesos**:

- 400 regular — corpo
- 500 medium — labels, botões
- 600 semibold — títulos
- 700 bold — apenas em títulos grandes (evitar "negrito por ênfase" no UI)

**Regra**: nunca `font-size + font-weight` variando juntos arbitrariamente. Sempre usar os pares definidos acima.

## 5. Espaçamento e grid

Base de **4px** (Tailwind default). Usar sempre múltiplos de 4.

| Token      | Pixels | Uso                                |
| ---------- | ------ | ---------------------------------- |
| `space-1`  | 4      | gap entre ícone e texto            |
| `space-2`  | 8      | padding interno de botões pequenos |
| `space-3`  | 12     | gap em listas densas               |
| `space-4`  | 16     | padding padrão de cards            |
| `space-6`  | 24     | gap entre seções próximas          |
| `space-8`  | 32     | gap entre seções distantes         |
| `space-12` | 48     | margem de páginas                  |
| `space-16` | 64     | empty states, hero                 |

**Grid de quadro** (Kanban): gap horizontal entre listas = 12px; gap vertical entre cards = 8px. Lista largura fixa = 280px no desktop.

## 6. Border radius

| Token          | Valor | Uso                         |
| -------------- | ----- | --------------------------- |
| `rounded-sm`   | 4px   | inputs pequenos, tags       |
| `rounded-md`   | 6px   | inputs, botões secundários  |
| `rounded-lg`   | 8px   | cards, botões primários     |
| `rounded-xl`   | 12px  | modais, painéis grandes     |
| `rounded-full` | ∞     | avatares, badges circulares |

**Regra**: tudo em 8px (`rounded-lg`) por padrão. Só mexer pra menos/mais quando o contexto exigir. Nada de `rounded-[7px]` maluco.

## 7. Sombras e elevação

Dependem do tema. **Usar pouco**.

### Light

- `shadow-sm`: `0 1px 2px rgba(0,0,0,0.04)` — cards em lista (opcional, preferir só border)
- `shadow-md`: `0 4px 12px rgba(0,0,0,0.06)` — card ativo (drag), tooltip
- `shadow-lg`: `0 12px 32px rgba(0,0,0,0.10)` — modal, popover

### Dark

- Sombras quase não funcionam visualmente. **Usar borda mais clara** (`--border-strong`) + **fundo levemente elevado** (`--bg-muted` → `--bg-emphasis`) para indicar elevação.

Nunca usar `shadow-2xl` ou sombras coloridas (exceto talvez em botão primário hover, e com parcimônia).

## 8. Iconografia

**Biblioteca**: [Lucide](https://lucide.dev) (mesma base do shadcn/ui).

- Tamanho padrão: **16px** (`size={16}`).
- Ícones maiores (20/24) em navegação principal e empty states.
- Peso da linha: 1.5px (padrão Lucide). Não alterar.
- Cor: herda `currentColor` — vem do texto adjacente.
- Ícones decorativos recebem `aria-hidden="true"`. Ícones com significado (ex: botão só-ícone) recebem `aria-label`.

## 9. Componentes fundamentais

Todos construídos em cima de **shadcn/ui**. Abaixo os ajustes KTask:

### Botão

- **Primário**: bg `--primary`, fg `--primary-fg`, hover `--primary-hover`. Único por tela.
- **Secundário**: bg `--bg-muted`, fg `--fg`, border `--border`, hover `--bg-emphasis`.
- **Ghost**: sem fundo, só hover `--bg-muted`. Usado em toolbars.
- **Destrutivo**: bg `--danger`, fg white. Só em ações irreversíveis com confirmação.
- Altura padrão: 36px (sm) / 40px (md). Radius `rounded-md`.

### Input / Textarea

- Altura 36px (sm), 40px (md).
- Background: `--bg`; border `--border`; focus ring `--primary` 2px com offset 1.
- Placeholder: `--fg-muted`.
- Erro: border `--danger`, mensagem abaixo em `--danger`.

### Card (do quadro)

- Background: `--bg` (light) / `--bg-muted` (dark).
- Border: 1px `--border`.
- Radius: `rounded-lg`.
- Padding: 12px.
- Hover: leve elevação (shadow-sm no light, border-strong no dark) e `cursor: grab`.
- Drag state: `shadow-md`, rotação 2deg, opacity 0.95.

### Modal / Dialog

- Overlay: `rgba(0,0,0,0.6)` (light) / `rgba(0,0,0,0.8)` (dark).
- Panel: `--bg`, border `--border`, `rounded-xl`, `shadow-lg`.
- Padding: 24px.
- Fechamento: `Esc`, clique fora, ícone X no canto superior direito.

### Tooltip

- Background: `--fg` (contraste invertido).
- fg: `--bg`.
- Radius `rounded-md`, padding 6px 8px, text-xs.
- Delay: 400ms em hover; 0ms em foco via teclado.

### Badge

- Altura 20px, padding 2/8, text-xs, `rounded-full`.
- Variantes: neutro (`--bg-muted` / `--fg`), sucesso (`--accent` bg), perigo (`--danger-subtle` / `--danger`), primário (`--primary-subtle` / `--primary`).

### Avatar

- Redondo, tamanhos: xs 20, sm 24, md 32, lg 40.
- Fallback: inicial do nome sobre cor determinística gerada pelo userId (mesma conta sempre mesma cor).

### Label (do card)

- Barra colorida de 8px de altura, largura do card. OU badge de largura variável com cor + texto.
- Estilo preferido: barra simples (Trello moderno).

### List (Kanban column)

- Width 280px, background `--bg-muted`, `rounded-lg`, padding 8px.
- Header sticky com título editável e menu `...`.
- Footer com botão ghost "+ Adicionar card" sempre visível.

### Topbar

- Altura 52px, bg `--bg-subtle`, border-bottom `--border`.
- Logo à esquerda, breadcrumb no meio, notificações/avatar/theme toggle à direita.

### Sidebar

- Width 240px, bg `--bg-subtle`.
- Itens: padding 8px 12px, radius `md`, hover `--bg-emphasis`, ativo `--primary-subtle` + `--primary`.

## 10. Padrões de interação

- **Focus ring**: `outline: 2px solid --primary`, `outline-offset: 2px`. Presente em tudo tabulável.
- **Loading**:
  - < 300ms esperado → nada.
  - 300ms-2s → spinner inline no botão / skeleton shimmer na área.
  - > 2s → mensagem "Isso está demorando mais que o normal" com opção de cancelar.
- **Optimistic UI**: toda ação local aparece imediatamente; se falhar, rollback + toast de erro.
- **Toast**: cantos inferior-direito (desktop) / superior (mobile). Auto-dismiss 5s. Variantes: success (accent), error (danger), info (fg). Empilham verticalmente; máx 3 visíveis.
- **Empty state**: ilustração simples (outline) + título + 1 parágrafo + CTA. Usar para quadros sem cards, caixa de notificações vazia, busca sem resultado.
- **Confirmação de destruição**: modal obrigatório para deletar quadro, Org, automação ativa. Botão destrutivo requer digitar o nome do item em casos extremos (deletar Org).

## 11. Acessibilidade

- Contraste mínimo: texto normal 4.5:1, texto grande 3:1.
- Foco visível **sempre** — nunca `outline: none` sem substituto.
- Navegação por teclado completa (tab, enter, esc, setas em menus).
- `aria-label` em ícone-only, `aria-live="polite"` em toasts, `aria-modal="true"` em dialogs.
- Suporte a `prefers-reduced-motion` — animações reduzidas quando ativado.
- Drag & drop com fallback de teclado: space seleciona, setas movem, enter solta (implementado pelo @dnd-kit).

## 12. Tom de voz (microcopy pt-BR)

- **Direto, profissional, sem gírias**.
- Segunda pessoa ("Você não tem permissão", não "O usuário não tem permissão").
- Erros: explicar **o que aconteceu** + **o que fazer**. Ruim: "Erro 401". Bom: "Sua sessão expirou. Entre novamente."
- Confirmações: verbo no infinitivo no botão ("Excluir", "Criar quadro", "Enviar convite") — não "OK".
- Evitar termos técnicos voltados ao usuário final. "Organização" sim; "Tenant" não. "Quadro" sim; "Board" só no código.
- Datas relativas ("há 2 minutos", "ontem às 14:30") em metadata; absolutas em relatórios.

## 13. Atalhos de teclado (MVP)

| Tecla          | Ação                              |
| -------------- | --------------------------------- |
| `Ctrl/Cmd + K` | Busca global / command palette    |
| `C`            | Criar card rápido na lista focada |
| `/`            | Focar busca                       |
| `E`            | Editar card aberto                |
| `D`            | Definir prazo no card aberto      |
| `L`            | Abrir seletor de label            |
| `M`            | Atribuir membro                   |
| `?`            | Mostrar overlay de atalhos        |
| `Esc`          | Fechar modal / popover            |

## 14. Layouts de páginas-chave (texto)

### 14.1 Tela do Quadro

```
┌─ Topbar (52px) ──────────────────────────────────────────┐
│ [Logo] Início > Vendas 2026          [Ctrl+K] [🔔] [Avatar] [🌙]
├──────┬───────────────────────────────────────────────────┤
│      │ Vendas 2026                                [⚙] [+]│
│ Side │ ─────────────────────────────────────────────────│
│ bar  │ [Filtros] [Membros] [Automações] [Estatísticas]  │
│ 240  │ ─────────────────────────────────────────────────│
│      │                                                   │
│      │ ┌─ A Fazer ─┐ ┌─ Fazendo ─┐ ┌─ Feito ─┐        │
│      │ │ Card 1    │ │ Card 2    │ │ Card 3  │ ...    │
│      │ │ Card 4    │ │           │ │ Card 5  │        │
│      │ │ + Novo    │ │ + Novo    │ │ + Novo  │        │
│      │ └───────────┘ └───────────┘ └─────────┘        │
└──────┴───────────────────────────────────────────────────┘
```

### 14.2 Modal de Card

```
┌───────────────────────────────────────────────── X ──┐
│ [label-bar]                                          │
│ Título do card (edit inline)                         │
│ em "Fazendo" · Criado por João · 2 dias atrás        │
│                                                      │
│ 📝 Descrição                                         │
│ [Editor rich text simples]                           │
│                                                      │
│ ☑ Checklist "Subitens" (3/5)                         │
│ 💬 Comentários (12)                                  │
│ 📎 Anexos (2)                                        │
│ 🕐 Atividade                                          │
├──────────────────────────────────────── sidebar ─────┤
│ Membros [avatars]                                    │
│ Labels  [barras coloridas]                           │
│ Prazo   23/04/2026 14:00                             │
│ Prioridade Alta                                       │
│ Campos personalizados                                 │
│ Ações: Mover · Duplicar · Arquivar                   │
└──────────────────────────────────────────────────────┘
```

## 15. Inspiração + "não fazer"

✅ **Inspirar em**:

- Linear — tipografia, densidade, atalhos, cores
- Height — dashboards e visões
- Notion — modais e inputs
- Vercel — tom "tech clean"

❌ **Não copiar**:

- Jira — excesso de ícones coloridos e caixas aninhadas
- ClickUp — UI sobrecarregada, tooltips em tudo, muitas views ao mesmo tempo
- Monday — cores berrantes, visual "empresarial anos 2010"
- Salesforce — qualquer coisa

## 16. Versionamento do design

Este documento é a **fonte única**. Ao implementar componentes:

1. Criar `packages/ui` com tokens + componentes base.
2. Tokens exportados como CSS variables em `globals.css` + config em `tailwind.config.ts`.
3. Componentes shadcn customizados herdam os tokens — não hardcode de cores.
4. Qualquer mudança de design token passa por PR com atualização **deste arquivo**.
