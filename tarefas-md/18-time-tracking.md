# 18 — Time tracking (cronômetro de cards, padrão Ummense)

> **Status:** placeholder visual existe na sidebar do modal do card. Plano abaixo substitui a UX antiga por um padrão **flutuante global + página de Indicadores**, alinhado aos prints do Ummense em [tarefas-md/img/](img/).

## Referências visuais

- [Print 1 — botão idle (verde, 00:00:00)](<img/Captura de tela 2026-04-25 014530.png>)
- [Print 2 — rodando (magenta, contando)](<img/Captura de tela 2026-04-25 014617.png>)
- [Print 3 — hover sobre o ícone de expandir](<img/Captura de tela 2026-04-25 014628.png>)
- [Print 4 — popover de detalhes (anotação + card + avatar + Meu timesheet)](<img/Captura de tela 2026-04-25 014637.png>)
- [Print 5 — página Indicadores da Organização (timesheet)](<img/Captura de tela 2026-04-25 014656.png>)

> **Diferença vs Ummense**: o Ummense ancora o cronômetro num menu lateral fixo. KTask **não** tem menu lateral fixo — tem header fixo no topo. Por isso, o cronômetro vai pro **header global**, não em pílula flutuante. Ver seção "Posicionamento do TimerWidget no header" abaixo.

---

## Escopo

### Dentro

1. **Cronômetro no header global** (no `Topbar`, em qualquer página autenticada). Estados: idle (verde) / rodando (magenta). Ver seção "Posicionamento do TimerWidget no header" abaixo.
2. **Popover de detalhes** acessado pelo ícone de "expandir" do botão. Contém: textarea de anotação, card associado, botão de pause grande, avatar do user e link "Meu timesheet".
3. **Persistência** do cronômetro entre sessões: ao recarregar, restaura a entry ativa do user.
4. **Histórico no card**: bloco no modal mostrando entries do card (ordem desc), com edit/delete e botão de adicionar entry manual.
5. **Página `/indicadores`** com 3 sub-tabs:
   - **Timesheet da organização** (default — implementação completa)
   - **Indicadores de cards** (placeholder)
   - **Indicadores de tarefas** (placeholder)
6. **Resumo por membro** em `/configuracoes/membros`: tempo total no mês + indicador "rodando agora".
7. **Realtime** via Socket.IO: eventos `time_entry.started` / `time_entry.stopped` atualizam os badges "rodando agora" e o resumo na página de Membros.
8. **Sidebar global**: novo item "Indicadores" (ícone gráfico, abaixo de Quadros/Calendário).

### Fora (ficam de fora deste plano)

- Tabs "Indicadores de Cards" e "Indicadores de Tarefas" funcionais (placeholder por agora)
- Exportação XLSX (CSV simples no MVP)
- Dashboards agregados de fluxo (throughput, cycle time, SLA) — Fase 3
- Auto-close de entries abertas há > 12h por cron — fica como item separado de operação
- Salvar filtro atual (PRO no Ummense) — fora

---

## Modelo de dados

```prisma
model TimeEntry {
  id             String           @id @default(cuid())
  cardId         String
  userId         String
  organizationId String
  startedAt      DateTime
  endedAt        DateTime?        // null = sessão ativa
  durationSec    Int?             // calculado ao fechar
  source         TimeEntrySource  @default(TIMER)
  note           String?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  card         Card         @relation(fields: [cardId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id])
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([cardId, startedAt])
  @@index([userId, startedAt])
  @@index([organizationId, startedAt])
  @@index([userId, endedAt]) // pra achar entry ativa do user em O(1)
}

enum TimeEntrySource {
  TIMER
  MANUAL
}
```

Activity types novos: `TIME_ENTRY_STARTED`, `TIME_ENTRY_STOPPED`, `TIME_ENTRY_CREATED` (manual), `TIME_ENTRY_DELETED`.

**Regras**:

