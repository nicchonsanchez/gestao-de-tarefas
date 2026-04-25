# 17 — Família de cards (hierarquia pai/filho)

> **Status:** Schema já tem `Card.parentCardId` + relação `Subtasks` desde a Fase 0. UI/serviços ainda não existem. Placeholder visual da aba "Família" do modal já está em `apps/web/src/components/board/card-family-tab.tsx`.

## Motivação

Quebrar uma demanda grande em pedaços menores mantendo o vínculo. Cenários típicos:

- "Plataforma KHARIS de e-mails + WhatsApp" (épico) → cards filhos: "Subir Chatwoot", "Configurar SMTP", "Treinar equipe", "Migrar contatos"
- "Campanha do dia das mães" → cards filhos: "Arte do post", "Copy do e-mail", "Disparo Evolution", "Acompanhamento de respostas"

Em cada caso, o pai é a visão alto nível; os filhos são o trabalho real, podendo ficar em fluxos diferentes (Tecnologia, Design, Comercial, etc).

## Modelo de dados

Já existe — não precisa migration:

```prisma
model Card {
  // ...
  parentCardId String?
  parent       Card?  @relation("Subtasks", fields: [parentCardId], references: [id], onDelete: SetNull)
  children     Card[] @relation("Subtasks")
}
```

Considerações:

- **Profundidade**: tecnicamente ilimitada, mas UX só renderiza pai + 1 nível de filhos (Ummense também é assim). Bisnetos só aparecem quando você abre o filho.
- **Cross-board**: filho **pode** estar num board diferente do pai. É o caso comum (épico no board "Coordenação", filhos espalhados em "Tecnologia", "Design", etc).
- **Excluir o pai**: `onDelete: SetNull` — filhos viram cards independentes (não cascateia delete).

## UX

### Aba "Família" do modal do card

```
┌──────────────────────────────────────────────────────────┐
│  Família de cards [PRO]              [+ Criar card filho]│
├──────────────────────────────────────────────────────────┤
│  📍 Card atual destacado (com pin de localização)        │
│     Tecnologia ◊ Fluxos Gerais                           │
│     [progresso da coluna atual]              👥 [data]  │
│                                                          │
│  ─ filhos abaixo ─                                       │
│  ▸ Card filho 1                              👥 [data]  │
│     Tecnologia ◊ Fluxos Gerais                           │
│     [progresso]                                          │
│                                                          │
│  ▸ Card filho 2                              👥 [data]  │
│     Design                                               │
│     [progresso]                                          │
└──────────────────────────────────────────────────────────┘
```

- **Pai** (se o card atual é filho): aparece em cima do card atual
- **Card atual**: linha em destaque (bg primary-subtle, pin de localização vermelho à esquerda)
- **Filhos**: lista abaixo, cada um com:
  - Título
  - Fluxo onde está (com mini-breadcrumb se categoria de fluxo)
  - Mini-barra de progresso (proporção da coluna atual / total de colunas)
  - Avatares dos membros
  - Prazo
  - Menu `...`

### Modal "Criar card filho"

Botão "+ Criar card filho" abre diálogo similar ao de Duplicar, mas:

- Campo **Nome do card filho** obrigatório
- Editor rich-text **Descrição** (campo destacado, não checkbox)
- Checkboxes do que copiar do pai:
  - Líder
  - Equipe
  - Tags
  - Prazo
  - (Privacidade quando existir)
- Combobox **Vincular card filho a um fluxo (opcional)**:
  - Default: mesmo fluxo + mesma coluna do pai
  - Se trocar: combobox de coluna do board destino
- Footer: "Criar e abrir card filho" (cria + abre o filho) · "Criar" (só cria)

### Menu `...` por filho

- "Visualizar card" (abre o filho no modal)
- "Mover para…" (escolher novo board+lista)
- "Desvincular do pai" (vira card independente, `parentCardId = null`)

### Indicador no card-item (board view)

Quando um card tem filhos: mostrar contagem "🌿 3 filhos" ou ícone de árvore + badge.
Quando um card é filho: mostrar ícone de subnível (↳) ou breadcrumb leve.

## Endpoints (a fazer)

- `POST /cards/:id/children` — cria filho (body com flags de copy + targetBoardId/listId opcional)
- `GET /cards/:id/family` — retorna pai + filhos diretos (com listas e fluxos pra renderizar progresso)
- `PATCH /cards/:id/parent` — vincular/desvincular (`parentCardId` muda)

## Permissões

- **Criar filho**: precisa de EDITOR no board do pai
- **Vincular a outro fluxo**: precisa de EDITOR também no board destino
- **Visualizar família**: VIEWER no board do pai (filhos em outros boards aparecem como linhas read-only se o user não tem acesso àquele board, ou são omitidos — decidir)

## Critérios de aceite (quando implementar)

- [ ] Endpoint POST /cards/:id/children criando filho com flags
- [ ] GET /cards/:id/family devolvendo árvore + dados pra render
- [ ] Aba Família mostra pai (se houver) + card atual + filhos diretos com barras
- [ ] Diálogo "Criar card filho" com seletor de fluxo+coluna
- [ ] Menu por filho: visualizar, mover, desvincular
- [ ] Indicador no card do board com contagem de filhos / sinal de "é filho"
- [ ] Filhos em outros boards aparecem read-only se sem acesso (ou filtrados)
- [ ] Ao excluir o pai, filhos viram independentes (testado)

## Itens relacionados

- [13 — Cards multi-fluxo](13-cards-multi-fluxo.md) — independente, mas as duas features juntas dão a base completa do "épico"
- [14 — Aprovações por cliente](14-aprovacoes-cliente.md) — pode usar pai/filho pra aprovações em cascata

## Riscos / decisões

- **Loop de família**: garantir que parentCardId não pode formar ciclo. Validação: ao setar parent, navegar pra cima e verificar se chega no próprio card.
- **Profundidade**: limitar a ~5 níveis pra evitar árvores monstro. Validar no endpoint.
- **Filhos cross-org**: nunca deve acontecer, mas validar pra não vazar entre Orgs (já temos `organizationId` denormalizado, isolamento por tenant).
