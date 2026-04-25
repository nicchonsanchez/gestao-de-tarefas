# 18 — Time tracking (cronômetro de cards)

> **Status:** Botão de play como placeholder visual já existe no rodapé da sidebar do modal (`apps/web/src/components/board/card-sidebar-tabs.tsx`). Funcionalidade não implementada — ver plano abaixo.

## Motivação

Apontar tempo gasto por cada pessoa em cada card é o que separa "ferramenta de tarefa" de "ferramenta operacional séria". Casos de uso na Kharis:

- **Faturamento por hora** em fluxos de cliente externo (consultorias, projetos pontuais)
- **Análise de produtividade** por pessoa / fluxo / mês
- **Justificar prazos**: "essa demanda toma 4h em média, vamos parar de prometer entrega em 1h"
- **Onboarding**: comparar quanto tempo um novato leva vs senior nas mesmas tarefas

## Modelo de dados

Migration nova:

```prisma
model TimeEntry {
  id          String    @id @default(cuid())
  cardId      String
  userId      String    // quem cronometrou
  startedAt   DateTime
  endedAt     DateTime? // null = sessão ativa
  durationSec Int?      // calculado ao fechar (denormalizado pra agregações rápidas)
  source      TimeEntrySource @default(TIMER)  // TIMER ou MANUAL
  note        String?

  card        Card  @relation(fields: [cardId], references: [id], onDelete: Cascade)
  user        User  @relation(fields: [userId], references: [id])

  @@index([cardId, startedAt])
  @@index([userId, startedAt])
}

enum TimeEntrySource {
  TIMER   // cronometrado em tempo real (botão play/pause)
  MANUAL  // entrada manual ("trabalhei 1h ontem")
}
```

Considerações:

- **Múltiplas sessões por user**: cada vez que liga/desliga vira uma `TimeEntry`. Histórico é a lista delas.
- **Múltiplos users no mesmo card simultaneamente**: ok, cada um tem suas entries independentes.
- **Sessão ativa por user**: garantir só 1 sessão ativa por user globalmente (não pode ter 2 cards rodando o timer ao mesmo tempo). Validar no `start`.
- **Card.totalTimeSec** (opcional): denormalizar soma na tabela Card pra evitar agregação a cada render. Re-computa no end de cada sessão.

## UX

### Botão de timer no rodapé da sidebar do modal

Estados visuais:

- **Idle (sem sessão ativa do user no card)**: ícone Play preto sobre fundo branco, label "--:--"
- **Ativo (rodando)**: ícone Pause branco sobre fundo accent (teal), label vermelho contando ao vivo "00:23:14"
- **Outros usuários cronometrando**: pequeno indicador (badge ou bolinha) mostrando "+2 ativos"
- **Total acumulado do card**: hover no botão mostra tooltip "Total: 4h 12min — Você: 1h 30min"

### Bloco "Tempo registrado" no modal (aba Início)

Logo abaixo de "Detalhes":

```
┌ Tempo registrado ────────────────────────────────┐
│ Total acumulado: 4h 12min                        │
│                                                  │
│ Por pessoa:                                      │
│   Nicchon Sanchez       2h 30min  [████████ ]   │
│   Fernanda Biazatti     1h 12min  [████     ]   │
│   Anna Catarina         30min     [██       ]   │
│                                                  │
│ [Adicionar entrada manual]    [Ver histórico ⇗] │
└──────────────────────────────────────────────────┘
```

### Tela "Histórico" (drawer ou rota dedicada)

Lista cronológica das sessões com:

- Data/hora início + fim
- Duração
- Quem
- Fonte (TIMER/MANUAL)
- Nota opcional
- Ações: Editar (corrigir início/fim/nota), Excluir (com confirmação)

### Adicionar entrada manual

Diálogo:

- Quem (default: você; admin pode lançar pra outros)
- Data
- Hora início + Hora fim (ou Duração direto)
- Nota
- Submit cria `TimeEntry { source: MANUAL }`

