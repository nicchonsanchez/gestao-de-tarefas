# 13 — Cards em múltiplos fluxos (presença M:N com Board)

> **Status**: parkado pra Fase 2 (junto com automações). Este doc registra a decisão arquitetural e o UX de referência pra evitar redescobrir depois.

## Motivação

No Ummense um card pode viver em vários fluxos simultaneamente. Cada fluxo guarda a **coluna atual** e o **status de finalização independente**. Exemplo real:

- Card "ANEC | NOVO PORTAL" está em 2 fluxos:
  - `ANEC` → coluna `APROVAÇÃO`
  - `Tecnologia` → coluna `Aguardando retorno de terceiros`

Cenários típicos onde isso aparece:

- Uma demanda envolve mais de um setor (Tecnologia + Comercial + Design); cada setor acompanha no próprio fluxo mas é o mesmo card (mesmos comentários, anexos, líder, histórico).
- A "Finalização" acontece em tempos diferentes em cada fluxo — Tecnologia entrega antes de Comercial fechar.

## Modelo de dados proposto

Hoje o `Card` tem:

```
Card { id, boardId, listId, position, completedAt, completedById, ... }
```

`boardId` e `listId` são 1:1 com o card. Precisam sair pra uma tabela intermediária:

```
CardPresence {
  cardId           String
  boardId          String
  listId           String
  position         Float
  completedAt      DateTime?
  completedById    String?
  addedAt          DateTime  @default(now())
  removedAt        DateTime? // soft "desvincular"

  @@id([cardId, boardId])
  @@index([boardId, listId, position])
  @@index([boardId, completedAt])
}
```

Mudanças em `Card`:

- Remover `boardId`, `listId`, `position`, `completedAt`, `completedById`
- Ganha `primaryBoardId` (só pra saber de onde o card "nasceu" — útil pra permissão inicial)

Mudanças em `Activity`:

- `boardId` atual já existe e fica. Quando uma ação acontece via um fluxo específico, a activity vai pra `boardId` daquela presença. No feed do card (unificado), agregamos todas.

Permissão:

- Acesso ao card = união de acessos a qualquer um dos `boards` onde ele tem presença. Uma pessoa sem acesso ao fluxo "Comercial" não vê atividades desse fluxo na timeline.

## UX de referência (Ummense)

**Aba "Fluxos" dentro do modal do card:**

- Lista vertical dos fluxos onde o card tem presença ativa
- Cada fluxo como barra horizontal compacta:
  - Ícone de relógio (histórico daquele fluxo)
  - Todas as listas em sequência com a atual destacada
  - Ícone de check ✓ no fim = "Finalizar nesse fluxo" (não é coluna, é terminal)
  - Menu `...` por fluxo: remover do fluxo, mover, finalizar
- Botão "**Vincular a outro fluxo**" → abre modal de busca de fluxos
- Toggle "**Exibir fluxos inativados**" → mostra presenças com `removedAt != null`

**Coluna Finalizado no Kanban:**

- Barra estreita no fim do board (não coluna cheia)
- Ícone check + contagem; click abre drawer
- Drop = finalizar **nesse fluxo apenas** (não afeta outras presenças)

## Impactos em features já existentes

- **Move entre listas**: hoje muta `Card.listId`. Vai mutar `CardPresence.listId` onde `boardId = X`
- **Finalizar**: muta `CardPresence.completedAt`, não `Card.completedAt`
- **Coluna virtual Finalizado**: conta por board, filtra por board (já está assim, só troca a fonte)
- **Activity log**: já tem `boardId`. Cada ação pertence a um fluxo específico
- **Realtime**: eventos `card.*` são emitidos pra `board:{id}` do fluxo onde a ação aconteceu. Usuários de outros fluxos não recebem — comportamento desejado
- **Comentários**: ficam no Card (não na presença). Um comentário aparece em todos os fluxos
- **Busca**: um card bate se qualquer `CardPresence` bater no filtro
- **Automações (Fase 2)**: actions tipo "mover card pra lista X" precisam especificar em qual fluxo

## Migration plan (quando chegar a hora)

1. Criar tabela `CardPresence` vazia
2. Popular com `INSERT INTO CardPresence SELECT id, boardId, listId, position, completedAt, completedById, createdAt, null FROM Card`
3. Adicionar `primaryBoardId` em Card (= boardId atual)
4. Code shim: queries que leem `card.listId` passam a ler `cardPresence.listId WHERE boardId = ctx.boardId`
5. Deploy do shim (ainda com colunas velhas)
6. Deploy que remove colunas velhas do Card + índices redundantes
7. Backfill migration

Cuidado especial: **move entre fluxos** — precisa semântica nova ("desvincula de A e vincula em B" vs "vincula em B mantendo em A"). UX: drag entre boards diferentes **copia a presença**, clique em "mover" no menu **transfere** (remove + adiciona).

## Itens relacionados (não entram aqui, só ficam anotados)

- **Card filho / hierarquia**: ortogonal. Schema já tem `Card.parentCardId`. UX "Família" no Ummense.
- **"Contatos"**: entidade própria deles (CRM-like). Mapeamos pra `CardMember` por enquanto.
- **Campos personalizados**: parkados, entram na Fase 2.
