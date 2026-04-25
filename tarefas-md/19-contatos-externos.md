# 19 — Contatos externos (agenda + vínculo com cards, padrão Ummense)

## Motivação

Hoje o card-modal tinha um bloco "Contatos" que **na verdade era a lista de membros da equipe** — um equívoco de modelo. Conferindo a [documentação oficial do Ummense](https://www.ummense.com/central-de-ajuda/agenda-de-contatos/como-criar-contato-pelo-card), descobrimos que **"Contatos do card" no padrão Ummense significa coisa completamente diferente**: contatos externos (clientes, fornecedores, parceiros) cadastrados numa **agenda da Org**, vinculados N:N a cards.

Caso de uso real Kharis:

- Card "ANEC | NOVO PORTAL" tem contato externo "ANEC" (empresa) + "Anna Catarina Fonseca" (pessoa, contato da ANEC)
- Card "Atendimento Catedral" tem contato "Catedral SP" (empresa)
- Mesmo contato pode estar em vários cards (cliente recorrente)

O bloco antigo foi **removido** em commit separado pra evitar confusão. Esta tarefa entrega a feature de verdade.

## Modelo de dados

```prisma
enum ContactType {
  PERSON
  COMPANY
}

model Contact {
  id             String      @id @default(cuid())
  organizationId String
  type           ContactType
  name           String
  email          String?
  phone          String?     // formato livre, formatação no front
  document       String?     // CPF/CNPJ
  note           String?     // observações internas
  // Hierarquia: pessoa pode estar vinculada a uma empresa (B2B).
  // Empresa não tem parent (parentId sempre null pra COMPANY).
  parentId       String?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  deletedAt      DateTime?

  organization Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  parent       Contact?      @relation("ContactPerson", fields: [parentId], references: [id], onDelete: SetNull)
  children     Contact[]     @relation("ContactPerson")
  cards        CardContact[]

  @@index([organizationId, type])
  @@index([organizationId, name])
  @@index([parentId])
}

model CardContact {
  cardId    String
  contactId String
  createdAt DateTime @default(now())

  card    Card    @relation(fields: [cardId], references: [id], onDelete: Cascade)
  contact Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@id([cardId, contactId])
  @@index([contactId])
}
```

Activity types novos: `CARD_CONTACT_LINKED`, `CARD_CONTACT_UNLINKED`, `CONTACT_CREATED`, `CONTACT_UPDATED`, `CONTACT_DELETED`.

## Endpoints (NestJS)

Módulo `contacts/`:

| Método | Path                                 | Descrição                                                        |
| ------ | ------------------------------------ | ---------------------------------------------------------------- |
| GET    | `/contacts`                          | Lista da agenda (filtros: type, q, parentId)                     |
| POST   | `/contacts`                          | Cria contato (pessoa ou empresa)                                 |
| GET    | `/contacts/:id`                      | Detalhe + cards vinculados                                       |
| PATCH  | `/contacts/:id`                      | Edita                                                            |
| DELETE | `/contacts/:id`                      | Remove (soft via `deletedAt`)                                    |
| POST   | `/cards/:cardId/contacts`            | Vincula contato existente OU cria-e-vincula (se body tem `name`) |
| DELETE | `/cards/:cardId/contacts/:contactId` | Desvincula                                                       |

Permissões:

- Listar/criar/editar contatos: GESTOR+
- MEMBER pode listar apenas; ler detalhes de contatos vinculados a cards onde tem acesso
- GUEST: só ver contatos de cards onde é membro
- Excluir: ADMIN+

## Frontend

### 1. Bloco "Contatos" no card-modal (substitui o que foi removido)

- Lista de contatos vinculados (avatar/iniciais + nome + tipo + telefone se houver)
- Combobox "Adicionar contato": busca na agenda + opção "Criar contato `<nome digitado>`" (pressionando Enter cria PERSON pelo nome)
- Hover em contato → X pra desvincular

### 2. Página `/contatos` (agenda da Org)

- Lista geral de contatos com filtros (Empresa/Pessoa, busca, "tem cards")
- Botão "Criar contato" (modal: tipo, nome, email, telefone, documento, vínculo com empresa)
- Linha clicável → modal de detalhes com lista de cards vinculados
- Edição inline + soft delete

### 3. Modal de detalhes do contato

- Header: tipo + nome + email + telefone + documento
- Aba "Cards vinculados" (lista paginada)
- Aba "Pessoas" (se for empresa: lista de pessoas vinculadas)

### 4. Sidebar/menu global

- Adicionar item "Contatos" no header global (próximo a "Membros")

## Critérios de aceite

- [ ] Migration `Contact` + `CardContact` + activity types
- [ ] Endpoints CRUD de contatos + vincular/desvincular
- [ ] Bloco "Contatos" funcional no card-modal com criação inline
- [ ] Página `/contatos` com lista, filtros, criação, edição, soft delete
- [ ] Hierarquia Empresa→Pessoas funcionando
- [ ] Permissões respeitadas (MEMBER limitado, GESTOR+ cria/edita)
- [ ] Item "Contatos" no menu

## Riscos / decisões

- **Importação inicial**: Kharis tem CRM em Pipedrive/HubSpot/etc com clientes existentes. Importação CSV no MVP (campo: name, type, email, phone, document, parent_name). Endpoint upload + parser. Vai ficar como sub-tarefa.
- **Email/telefone duplicado**: não bloqueio criação (mesmo contato pode estar cadastrado de jeitos diferentes). Vou avisar com toast "Existe um contato com esse email — usar?"
- **Soft delete**: `deletedAt` mantém histórico (cards antigos ainda referenciam). Agenda principal filtra `deletedAt: null`. Cards antigos mostram contato com badge "removido".
- **LGPD**: armazenar telefone/CPF de cliente externo é dado pessoal — quando entrar SaaS, precisa DPA + termos. Por agora (uso interno Kharis), aceitável; documentar política depois.
- **Tabela do timesheet** (print 5 do doc 18) tem coluna "Contatos do card" — quando implementar essa tabela, ela usa essa relação.

## Dependências

- Schema: precisa rodar **antes** ou **junto** com a feature de contatos no timesheet (doc 18 etapa 4).
- Sem dep de outras features pra começar.

## Próximos passos sugeridos

1. Migration + endpoints CRUD de contatos
2. Endpoints de vincular/desvincular ao card
3. Bloco "Contatos" no card-modal com criação inline
4. Página `/contatos`
5. Importação CSV (sub-tarefa opcional)

Estimativa: ~1 dia.
