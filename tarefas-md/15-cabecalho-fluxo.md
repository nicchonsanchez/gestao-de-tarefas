# 15 — Cabeçalho do Fluxo (board header padrão Ummense)

Aproximar o cabeçalho do board ao padrão Ummense (título + ícone, stack de avatars, privacidade, busca, filtro, engrenagem, menu `…`). Foco em entregar parte funcional já no commit inicial; o que vier "prefigurado" (visualmente presente mas sem lógica) fica desabilitado com tooltip "em breve" e listado em **Pendências futuras** abaixo.

Hoje o header em [page.tsx:280-283](<apps/web/src/app/(app)/b/[boardId]/page.tsx#L280-L283>) só tem título + descrição. Esta tarefa substitui esse bloco por um cabeçalho completo.

## Escopo

### Dentro (commit inicial — funcional)

- **Título do board**: nome + ícone (campo `Board.icon` já existe no schema). Por enquanto, ícone fixo se vazio (Lucide `Layout`).
- **Stack de avatars do board** (`BoardMember[]`): mostra até 3-4 avatars empilhados, com contador `+N` se passar. Click abre o picker de membros do board (reusa padrão de [member-picker.tsx](apps/web/src/components/board/member-picker.tsx) adaptado para `boardId` em vez de `cardId`).
- **Ícone de privacidade**: lê `Board.visibility` (`PRIVATE` → cadeado fechado; `ORGANIZATION` → cadeado aberto/globo). Toggle real funcional via dropdown (PRIVATE ↔ ORGANIZATION). Endpoint `PATCH /boards/:id` precisa aceitar `visibility`.
- **Engrenagem de configurações**: abre modal/drawer `BoardSettingsDialog` em duas colunas (esquerda = config; direita = privacidade + equipe + salvar), com:
  - **Descrição do fluxo** (textarea, `Board.description`)
  - **Privacidade** (mesmo toggle do header)
  - **Equipe do fluxo** (lista + busca + adicionar/remover membros, reusa `member-picker`)
  - **Inativar fluxo** (toggle `Board.isArchived` com confirmação)
- **Menu `…`** (botão `MoreHorizontal`):
  - `Copiar URL do fluxo` — funcional (clipboard + toast)
  - `Configurações do fluxo` — abre o mesmo modal da engrenagem (atalho)
  - `Inativar fluxo` — atalho que abre modal de confirmação e arquiva
  - Demais itens (ver Pendências) aparecem **disabled com tooltip "em breve"** ou ficam fora do menu

### Dentro (commit inicial — prefigurado/visual)

- **Input "Filtrar por palavra"** — visualmente presente, `disabled` com placeholder "Em breve". Não envia query nem filtra cards.
- **Botão "Filtrar" com ícone funil** — visualmente presente, `disabled` com tooltip "em breve". Sem popover, sem lógica.

### Fora (commits seguintes ou descartados)

- **Filtro real** (busca por palavra + filtro avançado por status/tag/membro/prazo) — vira tarefa própria
- **Notificações** — sino fica somente no topbar global, **não** duplicar no header do fluxo
- Itens marcados PRO no Ummense (Gerar relatório, Importar/Exportar cards, Exportar fluxo como modelo, Ocultar fluxo) — descartados conforme diretriz "uso interno antes de SaaS"
- Equipe do board como equipe padrão de novos cards (toggle "Incluir equipe do fluxo como equipe dos cards" do Ummense) — sem schema-suporte hoje, fica para tarefa de "defaults de novo card"

## Etapas

1. Plano deste doc (este arquivo)
2. Componente `apps/web/src/components/board/board-header.tsx`:
   - Recebe `board` (com `members`, `visibility`, etc.)
   - Renderiza título + avatars + privacidade + busca (disabled) + filtro (disabled) + engrenagem + menu `…`
3. Adaptar `member-picker.tsx` (ou criar `board-member-picker.tsx`) para aceitar `boardId` e operar em `BoardMember[]`. Idealmente generalizar em um único componente parametrizado.
4. Endpoint `PATCH /boards/:id` aceitar `visibility`, `description`, `isArchived` (verificar se já aceita; se não, expandir DTO em `apps/api/src/boards/`).
5. Endpoints de board members: `POST/DELETE /boards/:id/members` — verificar se existem; criar se faltam.
6. Componente `board-settings-dialog.tsx`:
   - Layout 2 colunas (igual modal do card)
   - Bloco descrição, bloco privacidade, bloco equipe, bloco inativar
   - Botão "Salvar todas as alterações" + "Salvar e fechar"
7. Substituir o header atual em [page.tsx:280-283](<apps/web/src/app/(app)/b/[boardId]/page.tsx#L280-L283>) pelo novo `<BoardHeader board={board} />`.
8. Typecheck + lint + commit + deploy.
9. Atualizar `tarefas-md/checklist.md` com item da tarefa.

## Critérios de aceite

- [ ] Header do board mostra: título com ícone + avatars do board + cadeado de privacidade + input de busca (disabled) + botão filtro (disabled) + engrenagem + menu `…`
- [ ] Click no stack de avatars abre picker que adiciona/remove membros do board (não do card)
- [ ] Click no cadeado abre dropdown PRIVATE/ORGANIZATION e persiste a mudança
- [ ] Click na engrenagem abre `BoardSettingsDialog` com descrição editável, toggle de privacidade, lista de membros, e toggle inativar
- [ ] Menu `…` tem `Copiar URL` (funciona, mostra toast), `Configurações do fluxo` (abre modal), `Inativar fluxo` (confirma e arquiva)
- [ ] Input "Filtrar por palavra" e botão "Filtrar" aparecem mas estão `disabled`, com tooltip "em breve"
- [ ] **Sino do topbar continua único**, não duplicar no header do fluxo
- [ ] Mobile (<768px): header colapsa — título + engrenagem + menu visíveis; avatars/busca/filtro escondidos atrás de um "…" extra ou simplesmente ocultos
- [ ] Typecheck + lint verdes
- [ ] Smoke em prod após deploy

## Pendências futuras (decorrentes do que ficou prefigurado)

> Para cada item visualmente presente mas não funcional no commit inicial, abaixo a tarefa que precisa rodar depois para ligá-lo. Quando essas tarefas forem feitas, **remover o `disabled` e o tooltip "em breve"** do componente correspondente.

### A. Busca por palavra

- **Onde está prefigurado**: input "Filtrar por palavra" no header.
- **O que falta**:
  - Estado `searchQuery` no client (URL query param `?q=` para deep-link).
  - Filtragem client-side dos cards renderizados em cada coluna (match em `title`, `description`, talvez `tags`).
  - Considerar debounce 200ms.
- **Decisão pendente**: filtro client-side (rápido, simples) ou server-side (escala melhor com muitos cards). Default: client-side no MVP.
- **Tarefa filha**: criar `tarefas-md/16-filtro-busca-board.md` quando for implementar.

### B. Filtro avançado

- **Onde está prefigurado**: botão "Filtrar" com ícone funil no header.
- **O que falta**:
  - Popover com filtros: status (Ativo/Aguardando/Concluído/Cancelado), prioridade, tags, membros atribuídos, prazo (vencidos / próximos 7d / sem prazo).
  - Persistir filtros em URL query params (compartilhável).
  - Indicador visual no botão quando há filtros ativos (badge com contagem).
- **Tarefa filha**: criar `tarefas-md/17-filtros-avancados-board.md` quando for implementar (pode ser unificado com 16 se preferir).

### C. Item "Configurações do fluxo" no menu `…`

- Já vai estar funcional no commit inicial — sem pendência.

### D. Itens descartados (NÃO criar pendência — confirmar antes de implementar)

- Gerar relatório / Importar cards / Exportar cards / Exportar como modelo / Ocultar fluxo — fora do escopo do uso interno. Se forem reativados como features SaaS no futuro, aí sim virar tarefa própria.

### E. Defaults de novo card herdados do board

- **Não está prefigurado** no header, mas mencionado na referência Ummense (toggle "Incluir equipe do fluxo como equipe dos cards quando novos cards forem criados"). Vale criar issue/tarefa separada se quisermos esse comportamento.
- **Tarefa filha**: avaliar em `tarefas-md/18-defaults-novo-card.md` (eventual).

## Riscos / decisões

- **Reusar `member-picker` para board**: hoje ele opera em `cardId`. Generalizar com prop `scope: { type: 'card' | 'board', id: string }` ou criar um novo. Decisão: tentar generalizar; se ficar forçado, duplicar.
- **Privacidade do board já existe no schema** (`BoardVisibility` enum em [schema.prisma:41-44](apps/api/prisma/schema.prisma#L41-L44)) — então o cadeado já pode ser real desde o commit inicial, não precisa ficar "só visual".
- **Mobile**: o header tem muitos elementos. Em telas estreitas, esconder busca + filtro (já vão estar disabled mesmo) e colapsar avatars em "+N pessoas".
- **Confirmar que `Board.icon` está sendo populado**: hoje pode estar `null` para todos os boards. Fallback Lucide consistente.
- **`isArchived` em board hoje**: verificar se já existe UI para listar boards arquivados (em `/quadros`). Se não, criar em tarefa separada — senão arquivar agora "perde" o board da listagem.

## Como remover o "em breve" depois

Quando uma pendência futura for implementada (ex: busca):

1. Remover `disabled` do input/botão correspondente em `board-header.tsx`.
2. Remover o tooltip "em breve" (manter `Tooltip` se houver outro texto útil).
3. Marcar o critério de aceite correspondente nesta tarefa OU na tarefa filha.
4. Atualizar `checklist.md` removendo da seção "prefigurados pendentes" (criar essa seção lá quando esta tarefa for concluída).
