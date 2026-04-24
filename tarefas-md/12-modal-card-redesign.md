# 12 — Redesign do Modal do Card (padrão Ummense)

Aproximar o popup do card do layout do Ummense (2 colunas + Timeline unificada). Foco em UX já no commit inicial; features novas (líder dedicado, privacidade do card, duplicar/card filho/excluir, upload em comentário) ficam em commits seguintes conforme prioridade.

## Escopo

### Dentro (commit inicial)

- **Layout 2 colunas**: esquerda = dados do card; direita = Timeline
- **Header** no topo com: título editável inline, calendário/prazo inline, status computado ("Ativo" / "Finalizado"), menu `...` (só com itens triviais no começo)
- **Coluna esquerda** com blocos claros tipo Ummense:
  - Linha superior: Líder + Equipe (avatars) + cadeado (só visual por ora)
  - Descrição (textarea rich-text simples)
  - Tags (nossas labels)
  - Contatos = atribuição de membros da Org
  - Prioridade + Prazo (mantém por ora, move pra sidebar zero)
  - Tarefas do card — placeholder com botão "Adicionar tarefa" desabilitado (aviso "em breve")
- **Coluna direita — Timeline unificada**:
  - Input de anotação no topo (reaproveita o `comments` atual)
  - Tabs: `Todos · Anotações · Minhas anotações · Registros`
  - Feed cronológico misturando comentários + activities
- **Menu `...`**: "Copiar URL do card" e "Abrir em nova aba" (triviais). Outros itens aparecem disabled com tooltip "em breve":
  - Duplicar card
  - Criar card filho
  - Tornar filho de…
  - Excluir card

### Fora (commits seguintes, 1 por feature)

- Campo **Líder** no schema (hoje pega o 1º membro) — migration `Card.leadId`
- **Privacidade do card** (`visibility` próprio) — migration
- **Checklists completas** (já planejadas na Fase 1)
- **Duplicar card** (endpoint + ação)
- **Card filho / tornar filho de** (usa `parentCardId` existente) — modal de busca
- **Excluir card** (soft delete com `deletedAt` + job de purga 30d)
- **Menções `@` com autocomplete** (hoje o comment já aceita texto literal `@fulano`)
- **Anexo + emoji em comentário**

## Etapas

1. Plano deste doc
2. Componente `timeline-feed.tsx` — junta comments + activities, filtra por tab, mostra input de nova anotação (reaproveita a mutação de create comment)
3. Reescrita de `card-modal.tsx`:
   - Header novo com título / prazo / status / menu
   - Nova coluna esquerda com os blocos
   - Lado direito passa a renderizar `TimelineFeed`
4. Remoção do `card-sidebar.tsx` antigo (campos migram pra esquerda; "Arquivar card" vai pro menu `...`)
5. Typecheck + commit + deploy

## Critérios de aceite

- [x] Modal abre com layout 2-col em telas >= 900px; em mobile quebra em 1 col (Timeline abaixo)
- [x] Header tem título editável, badge de status (computado de `completedAt`), ícone de prazo com popover, e menu `...`
- [x] Menu `...` copia URL (funciona) e abre em nova aba (funciona); demais itens disabled com rótulo "em breve"
- [x] Tabs da Timeline filtram corretamente: Todos mostra comments + activities; Anotações só comments; Minhas anotações só comments do user atual; Registros só activities
- [x] Input de anotação aceita Ctrl/⌘+Enter
- [x] Arquivar card agora mora no menu `...`
- [x] Typecheck + testes verdes
- [ ] Smoke test em prod — pendente deploy

## Riscos / decisões

- **Evitar regressão em comentários**: reusar `CommentThread` internamente, só renderizar como items da Timeline com outros tipos
- **Activities têm payload em JSON**: precisa renderizador por `type` (já temos `ACTIVITY_LABELS` no sidebar antigo). Extrai pra `lib/activity-format.ts` reutilizável
- **Prioridade**: não aparece no Ummense, mas temos. Mantém no bloco "Detalhes" pra não perder funcionalidade
- **"Contatos" vs "Membros"**: no Ummense é entidade separada (CRM-like). No KTask mapeamos pra CardMember — chamamos de **Contatos** na UI (rótulo), mas continua sendo atribuição de membro da Org
- **Mobile**: <900px vira 1 coluna, Timeline abaixo dos dados; a sidebar responsiva do modal atual já tem o padrão