### No board (visão Kanban)

Cards que estão sendo cronometrados em tempo real ganham um indicador sutil (pulse no canto, ou ícone de cronômetro). Útil pra ver quem está em qual demanda agora.

## Endpoints

- `POST /cards/:id/time/start` — inicia sessão (rejeita se user já tem sessão ativa em outro card)
- `POST /cards/:id/time/stop` — fecha sessão ativa do user
- `POST /cards/:id/time/manual` — cria entry manual (body com start, end ou duration, note)
- `GET /cards/:id/time` — lista entries do card (paginado, ordem desc)
- `PATCH /time/:entryId` — edita (admin/dono da entry)
- `DELETE /time/:entryId` — remove
- `GET /users/me/time/active` — sessão ativa do user (pra restaurar timer após reload)

## Eventos realtime

- `card.timer.started` (broadcast no `board:{id}`) — outros usuários no mesmo card vêem o badge "+1 ativo"
- `card.timer.stopped` — atualiza contagem
- `card.timer.tick` — opcional. Provavelmente o frontend só calcula localmente baseado no `startedAt`, sem precisar de evento por segundo

## Permissões

- **Iniciar/parar próprio timer**: COMMENTER no board (qualquer um que vê o card)
- **Adicionar entrada manual**: própria conta — qualquer um. Pra outro user, requer OWNER/ADMIN da Org.
- **Editar/excluir entry**: dono da entry OU OWNER/ADMIN da Org.

## Persistência da sessão ativa

Ao recarregar a página, o frontend chama `GET /users/me/time/active` no boot. Se houver entry com `endedAt: null`, restaura o cronômetro contando a partir do `startedAt`.

## Cálculos derivados (relatórios futuros)

Quando entrarmos em relatórios da v1.5:

- **Total por user / período / fluxo / card**: `SUM(durationSec) GROUP BY ...`
- **Throughput**: cards finalizados por semana
- **Cycle time médio**: avg(`completedAt - createdAt`) — não é tempo de trabalho efetivo, é tempo decorrido. Time tracking dá o efetivo.

## Critérios de aceite (quando implementar)

- [ ] Migration TimeEntry + enum TimeEntrySource
- [ ] Endpoints start/stop/manual + GET histórico + GET sessão ativa
- [ ] Garantir só 1 sessão ativa por user global (validação no start)
- [ ] Botão de timer no rodapé do modal funcionando (start/stop com tick local)
- [ ] Bloco "Tempo registrado" no modal mostrando agregação por pessoa
- [ ] Diálogo "Adicionar entrada manual"
- [ ] Tela/drawer de histórico com edit/delete
- [ ] Realtime: outros vendo "+N ativos" no card
- [ ] Restauração da sessão ativa após reload (sem perder tempo cronometrado)
- [ ] Indicador no card do board quando tem timer ativo
- [ ] Activity log: TIME_ENTRY_ADDED nas operações

## Riscos / decisões

- **Tick em tempo real**: melhor calcular no client baseado no `startedAt` recebido (sem polling). Salvar no banco só ao parar.
- **Crashes**: se o user fechar o browser sem parar o timer, a entry fica aberta indefinidamente. Plano: cron job diário fecha entries com `endedAt: null` e `startedAt > 12h atrás`, marcando como `auto_closed` (campo nullable opcional `autoClosedAt`).
- **Sleep do laptop**: o timer continua marcando. Aceitar — o user pode editar a entry depois pra corrigir.
- **Fuso horário**: armazenar em UTC, exibir no TZ do user (já temos `User.timezone`).

## Próximos passos sugeridos

Quando chegarmos nessa feature:

1. Migration + endpoints básicos (start/stop/active) — ~2h
2. Botão funcional no modal + bloco de agregação — ~3h
3. Diálogo manual + tela histórico — ~3h
4. Realtime + indicador no board — ~2h
5. Auto-close cron job — ~1h

**Total estimado: 1-1,5 dia**.
