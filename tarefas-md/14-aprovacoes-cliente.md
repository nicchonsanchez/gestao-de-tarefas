# 14 — Aprovações por cliente/revisor (role "Cliente" no card)

> **Status:** parkado pra Fase 2 (casado com a engine de automações). Aqui fica registrada a ideia e um primeiro desenho pra quando chegar a hora.

## Motivação

Em vários fluxos (criação de conteúdo, orçamentos, arte, contratos) existe uma etapa em que **alguém externo ao time de execução precisa aprovar ou reprovar** o entregável. Hoje isso é feito informalmente no WhatsApp. O KTask pode absorver esse momento como parte do card:

- Um **revisor** (cliente, gerente, coordenador pedagógico…) recebe o card no quadro dele
- Vê um botão grande **Aprovar / Reprovar** e, ao decidir, pode escrever considerações na timeline
- A decisão **muda o destino do card**: aprovado vai pra coluna X, reprovado vai pra coluna Y
- Esse destino **varia por fluxo** (num board "Produção ANEC", aprovado = "Publicar"; noutro, "Entregue"; etc)

## Role "Cliente" no card (distinto de líder e membro)

Hoje o card tem:

- **Líder** (`Card.leadId`) — responsável principal
- **Membros** (`CardMember`) — equipe executora

A ideia é adicionar uma terceira dimensão:

- **Revisores** (`CardMember.role`) — usuários que só "aprovam/reprovam", não executam

### Schema proposto

```
enum CardMemberRole {
  MEMBER     // Executor (o que já temos, default)
  REVIEWER   // Revisor/Cliente - aprovação de etapa
}

model CardMember {
  cardId String
  userId String
  role   CardMemberRole @default(MEMBER)
  // ...
}
```

E o **histórico de aprovações** como entidade própria, pra registrar quem aprovou o quê, quando e com qual nota:

```
enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}

model CardApproval {
  id              String          @id @default(cuid())
  cardId          String
  requestedById   String          // quem pediu (executor)
  reviewerId      String          // quem deve decidir
  status          ApprovalStatus  @default(PENDING)
  requestedAt     DateTime        @default(now())
  decidedAt       DateTime?
  note            String?         // considerações do revisor
  // ação após decisão (ver seção Automação)
  onApproveListId String?
  onRejectListId  String?

  card     Card @relation(...)
  reviewer User @relation("CardApprovalReviewer", ...)
  requester User @relation("CardApprovalRequester", ...)
}
```

## UX

### Pedir aprovação

- Menu `...` do card ganha "**Pedir aprovação**"
- Abre diálogo: "Quem revisa?" (escolhe um REVIEWER do card) + "Ao aprovar, vai pra" / "Ao reprovar, vai pra" (selects das colunas do board)
- Submit cria um `CardApproval` status=PENDING

### Visão do revisor

- No topo do card, banner destacado: "Aguardando sua aprovação" com dois botões grandes **Aprovar** / **Reprovar** (variant primary / danger)
- Ao apertar, pede "Considerações" (textarea opcional) — se preencher, vira um comentário na timeline automaticamente
- Decisão grava o `CardApproval` e dispara a ação (move card pra lista configurada)

### Timeline

- Cada decisão aparece como uma entrada de activity: "**Fulano aprovou** o card · há X" / "**Fulano reprovou** — _considerações..._"
- Abas da timeline já filtram por "Registros" vs "Anotações", não precisa de nada novo

## Conexão com a engine de automações (Fase 2)

A decisão do revisor é um **trigger**:

```
trigger: CARD_APPROVED           → actions: [MOVE_TO_LIST(onApproveListId), NOTIFY_LEAD, ...]
trigger: CARD_REJECTED           → actions: [MOVE_TO_LIST(onRejectListId), NOTIFY_REQUESTER, ...]
```

Se não houver automação configurada no board, cai num **default** vindo do próprio `CardApproval` (os campos `onApproveListId` / `onRejectListId`). Isso destrava uso **mesmo antes da engine de automações estar pronta**.

### Branching por campo personalizado (depois)

Futuramente, com campos personalizados, o destino pode ser condicional:

```
quando CARD_APPROVED:
  se campo "Tipo de cliente" = "Premium" → lista "Entrega expressa"
  senão → lista "Publicar"
```

Isso é o conceito de **branch** que o Ummense tem na engine. Entra quando campos personalizados entrarem.

## Endpoints (Fase 2)

- `POST /cards/:id/approvals` — solicita aprovação (body: reviewerId, onApproveListId, onRejectListId)
- `POST /cards/:id/approvals/:approvalId/decide` — revisor decide (body: status, note)
- `GET /cards/:id/approvals` — histórico de aprovações do card
- `GET /users/me/pending-approvals` — "minha caixa de entrada" (quando abrir perfil de cliente)

## Permissões

- Qualquer `CardMember` com role MEMBER + EDITOR no board pode **solicitar** aprovação
- Só o `reviewerId` do `CardApproval` pode **decidir** (ou OWNER/ADMIN da Org por bypass)
- GUEST pode ser REVIEWER (útil pra convidar cliente externo sem dar acesso ao board todo)

## Casos de uso (pro teste quando chegar)

1. **Artigo de blog na ANEC**: Anna Catarina escreve → coloca Fernanda como REVIEWER → pede aprovação → Fernanda aprova → card vai pra "Publicar"
2. **Arte da Kharis**: Designer cria → Coordenador revisa → Reprovado volta pra "Refação" com considerações → Refeito → Segundo pedido → Aprovado → "Entregue"
3. **Contrato**: Thiago prepara → OWNER revisa → Aprova → "Assinar" / Reprova → "Ajustar com o cliente"

## Riscos / decisões

- **Reviewer pode ser GUEST** (convidado sem acesso ao board todo): precisa de rota de "caixa de aprovação" isolada pra ele não navegar livre no board
- **Aprovação sem REVIEWER atribuído**: bloquear no backend com mensagem clara
- **Reprovar sem nota**: permitir, mas dar UX nudge ("Considerações ajudam o time a ajustar")
- **Múltiplos revisores**: começar com 1 só; se precisar, evoluir pra "todos aprovam" ou "qualquer aprova"
- **Decisão reversível?**: inicialmente não — quer desfazer, pede nova aprovação. Simples e auditável.

## Itens pré-requisitos antes desta feature

- [x] `Card.leadId` (já feito) — base pro conceito de responsabilidades granulares
- [ ] `CardMember.role` — adicionar enum
- [ ] Engine de automações da Fase 2 (ideal, mas dá pra lançar com fallback pelos campos de default no `CardApproval`)
- [ ] Campos personalizados (só pra branching condicional — feature pode ir sem isso)