- Por user, **só pode haver uma entry com `endedAt = null`** por vez. **No backend o `start` ainda fecha qualquer entry pendente antes** (defesa contra requests concorrentes), mas **o client deve checar antes e pedir confirmação ao user** quando detectar conflito — ver "Diálogo de conflito (timer já ativo)" abaixo.
- `durationSec` é gravado no momento do stop. Pra agregações, fonte de verdade é esse campo (não recalcular do `endedAt - startedAt`).

---

## Endpoints (NestJS)

Módulo `time-tracking/`:

| Método | Path                                     | Descrição                                                                                |
| ------ | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| POST   | `/cards/:cardId/time/start`              | Inicia entry rodando. Body: `{ note? }`. Fecha entry pendente do user antes.             |
| POST   | `/time-entries/:id/stop`                 | Grava `endedAt` e `durationSec`.                                                         |
| POST   | `/cards/:cardId/time/manual`             | Cria entry manual. Body: `{ startedAt, endedAt, note? }`.                                |
| PATCH  | `/time-entries/:id`                      | Edita nota / startedAt / endedAt (recalcula duração).                                    |
| DELETE | `/time-entries/:id`                      | Remove.                                                                                  |
| GET    | `/users/me/time/active`                  | Retorna entry ativa do user logado (ou null). Chamado no boot.                           |
| GET    | `/cards/:cardId/time`                    | Lista entries do card.                                                                   |
| GET    | `/organizations/me/timesheet`            | Timesheet com filtros: `userIds[]`, `dateFrom`, `dateTo`, `source`, `cardId`, paginação. |
| GET    | `/organizations/me/timesheet/summary`    | Totais agregados (últimos 30d, por user).                                                |
| GET    | `/organizations/me/members/timer-status` | Pra cada member: total do mês + entry ativa (se houver).                                 |

DTO/Schema base: `TimeEntrySchema`, `StartTimerSchema`, `ManualEntrySchema`, `TimesheetFilterSchema`.

### Permissões

- **Iniciar / parar próprio timer**: qualquer user com acesso ao card (>= COMMENTER no board ou bypass org).
- **Lançar entry manual pra si**: liberado.
- **Lançar entry manual pra outro user**: OWNER / ADMIN da Org.
- **Editar / excluir entry**: dono da entry OU OWNER / ADMIN da Org.
- **Página Indicadores**: tabela mostra só entries em cards que o user tem acesso. OWNER / ADMIN / GESTOR vêem tudo da Org. MEMBER vê próprias + de cards que é membro. GUEST só próprias.

---

## Frontend

### 1. `<TimerWidget>` — componente no header global

Local: novo `apps/web/src/components/time-tracking/timer-widget.tsx`, **renderizado dentro do `Topbar`** ([apps/web/src/components/topbar.tsx](apps/web/src/components/topbar.tsx)) entre o `<SearchTrigger>` e o `<NotificationsBell>`. Layout final do header:

```
[Logo] [Org] ··· [Search] [Timer] [Bell] [Theme] | [Avatar + Nome]
```

**Por que aqui** (e não flutuante como no Ummense):

- KTask não tem menu lateral fixo onde ancorar — o header é o único elemento sempre visível.
- Timer é status + ação, mesma natureza do sino de notificações; agrupar os dois reforça o padrão.
- Quando running, a pílula magenta naturalmente puxa atenção sem precisar flutuar fora do header.
- Evita conflito com elementos floating futuros (chat de suporte, FAB de "novo card", etc.)

**Estados visuais (dentro do header)**:

