# 11 — Coluna "Finalizado"

Coluna virtual fixa no fim de todo quadro. Cards finalizados somem das listas, aparecem agregados em contagem, e podem ser vistos/restaurados num drawer lateral.

**Distinta de `archive`**: arquivar = "tirar do quadro sem status"; finalizar = "cycle concluído, card entrou no histórico de entrega". Futuro: base pra relatórios de throughput/cycle time e automações do tipo "quando finalizar, disparar X".

## Escopo

### Dentro

- Campo `completedAt: DateTime?` em `Card`
- Campo `completedBy: String?` (userId) em `Card`
- Endpoints: `POST /cards/:id/complete`, `POST /cards/:id/uncomplete`, `GET /boards/:id/completed-cards?limit=&cursor=`
- Listagens padrão de cards excluem `completedAt != null` (comportamento análogo a `isArchived`)
- Coluna virtual "Finalizado" no final do quadro
  - Droppable: arrastar card para ela = finalizar
  - Mostra contagem total + botão "Visualizar todos"
- Drawer "Cards finalizados" com paginação cursor-based, ação "Restaurar"
- Restaurar volta pro `listId` original se ainda existir, senão vai pra primeira lista ativa do board
- Eventos realtime: `card.completed`, `card.uncompleted`
- ActivityLog: `CARD_COMPLETED`, `CARD_UNCOMPLETED`

### Fora (fica pra depois)

- Auto-finalização por tempo (ex: 7 dias em certa coluna) → Fase 2 (automações)
- Filtro/busca dentro da lista de finalizados (MVP: só ordem `completedAt DESC`)
- Métricas visuais (cycle time médio) → quando chegar relatórios
- Undo explícito após drop com contagem regressiva; por hora uncomplete é manual pelo drawer

## Etapas

1. **Prisma**
   - Adiciona `completedAt DateTime?`, `completedBy String?` em `Card`
   - Índice `@@index([boardId, completedAt])` pra listar rápido
   - `CardActivityType`: adicionar `CARD_COMPLETED`, `CARD_UNCOMPLETED`
2. **Migration** (`pnpm prisma migrate dev --name card_completed`)
3. **Backend — service/controller**
   - `cards.service.ts`: `complete()`, `uncomplete()`. Ambos gravam activity + emitem evento
   - `cards.controller.ts`: rotas
   - `boards.service.ts`: método `listCompleted(boardId, tenant, { limit, cursor })` retorna cards com user creator + lista origem
   - `boards.controller.ts`: `GET :id/completed-cards`
   - Todas as queries existentes de cards passam a filtrar `completedAt: null` (adicionar no `where`)
4. **Contracts** (`@ktask/contracts`)
   - `CompleteCardResponseSchema`, `CompletedCardListItemSchema`, `ListCompletedCardsResponseSchema`
5. **Testes unitários**
   - `complete` grava `completedAt` e emite evento
   - `uncomplete` limpa campo
   - Listagem filtra corretamente
   - Move não funciona em card finalizado (retorna erro)
6. **Frontend — lib**
   - `lib/queries/boards.ts`: `completeCard`, `uncompleteCard`, `completedCards` (infinite query)
   - Evento realtime `card.completed`/`card.uncompleted` invalida queries do board
7. **Frontend — UI**
   - Componente `CompletedColumn` (coluna virtual, droppable):
     - Ícone `CheckCircle2` Lucide
     - Contagem total
     - Botão "Visualizar todos" → abre drawer
   - Componente `CompletedDrawer` (sheet lateral shadcn):
     - Lista paginada: titulo, lista de origem, quem finalizou, quando
     - Ação "Restaurar" por item
     - "Carregar mais" pra paginar
   - Integração na `BoardPage`:
     - Coluna fixa no fim do `inline-flex`
     - Drop na coluna virtual chama `completeCard` com rollback em erro
     - A totalização vem do `board.completedCount` (adicionar no response do `GET /boards/:id`)

## Critérios de aceite

- [x] Arrastar card pra coluna "Finalizado" remove da lista e incrementa contagem
- [x] "Visualizar todos" abre drawer com a lista completa ordenada por mais recente
- [x] Restaurar volta o card no fim da lista de origem (ou primeira lista se original sumiu/arquivada)
- [x] Cards finalizados não aparecem mais em listagens normais do quadro
- [x] Arquivar um card finalizado continua funcionando (estados independentes)
- [x] Evento realtime propaga pra outros usuários no quadro (`card.completed` / `card.uncompleted`)
- [ ] Teste unitário de `complete`/`uncomplete` passando — TODO
- [ ] Smoke test em produção: finalizar → visualizar todos → restaurar — pendente deploy

## Riscos / decisões

- **`archivedAt` + `completedAt` coexistem**: um card pode ser ambos simultaneamente (ex: finalizou, depois arquivou). Endpoints precisam filtrar corretamente.
- **Restaurar lista deletada**: se a lista original foi deletada, cai na primeira lista ativa. Se não houver nenhuma ativa, erro 409 explicando.
- **Ordem na lista de origem ao restaurar**: vai pro fim (afterCardId = último ativo). Simples e previsível.
- **Contagem total**: exposta em `board.completedCount` pra evitar query extra. Recalculada no `GET /boards/:id`.
