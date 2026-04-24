# Entidades e Modelo de Domínio

Nomes de entidades em **PascalCase**, campos em **camelCase**. Todo modelo multi-tenant carrega `organizationId` (direta ou indiretamente via FK) — é a regra de ouro.

> Formato: pseudo-Prisma. IDs são `String @id @default(cuid())` salvo quando indicado.

---

## Auth / Conta

### User

```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  emailVerifiedAt DateTime?
  passwordHash    String
  name            String
  avatarUrl       String?
  locale          String   @default("pt-BR")
  timezone        String   @default("America/Sao_Paulo")
  twoFactorSecret String?  // TOTP
  twoFactorEnabled Boolean @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  memberships     Membership[]
  sessions        Session[]
  notifications   Notification[]
  activities      Activity[]
  cardsAssigned   CardMember[]
  comments        Comment[]
  apiTokens       ApiToken[]
}
```

### Session

Refresh token persistido para permitir revogação ("logout em todas as sessões").

```prisma
model Session {
  id          String   @id @default(cuid())
  userId      String
  tokenHash   String   @unique // hash do refresh token
  userAgent   String?
  ip          String?
  createdAt   DateTime @default(now())
  expiresAt   DateTime
  revokedAt   DateTime?
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### ApiToken

```prisma
model ApiToken {
  id             String   @id @default(cuid())
  userId         String
  organizationId String
  name           String
  tokenHash      String   @unique
  lastUsedAt     DateTime?
  createdAt      DateTime @default(now())
  revokedAt      DateTime?

  user           User          @relation(fields: [userId], references: [id])
  organization   Organization  @relation(fields: [organizationId], references: [id])
}
```

## Organização (Tenant)

### Organization

```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logoUrl     String?
  timezone    String   @default("America/Sao_Paulo")
  locale      String   @default("pt-BR")
  plan        OrgPlan  @default(INTERNAL) // INTERNAL | FREE | PRO | ENTERPRISE
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  memberships    Membership[]
  boards         Board[]
  labels         Label[]      // labels globais da Org
  templates      Template[]
  invitations    Invitation[]
  integrations   Integration[]
  messageTemplates MessageTemplate[]
  webhooks       Webhook[]
  forms          Form[]
}
```

### Membership (User ↔ Organization com papel)

```prisma
model Membership {
  id             String   @id @default(cuid())
  userId         String
  organizationId String
  role           OrgRole  // OWNER | ADMIN | GESTOR | MEMBER | GUEST
  createdAt      DateTime @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
  @@index([organizationId])
}
```

### Invitation

```prisma
model Invitation {
  id             String   @id @default(cuid())
  organizationId String
  email          String
  role           OrgRole
  token          String   @unique
  invitedById    String
  expiresAt      DateTime
  acceptedAt     DateTime?
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

## Boards

### Board

```prisma
model Board {
  id             String     @id @default(cuid())
  organizationId String
  name           String
  description    String?
  color          String?    // hex
  icon           String?
  visibility     Visibility @default(PRIVATE) // PRIVATE | ORGANIZATION
  isArchived     Boolean    @default(false)
  createdById    String
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  lists          List[]
  labels         Label[]      // labels próprias do quadro
  members        BoardMember[]
  automations    Automation[]
  customFields   CustomField[]
  forms          Form[]
  activities     Activity[]
  templates      Template[]   @relation("BoardTemplates")

  @@index([organizationId, isArchived])
}
```

### BoardMember

```prisma
model BoardMember {
  id        String     @id @default(cuid())
  boardId   String
  userId    String
  role      BoardRole  // ADMIN | EDITOR | COMMENTER | VIEWER
  createdAt DateTime   @default(now())

  board Board @relation(fields: [boardId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([boardId, userId])
}
```

### List (Coluna)

Ordenação via float `position` (clássico trick para permitir inserção entre dois sem reindexar o mundo; reindexa periodicamente se diferença < epsilon).

```prisma
model List {
  id         String  @id @default(cuid())
  boardId    String
  name       String
  position   Float   // ordenação
  color      String?
  icon       String?
  wipLimit   Int?
  slaMinutes Int?    // SLA em minutos
  isArchived Boolean @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  board Board  @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cards Card[]

  @@index([boardId, position])
}
```

## Cards

### Card

```prisma
model Card {
  id             String   @id @default(cuid())
  organizationId String   // desnormalizado para queries e RLS
  boardId        String
  listId         String
  title          String
  description    Json?    // ProseMirror/Tiptap JSON
  position       Float
  priority       Priority @default(MEDIUM) // LOW | MEDIUM | HIGH | URGENT
  coverAttachmentId String?
  startDate      DateTime?
  dueDate        DateTime?
  completedAt    DateTime?
  estimateMinutes Int?
  isArchived     Boolean  @default(false)
  parentCardId   String?  // subtarefa (1 nível)
  createdById    String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  board         Board     @relation(fields: [boardId], references: [id], onDelete: Cascade)
  list          List      @relation(fields: [listId], references: [id], onDelete: Cascade)
  parent        Card?     @relation("Subtasks", fields: [parentCardId], references: [id])
  children      Card[]    @relation("Subtasks")
  members       CardMember[]
  labels        CardLabel[]
  checklists    Checklist[]
  attachments   Attachment[]
  comments      Comment[]
  customValues  CustomFieldValue[]
  activities    Activity[]
  timeEntries   TimeEntry[]
  blockedBy     CardDependency[] @relation("Blocked")
  blocks        CardDependency[] @relation("Blocker")
  whatsappMessages WhatsAppMessage[]

  @@index([organizationId])
  @@index([boardId, isArchived])
  @@index([listId, position])
  @@index([dueDate])
}
```

### CardMember (responsáveis)

```prisma
model CardMember {
  cardId String
  userId String
  card Card @relation(fields: [cardId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([cardId, userId])
}
```

### CardDependency

```prisma
model CardDependency {
  id           String  @id @default(cuid())
  blockedCardId String // é bloqueado por
  blockerCardId String // é bloqueador
  blocked  Card @relation("Blocked",  fields: [blockedCardId], references: [id], onDelete: Cascade)
  blocker  Card @relation("Blocker",  fields: [blockerCardId], references: [id], onDelete: Cascade)

  @@unique([blockedCardId, blockerCardId])
}
```

## Labels

### Label

Pode ser da Org (reutilizável entre quadros) ou do Board (escopo local). `boardId` nullable diferencia.

```prisma
model Label {
  id             String  @id @default(cuid())
  organizationId String
  boardId        String?
  name           String
  color          String  // hex
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  board        Board?       @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cards        CardLabel[]
}
```

### CardLabel

```prisma
model CardLabel {
  cardId  String
  labelId String
  card  Card  @relation(fields: [cardId], references: [id], onDelete: Cascade)
  label Label @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@id([cardId, labelId])
}
```

## Checklists

### Checklist

```prisma
model Checklist {
  id        String  @id @default(cuid())
  cardId    String
  title     String
  position  Float
  createdAt DateTime @default(now())

  card  Card            @relation(fields: [cardId], references: [id], onDelete: Cascade)
  items ChecklistItem[]
}
```

### ChecklistItem

```prisma
model ChecklistItem {
  id          String   @id @default(cuid())
  checklistId String
  text        String
  isDone      Boolean  @default(false)
  position    Float
  dueDate     DateTime?
  assigneeId  String?
  doneAt      DateTime?
  doneById    String?

  checklist Checklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)
}
```

## Anexos

### Attachment

```prisma
model Attachment {
  id          String   @id @default(cuid())
  cardId      String
  uploaderId  String
  fileName    String
  mimeType    String
  sizeBytes   Int
  storageKey  String   // caminho no S3
  url         String?  // opcional, quando usa URLs públicas
  kind        AttachmentKind // FILE | LINK | IMAGE
  externalUrl String?  // para kind=LINK
  createdAt   DateTime @default(now())

  card Card @relation(fields: [cardId], references: [id], onDelete: Cascade)
}
```

## Comentários

### Comment

```prisma
model Comment {
  id        String   @id @default(cuid())
  cardId    String
  authorId  String
  body      Json     // Tiptap JSON
  mentions  String[] // userIds mencionados (denormalizado para notificações)
  editedAt  DateTime?
  createdAt DateTime @default(now())
  deletedAt DateTime?

  card   Card @relation(fields: [cardId], references: [id], onDelete: Cascade)
  author User @relation(fields: [authorId], references: [id])
}
```

## Campos Personalizados

### CustomField

```prisma
model CustomField {
  id         String   @id @default(cuid())
  boardId    String
  name       String
  type       CustomFieldType // TEXT | LONG_TEXT | NUMBER | CURRENCY | DATE | SELECT | MULTISELECT | CHECKBOX | URL | EMAIL | PHONE | USER
  required   Boolean  @default(false)
  position   Float
  options    Json?    // para SELECT/MULTISELECT: [{id, label, color}]
  config     Json?    // config específica (ex: máscara, step numérico)
  createdAt  DateTime @default(now())

  board  Board              @relation(fields: [boardId], references: [id], onDelete: Cascade)
  values CustomFieldValue[]
}
```

### CustomFieldValue

```prisma
model CustomFieldValue {
  id        String  @id @default(cuid())
  cardId    String
  fieldId   String
  valueText String?
  valueNumber Decimal?
  valueDate DateTime?
  valueBool Boolean?
  valueJson Json?   // para multiselect, user list, etc.

  card  Card        @relation(fields: [cardId], references: [id], onDelete: Cascade)
  field CustomField @relation(fields: [fieldId], references: [id], onDelete: Cascade)

  @@unique([cardId, fieldId])
}
```

## Automações

### Automation

```prisma
model Automation {
  id          String   @id @default(cuid())
  boardId     String
  name        String
  isEnabled   Boolean  @default(true)
  trigger     Json     // { type: "CARD_MOVED_TO_LIST", params: { listId } }
  conditions  Json?    // [{ field, operator, value }] com AND/OR no topo
  actions     Json     // [{ type, params }] — array ordenado
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  board Board           @relation(fields: [boardId], references: [id], onDelete: Cascade)
  runs  AutomationRun[]
}
```

### AutomationRun

```prisma
model AutomationRun {
  id           String   @id @default(cuid())
  automationId String
  cardId       String?
  status       RunStatus // PENDING | RUNNING | SUCCESS | FAILED | SKIPPED
  triggerEvent Json
  actionsLog   Json     // passo a passo com ok/erro
  error        String?
  startedAt    DateTime @default(now())
  finishedAt   DateTime?

  automation Automation @relation(fields: [automationId], references: [id], onDelete: Cascade)
}
```

## Atividade / Audit Log

### Activity

Registro imutável de qualquer ação. Usado na timeline do card/quadro e em triggers de automação.

```prisma
model Activity {
  id             String   @id @default(cuid())
  organizationId String
  boardId        String?
  cardId         String?
  actorId        String?  // null = sistema
  type           ActivityType // CARD_CREATED | CARD_MOVED | COMMENT_ADDED | MEMBER_ASSIGNED | LABEL_ADDED | ...
  payload        Json     // dados específicos do evento (before/after)
  createdAt      DateTime @default(now())

  board Board? @relation(fields: [boardId], references: [id], onDelete: SetNull)
  card  Card?  @relation(fields: [cardId], references: [id], onDelete: Cascade)
  actor User?  @relation(fields: [actorId], references: [id])

  @@index([organizationId, createdAt])
  @@index([cardId, createdAt])
}
```

## Notificações

### Notification

```prisma
model Notification {
  id             String   @id @default(cuid())
  userId         String
  organizationId String
  type           NotificationType // MENTION | ASSIGNED | DUE_SOON | COMMENT | SLA_BREACH | CUSTOM
  title          String
  body           String?
  entityType     String?  // "card" | "board"
  entityId       String?
  isRead         Boolean  @default(false)
  readAt         DateTime?
  createdAt      DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead, createdAt])
}
```

### NotificationPreference

```prisma
model NotificationPreference {
  id             String   @id @default(cuid())
  userId         String   @unique
  channels       Json     // { mention: ["inapp","email","whatsapp"], ... }
  digestDaily    Boolean  @default(false)
  digestHour     Int      @default(8)
  mutedBoards    String[] // boardIds
}
```

## Formulários

### Form

```prisma
model Form {
  id             String   @id @default(cuid())
  organizationId String
  boardId        String
  targetListId   String
  slug           String   @unique
  title          String
  description    String?
  fields         Json     // array de { id, label, type, required, mapTo }
  styling        Json?    // cores, logo
  captchaEnabled Boolean  @default(true)
  isPublished    Boolean  @default(false)
  createdAt      DateTime @default(now())

  submissions FormSubmission[]
}
```

### FormSubmission

```prisma
model FormSubmission {
  id        String   @id @default(cuid())
  formId    String
  cardId    String?  // card gerado
  payload   Json
  ip        String?
  createdAt DateTime @default(now())
}
```

## Templates

### Template

```prisma
model Template {
  id             String   @id @default(cuid())
  organizationId String
  kind           TemplateKind // BOARD | CARD | CHECKLIST | AUTOMATION | MESSAGE
  name           String
  data           Json     // snapshot de criação
  isSystem       Boolean  @default(false) // templates oficiais vindos da galeria
  createdAt      DateTime @default(now())
}
```

## Time Tracking

### TimeEntry

```prisma
model TimeEntry {
  id        String   @id @default(cuid())
  cardId    String
  userId    String
  startedAt DateTime
  endedAt   DateTime?
  minutes   Int?     // calculado no endedAt ou informado manualmente
  note      String?
  source    TimeSource // TIMER | MANUAL
  createdAt DateTime @default(now())

  card Card @relation(fields: [cardId], references: [id], onDelete: Cascade)
}
```

## Integrações

### Integration

```prisma
model Integration {
  id             String   @id @default(cuid())
  organizationId String
  provider       IntegrationProvider // EVOLUTION_WHATSAPP | GOOGLE_DRIVE | ...
  name           String
  config         Json     // credenciais criptografadas (campo sensível)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

### MessageTemplate

Usado em ações de automação (WhatsApp, e-mail).

```prisma
model MessageTemplate {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  channel        Channel  // WHATSAPP | EMAIL | INAPP
  subject        String?
  body           String   // com variáveis {{card.title}}
  attachments    Json?
  createdAt      DateTime @default(now())
}
```

### WhatsAppMessage

Log do que foi enviado/recebido.

```prisma
model WhatsAppMessage {
  id            String   @id @default(cuid())
  organizationId String
  cardId        String?
  integrationId String
  direction     Direction // OUT | IN
  toNumber      String?
  fromNumber    String?
  body          String
  mediaUrl      String?
  status        WhatsAppStatus // QUEUED | SENT | DELIVERED | READ | FAILED
  externalId    String?  // id na Evolution
  errorMessage  String?
  createdAt     DateTime @default(now())
  deliveredAt   DateTime?
  readAt        DateTime?

  card Card? @relation(fields: [cardId], references: [id])
}
```

### Webhook

```prisma
model Webhook {
  id             String   @id @default(cuid())
  organizationId String
  boardId        String?
  url            String
  events         String[] // ["card.created", "card.moved", ...]
  secret         String   // HMAC
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
}
```

## Enums (resumo)

```
OrgRole      = OWNER | ADMIN | GESTOR | MEMBER | GUEST
BoardRole    = ADMIN | EDITOR | COMMENTER | VIEWER
OrgPlan      = INTERNAL | FREE | PRO | ENTERPRISE
Visibility   = PRIVATE | ORGANIZATION
Priority     = LOW | MEDIUM | HIGH | URGENT
AttachmentKind = FILE | LINK | IMAGE
CustomFieldType = TEXT | LONG_TEXT | NUMBER | CURRENCY | DATE | SELECT | MULTISELECT | CHECKBOX | URL | EMAIL | PHONE | USER
RunStatus    = PENDING | RUNNING | SUCCESS | FAILED | SKIPPED
ActivityType = CARD_CREATED | CARD_UPDATED | CARD_MOVED | CARD_ARCHIVED | COMMENT_ADDED | MEMBER_ASSIGNED | LABEL_ADDED | CHECKLIST_ITEM_DONE | ATTACHMENT_ADDED | AUTOMATION_EXECUTED | SLA_BREACHED | ...
NotificationType = MENTION | ASSIGNED | DUE_SOON | COMMENT | SLA_BREACH | AUTOMATION | CUSTOM
TemplateKind = BOARD | CARD | CHECKLIST | AUTOMATION | MESSAGE
TimeSource   = TIMER | MANUAL
IntegrationProvider = EVOLUTION_WHATSAPP | GOOGLE_DRIVE | ZAPIER
Channel      = WHATSAPP | EMAIL | INAPP
Direction    = OUT | IN
WhatsAppStatus = QUEUED | SENT | DELIVERED | READ | FAILED
```

## Diagrama de relacionamentos (visão macro)

```
Organization
 ├─ Membership ── User
 ├─ Board
 │    ├─ BoardMember ── User
 │    ├─ List
 │    │    └─ Card
 │    │         ├─ CardMember ── User
 │    │         ├─ CardLabel ── Label
 │    │         ├─ Checklist ── ChecklistItem
 │    │         ├─ Attachment
 │    │         ├─ Comment
 │    │         ├─ CustomFieldValue ── CustomField (no Board)
 │    │         ├─ TimeEntry
 │    │         ├─ Activity
 │    │         └─ WhatsAppMessage
 │    ├─ Automation ── AutomationRun
 │    ├─ CustomField
 │    ├─ Form ── FormSubmission
 │    └─ Label (quadro)
 ├─ Label (Org)
 ├─ Template
 ├─ Integration
 ├─ MessageTemplate
 ├─ Webhook
 ├─ Invitation
 └─ Activity (nível Org)
```

## Regras invariantes

1. **Tenant isolation**: toda query no backend passa por um middleware que injeta `organizationId` do usuário autenticado; qualquer model com `organizationId` é filtrado. Nenhum service pode receber `organizationId` do cliente.
2. **Posição de List/Card**: tipo `Float`, inserção por média entre vizinhos. Job periódico reindexia se diferenças ficarem abaixo de `1e-6`.
3. **Soft delete**: `isArchived` é a regra; `deletedAt` só em User e Organization.
4. **Activity é append-only**: nunca `UPDATE` ou `DELETE` (exceto purge > 90 dias).
5. **Denormalizações propositais**: `Card.organizationId` (para índices e RLS futuro), `Comment.mentions[]` (para fan-out de notificações sem parsing).
6. **JSON em rich-text e automações**: pagar o custo de validação ao salvar (schema Zod) para poder usar jsonb/gin index quando necessário.
7. **Acesso implícito de OWNER, ADMIN e GESTOR**: ao resolver permissão de qualquer quadro, o guard primeiro verifica se o usuário tem `Membership.role in (OWNER, ADMIN, GESTOR)` na Organização do quadro — se sim, trata como `BoardRole = ADMIN` implícito, dispensando lookup em `BoardMember`. Queries que listam quadros no sidebar também bypassam o filtro de `BoardMember` para esses três papéis (veem todos os quadros da Org). `MEMBER` precisa ser `BoardMember` explícito **ou** o quadro ter `visibility=ORGANIZATION`. `GUEST` sempre precisa ser `BoardMember` explícito.