| Estado                          | Forma                         | Conteúdo                                                    | Cor                                                              |
| ------------------------------- | ----------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| `idle` (sem timer rodando)      | Botão compacto ~36–40px       | Ícone `Play` apenas                                         | Verde sutil (bg-success/15, fg-success) ou ghost com hover verde |
| `running`                       | Pílula expandida ~140–160px   | Ícone `Pause` + tempo `HH:MM:SS` + iconezinho de "expandir" | Magenta sólido (#D946EF / `bg-fuchsia-600`), texto branco        |
| `loading` (mutation start/stop) | Mesma forma do estado destino | Spinner pequeno                                             | herda                                                            |

- **Tick visual**: `setInterval(1s)` que recalcula `Date.now() - startedAt` — sem acumulador local, sobrevive a refresh / sleep.
- **Hover no ícone "expandir"**: leve scale + outline (igual print 3), tooltip "Detalhes do cronômetro".
- **Click no Play (idle)**:
  - Se há card aberto no contexto (modal aberto via `?card=...`): inicia direto.
  - Senão: abre **dropdown de busca de cards** (combobox com `q` debounced) ancorado no botão. Selecionar = inicia.
- **Click no Pause (running)**: para imediatamente. A duração final aparece num toast curto ("00:25:14 registrado").
- **Click no ícone "expandir"**: abre `<TimerPopover>` ancorado no botão (ver item 2).
- **Tentar iniciar timer com outro já rodando**: abre `<ActiveTimerConflictDialog>` (ver seção própria).

**Comportamento responsivo**:

| Viewport         | Idle                                       | Running                                                                                                        |
| ---------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| ≥ 768px (md)     | Botão completo com ícone                   | Pílula completa com tempo                                                                                      |
| < 768px (mobile) | Apenas ícone `Play` (compacto, igual sino) | Pílula com tempo, mas avatar pode esconder o nome (`hidden md:inline` no nome do user já existe no `UserMenu`) |

Em mobile não esconde o timer running — manter visível é parte do valor da feature.

**Indicação de "outros usuários cronometrando"** (futuro, não MVP): badge pequeno com contador na lateral. Fora deste plano.

**Comportamento**:

- No mount: chama `GET /users/me/time/active`. Se houver entry, restaura.
- Tick: `setInterval(1s)` apenas pra atualizar o display. **Tempo é sempre `Date.now() - startedAt`** (não acumula contador local — sobrevive a refresh, sleep, etc.)
- Click em ▶ (idle):
  - Se há card aberto no contexto (modal aberto, ou rota `/b/[boardId]?card=...`): inicia direto nesse card.
  - Caso contrário: abre seletor de card (combobox de busca por título/board).
- Click em ⏸ (running): para imediatamente.
- Click em "expandir": abre `<TimerPopover>`.

### 2. `<TimerPopover>`

Conteúdo conforme Print 4:

- Título "Cronômetro" + botão X
- Textarea "Anotação (opcional)" — debounce 500ms, salva via `PATCH /time-entries/:id`
- Linha do card: ícone + nome do board + título do card + tooltip
- Botão pause grande + tempo
- Avatar do user + link "Meu timesheet" → `/indicadores/timesheet?userId={meId}`

### 2b. `<ActiveTimerConflictDialog>` — diálogo de "Existe um timer ativo"

**Quando aparece**: o user tenta iniciar um cronômetro num card B enquanto já tem timer rodando em outro card A. Padrão observado no Ummense — em vez de parar o timer A silenciosamente, perguntamos.

**Pontos de disparo** (qualquer caminho que possa iniciar timer):

- Click no ▶ do `<TimerWidget>` no header (com card resolvido pelo contexto ou pelo combobox).
- Botão "Iniciar cronômetro neste card" no bloco "Tempo registrado" do modal do card.
- Eventualmente: ações de menu / atalho de teclado.

**Lógica de pré-check (client)**:

```ts
async function tryStartTimer(targetCardId: string) {
  const active = await queryClient.fetchQuery(activeTimerQuery); // GET /users/me/time/active
  if (!active) return startTimer(targetCardId);
  if (active.cardId === targetCardId) return; // no-op, já rodando nesse card
  // Conflito: abre o diálogo
  openActiveTimerConflictDialog({ active, targetCardId });
}
```

**Conteúdo do diálogo** (textos exatos do Ummense, em pt-BR):

- **Título**: `Existe um timer ativo`
- **Corpo**: `Para ativar o timetracking em um novo card, você precisa parar o timer ativo no momento. Deseja manter o timer atual em andamento?`
- **Botão secundário (ghost)** à esquerda: `Parar e iniciar no novo card`
  → Ação: `POST /time-entries/:activeId/stop` → em sucesso → `POST /cards/:targetCardId/time/start`. Toast com a duração registrada do antigo + estado running do novo. Em caso de erro do stop, aborta e mostra erro.
- **Botão primário** à direita: `Manter o timer atual em andamento`
  → Ação: fecha o diálogo. Sem mutation. O timer A continua, o B não inicia.
- Botão X no canto superior direito = mesma ação do "Manter o timer atual" (cancela sem mexer).

**Comportamento adicional**:

- O card que está rodando (`active.cardTitle` + `active.boardName`) deve aparecer destacado em algum lugar do diálogo (sub-linha do corpo, ou rodapé pequeno) pra o user lembrar do que vai parar. Sugestão: linha extra antes dos botões: `Atualmente em: <board> / <card> · <HH:MM:SS>`.
- O tempo exibido nessa linha **não tem tick** — é o instante do snapshot. Reabrir o diálogo recarrega.
- Se o user clicou em "Parar e iniciar no novo card" e o stop falhar (rede / 500), **não** chamamos o start — mantemos estado consistente.

**Componente**: novo `apps/web/src/components/time-tracking/active-timer-conflict-dialog.tsx`. Estado controlado pelo store global do timer (Zustand) — qualquer ponto do app abre passando `{ active, targetCardId, startInput? }`.

### 3. Bloco "Tempo registrado" no modal do card

Substitui o placeholder atual. Local: dentro do `card-modal.tsx`, na coluna principal:

```
Tempo registrado
─────────────────
Total: 4h 12min
Por pessoa:
  Nicchon Sanchez   2h 30min
  Fernanda Biazatti 1h 12min
  Anna Catarina     30min
[Iniciar cronômetro]  [Adicionar manual]  [Ver histórico]
```

"Ver histórico" expande lista inline (mesma área) com edit/delete por entry.

### 4. Página `/indicadores`

Estrutura de rotas:

```
apps/web/src/app/(app)/indicadores/
  layout.tsx           # tabs: Timesheet / Cards / Tarefas
  timesheet/page.tsx   # implementação completa
  cards/page.tsx       # placeholder
  tarefas/page.tsx     # placeholder
```

**`/indicadores/timesheet`** (Print 5):

- Painel de filtros sticky no topo: data range (default últimos 30d), multiselect users (default = "EU"), multiselect fluxos, source (TIMER/MANUAL).
- Cards resumo:
  - "Total de horas dos últimos 30 dias" (filtros aplicados)
  - "Entradas dos últimos 30 dias" agrupado por user (avatar + total + indicador verde com timer atual se rodando)
- Tabela paginada (20/pg). Colunas: Usuário · Nome do card · Tags · Contatos · Fluxo · Data inicial · Data final · Hora inicial · Hora final · Duração.
- Botão **Adicionar** (modal de entry manual, escolhe card + datas + nota).
- Botão **Exportar dados** → CSV download (lib `papaparse` no client ou stream do server, decidir).

### 5. Página de Membros — bloco de timesheet

Em `apps/web/src/app/(app)/configuracoes/membros/page.tsx`, pra cada linha de membro adicionar:

- Coluna "Tempo no mês"
- Indicador "rodando agora" (badge verde com nome do card atual + tooltip)
- Link "Ver timesheet" → `/indicadores/timesheet?userId=X`

Backend: usa `GET /organizations/me/members/timer-status`.

### 6. Sidebar global

Adicionar item "Indicadores" (ícone `BarChart3` da Lucide) na sidebar do layout `(app)/layout.tsx`, abaixo de "Quadros".

---

## Realtime

Eventos novos no Socket.IO gateway:

- `time_entry.started { userId, cardId, boardId, entryId, startedAt }`
- `time_entry.stopped { userId, cardId, boardId, entryId, durationSec }`

Canais:

- `org:{orgId}` — todos os members da Org recebem (pra atualizar a página de Indicadores e Membros em tempo real)
- `card:{cardId}` ou `board:{boardId}` — pra atualizar o bloco "Tempo registrado" no modal

---

## Persistência da sessão ativa

- Reload: o `<TimerWidget>` re-busca via `GET /users/me/time/active` no mount.
- Sleep do laptop: timer continua contando contra o `startedAt`. User edita depois se quiser corrigir.
- Crash do browser: a entry fica aberta no banco até o user voltar e parar.
- **Não vamos** implementar auto-close por cron neste plano (fica como follow-up se virar problema real).

---

## Etapas de implementação

Quebrado pra fazer commits incrementais, cada etapa entregando algo verificável:

1. **Schema + endpoints básicos** — `TimeEntry`, migration, enums, controller com start/stop/active. Activity log mínimo.
2. **TimerWidget global + popover** — UI flutuante em todas as páginas autenticadas, restauração no boot, anotação salvando.
3. **Bloco no modal do card + entry manual + histórico** — substitui placeholder, lista entries, dialog de adicionar manual, edit/delete inline.
4. **Página `/indicadores/timesheet`** — layout, filtros, resumo, tabela paginada, "adicionar" via mesmo dialog da etapa 3.
5. **Resumo na página de Membros** — endpoint `members/timer-status` + UI.
6. **Realtime + sidebar** — eventos started/stopped, atualização live dos indicadores, item "Indicadores" no sidebar.
7. **Exportar CSV + polish** — botão na tabela de timesheet, ajustes de UX e a11y.

Estimativa: ~2 dias (cada etapa entrega valor isolado).

---

## Critérios de aceite

- [ ] Migration TimeEntry + enum TimeEntrySource aplicada
- [ ] Endpoints start / stop / active / manual / list / patch / delete + filtros do timesheet
- [ ] Validação: só 1 entry ativa por user (start fecha a anterior)
- [ ] TimerWidget visível no header em todo `(app)/`, com restauração no reload
- [ ] Popover com anotação salvando, link "Meu timesheet" funcional
- [ ] `ActiveTimerConflictDialog` abrindo ao tentar iniciar timer com outro já rodando, com 2 ações (parar+iniciar / manter)
- [ ] Modal do card mostra agregação por pessoa + lista de entries + ações
- [ ] `/indicadores/timesheet` com filtros, resumo, tabela paginada e adicionar manual
- [ ] Página de Membros com tempo do mês e badge "rodando agora"
- [ ] Realtime atualiza badges sem refresh
- [ ] Permissões respeitadas (MEMBER não vê entries de cards inacessíveis)
- [ ] Item "Indicadores" no sidebar
- [ ] Exportar CSV funcionando

---

## Decisões pendentes (precisam ser respondidas antes de começar)

1. ~~Posição do botão flutuante em mobile~~ — **Resolvido**: vai no header global (não flutua). Ver "Posicionamento do TimerWidget no header".
2. **"Indicadores" no sidebar**: KTask não tem sidebar fixo. Onde colocar o link? _(Sugestão: novo item no menu da Org no header, ou rota acessível via avatar/menu user. Decidir junto com a feature de menu lateral futura.)_
3. **Exportar dados**: CSV simples no MVP ou já XLSX? _(Sugestão: CSV via `papaparse`, XLSX como follow-up.)_
4. **Quem pode lançar entry manual pra outro user**: só OWNER / ADMIN ou também GESTOR?
5. **Edição de duração que cria overlap com outra entry do mesmo user**: bloquear, alertar, ou permitir silencioso? _(Sugestão: alertar mas permitir.)_

---

## Riscos / decisões

- **Tick visual no client**: calcular sempre como `Date.now() - startedAt` evita drift e bugs de pause/reload.
- **Performance da página de Indicadores**: a tabela vai crescer rápido. Paginação cursor-based + index `[organizationId, startedAt]` no banco.
- **Privacy**: filtrar server-side as entries de cards inacessíveis ao user logado (não confiar no client).
- **Concorrência**: dois cliques rápidos em "iniciar" podem criar 2 entries. Usar transação no `start`: dentro da tx, fechar pendente + criar nova.
- **Fuso horário**: armazenar tudo UTC. Display usa `User.timezone`.
- **Exclusão de card**: `onDelete: Cascade` na FK já apaga as entries — ok, mas perde histórico. Decidir depois se vale soft-delete só pra preservar timesheet.
