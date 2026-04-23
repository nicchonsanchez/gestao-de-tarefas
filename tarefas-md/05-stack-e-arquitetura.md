# Stack e Arquitetura

## Decisão de stack

| Camada | Escolha | Por quê |
|---|---|---|
| Linguagem | **TypeScript** (strict) em todo o monorepo | Tipos compartilhados frontend/backend, contrato garantido |
| Frontend | **Next.js 15 App Router** + React 19 | SSR/SSG onde útil, ecossistema forte, já padrão dos outros sistemas Kharis |
| UI | **Tailwind CSS** + **shadcn/ui** + **Radix Primitives** | Velocidade + acessibilidade nativa |
| Drag & Drop | **@dnd-kit** | Mais ergonômico e acessível que react-beautiful-dnd (abandonado) |
| Rich text | **Tiptap** (ProseMirror) | Schema controlado, JSON serializável, extensível para collaboration |
| Estado servidor | **TanStack Query v5** | Cache, optimistic UI, invalidation |
| Estado cliente | **Zustand** para estado global leve (tema, presença) | Simples, sem boilerplate |
| Formulários | **react-hook-form** + **Zod** | Validação compartilhada com backend |
| Backend | **NestJS 11** | Módulos, DI, guards, interceptors, gateways WS — perfeito para domínio com muitos módulos (auth, board, card, automation, integration) |
| ORM | **Prisma 6** | DX forte, tipo seguro, migrations versionadas |
| Banco | **PostgreSQL 16** | `jsonb`, `tsvector`, `uuid`, robusto; futuro RLS nativo para SaaS |
| Cache + Pub/Sub | **Redis 7** | BullMQ, Socket.IO adapter, cache de leitura |
| Filas | **BullMQ** | Retry exponencial, prioridades, delayed jobs, cron jobs — padrão de facto Node |
| Real-time | **Socket.IO 4** + adapter Redis | Funciona em polling fallback, escalável |
| Storage | **S3-compatible** (MinIO dev, DO Spaces/R2/S3 prod) | Padrão, barato, SDKs maduros |
| E-mail | **Resend** ou **AWS SES** (MVP com Mailpit em dev) | Transacional confiável |
| WhatsApp | **Evolution API** (serviço externo que você já usa) | Integração via REST, webhook, compatível com Baileys |
| Auth | **Próprio** (access JWT 15min + refresh httpOnly) | Controle total; NextAuth introduz acoplamentos desconfortáveis em multi-tenant |
| Validação | **Zod** no front, **Zod** (ou class-validator) no backend | Single source of truth via types |
| Testes | **Vitest** (unit), **Playwright** (e2e), **Supertest** (api) | Rápido, moderno |
| Monorepo | **pnpm workspaces + Turborepo** | Cache incremental, tasks paralelas |
| Container | **Docker Compose** (dev), imagens OCI em prod | Reprodutível |
| CI/CD | **GitHub Actions** | Padrão do time |
| Observabilidade | **Pino** logs + **OpenTelemetry** + **Sentry** + **Grafana/Prometheus** | Stack aberto, fácil de evoluir |

### Alternativas consideradas e descartadas

- **Next.js fullstack sem Nest** (Server Actions + Route Handlers): descartado porque o domínio tem engine de automações, gateway WS, filas, integrações — NestJS organiza isso com módulos/DI. Next puro funciona até `~v1`, depois vira sopa.
- **Drizzle ORM** em vez de Prisma: Drizzle é mais performático em queries complexas, mas perde em DX e ecossistema. Decisão: Prisma até bater em limite; migrar regiões quentes para Drizzle se necessário.
- **tRPC**: poderoso para fullstack TS, mas queremos **OpenAPI estável** desde o início (pensando em SaaS, integrações, Postman do cliente). Nest gera OpenAPI nativamente.
- **Inngest / Trigger.dev**: ótimos para funções durable, mas adicionam dependência SaaS num momento em que queremos tudo auto-hospedável.
- **Pusher / Ably**: dependência paga + vendor lock. Socket.IO com Redis resolve.
- **Supabase**: traz auth+db+storage, mas o custo de integrar com NestJS e o risco de vendor lock superam o ganho.

## Estrutura do monorepo

```
sistema-gestao-de-tarefas/
├── apps/
│   ├── web/                          # Next.js 15
│   │   ├── src/
│   │   │   ├── app/                  # App Router
│   │   │   │   ├── (auth)/           # login, cadastro, convite
│   │   │   │   ├── (app)/            # area logada
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── page.tsx      # home / quadros recentes
│   │   │   │   │   ├── b/[boardId]/  # quadro
│   │   │   │   │   ├── c/[cardId]/   # deep link card
│   │   │   │   │   ├── automacoes/
│   │   │   │   │   ├── configuracoes/
│   │   │   │   │   └── notificacoes/
│   │   │   │   ├── f/[slug]/         # formulários públicos
│   │   │   │   └── api/              # BFF leve: proxy WS, arquivos, uploads
│   │   │   ├── components/
│   │   │   │   ├── board/            # BoardCanvas, List, Card, CardModal
│   │   │   │   ├── automation/       # builder visual
│   │   │   │   ├── ui/               # shadcn
│   │   │   │   └── common/
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts     # axios/fetch + interceptor refresh token
│   │   │   │   ├── socket.ts         # cliente Socket.IO
│   │   │   │   ├── auth.ts           # helpers de sessão
│   │   │   │   └── i18n.ts
│   │   │   ├── hooks/                # useBoard, useCard, useRealtime, useCurrentOrg
│   │   │   ├── stores/               # zustand
│   │   │   └── styles/
│   │   └── next.config.mjs
│   └── api/                          # NestJS
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── common/               # filters, interceptors, guards, decorators
│       │   │   ├── auth/             # JwtGuard, OrgGuard, BoardRoleGuard
│       │   │   ├── tenant/           # TenantContextMiddleware
│       │   │   └── pipes/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── organizations/
│       │   │   ├── memberships/
│       │   │   ├── boards/
│       │   │   ├── lists/
│       │   │   ├── cards/
│       │   │   ├── comments/
│       │   │   ├── attachments/
│       │   │   ├── labels/
│       │   │   ├── checklists/
│       │   │   ├── custom-fields/
│       │   │   ├── automations/
│       │   │   │   ├── engine/       # trigger registry, action runner
│       │   │   │   ├── actions/      # um arquivo por action (whatsapp, assign, ...)
│       │   │   │   └── triggers/
│       │   │   ├── notifications/
│       │   │   ├── activities/
│       │   │   ├── forms/
│       │   │   ├── integrations/
│       │   │   │   └── evolution/    # WhatsAppEvolutionService
│       │   │   ├── time-tracking/
│       │   │   ├── sla/
│       │   │   ├── search/
│       │   │   ├── webhooks/
│       │   │   ├── realtime/         # Socket.IO gateway
│       │   │   └── health/
│       │   ├── queues/               # definição de filas e processors
│       │   │   ├── automation.processor.ts
│       │   │   ├── email.processor.ts
│       │   │   ├── whatsapp.processor.ts
│       │   │   ├── sla.scheduler.ts  # cron
│       │   │   └── rebalance-positions.processor.ts
│       │   └── prisma/               # PrismaModule (service global)
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       └── test/                     # e2e com supertest
├── packages/
│   ├── contracts/                    # Zod schemas + tipos DTO compartilhados
│   ├── ui/                           # shadcn components reaproveitados (opcional)
│   ├── config-eslint/
│   ├── config-tsconfig/
│   └── utils/                        # funções puras (ex: position helpers)
├── infra/
│   ├── docker-compose.yml            # dev: postgres, redis, minio, mailpit
│   └── docker-compose.prod.yml
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Arquitetura em camadas (backend)

```
Controller (HTTP/WS)
   │  valida DTO (Zod), extrai user/org
   ▼
Guard (JwtGuard → OrgGuard → BoardRoleGuard)
   │
   ▼
Service (regra de negócio)
   │  usa PrismaService + outros services
   │  emite eventos via EventEmitter
   ▼
Prisma (repositório)
   │
   ▼
PostgreSQL
```

### Eventos internos e filas

- Services publicam eventos de domínio (`card.moved`, `comment.created`, …) via **Nest EventEmitter2**.
- Um listener central transforma evento em:
  1. **Activity** persistida,
  2. **Socket.IO emit** para os canais relevantes,
  3. Avaliação de **automations** (enfileira se casa),
  4. **Notifications** e webhooks.

```
Service.moveCard()
   │
   └─▶ EventEmitter.emit('card.moved', payload)
           │
           ├─▶ ActivityService.record()
           ├─▶ RealtimeGateway.broadcast('board:{id}', 'card.moved', ...)
           ├─▶ AutomationDispatcher.match('CARD_MOVED_TO_LIST', payload) → BullMQ
           └─▶ NotificationService.fanOut()
```

## Engine de Automações

Contrato:
```ts
type Trigger =
  | { type: 'CARD_MOVED_TO_LIST'; params: { listId: string } }
  | { type: 'CARD_CREATED_IN_LIST'; params: { listId: string } }
  | { type: 'DUE_DATE_APPROACHING'; params: { daysBefore: number } }
  | { type: 'FIELD_CHANGED'; params: { fieldId: string; to?: unknown } }
  | { type: 'SLA_BREACHED'; params: { listId?: string } }
  | { type: 'FORM_SUBMITTED'; params: { formId: string } }
  | { type: 'WEBHOOK_RECEIVED'; params: { webhookId: string } }
  | { type: 'SCHEDULED'; params: { cron: string } };

type Condition = {
  op: 'AND' | 'OR';
  rules: Array<
    | { field: 'label'; operator: 'includes' | 'notIncludes'; value: string }
    | { field: 'priority'; operator: 'eq' | 'neq'; value: Priority }
    | { field: 'assignee'; operator: 'includes'; value: string }
    | { field: `custom.${string}`; operator: 'eq' | 'neq' | 'gt' | 'lt'; value: unknown }
  >;
};

type Action =
  | { type: 'MOVE_TO_LIST'; params: { listId: string } }
  | { type: 'ASSIGN_MEMBER'; params: { userId: string } }
  | { type: 'ADD_LABEL'; params: { labelId: string } }
  | { type: 'SET_FIELD'; params: { fieldId: string; value: unknown } }
  | { type: 'POST_COMMENT'; params: { template: string } }
  | { type: 'SEND_EMAIL'; params: { to: 'assignees' | 'creator' | string[]; templateId: string } }
  | { type: 'SEND_WHATSAPP'; params: { to: `field:${string}` | string; templateId: string } }
  | { type: 'CREATE_CARD'; params: { boardId: string; listId: string; fromTemplate?: string } }
  | { type: 'CALL_WEBHOOK'; params: { url: string; body: unknown } }
  | { type: 'DELAY'; params: { minutes: number } };
```

**Fluxo de execução**:
1. Evento de domínio → `AutomationDispatcher` filtra automations `isEnabled` que casem com o `Trigger`.
2. Enfileira job `automation:run` com `{automationId, context}`.
3. Worker carrega automation, avalia `conditions`, se passa executa `actions` sequencialmente (com suporte a `DELAY` via `bull.add({ delay })`).
4. Cada ação loga em `AutomationRun.actionsLog`.
5. Falha em uma ação: retry (3x exponencial); se todas as retentativas falharem, marca run como `FAILED` e notifica criador.

**Rendering de variáveis**: helper `renderTemplate(str, {card, user, org})` substitui `{{card.title}}`, `{{card.field.telefone}}`, etc. usando path resolver seguro (sem eval).

## Real-time (Socket.IO Gateway)

- Conexão exige JWT no handshake. Guard valida e popula socket.data com user + orgs.
- Cliente emite `join` para canais:
  - `user:{userId}` (notificações pessoais)
  - `org:{orgId}` (eventos de quadros/organização)
  - `board:{boardId}` (quando abre quadro; server valida BoardMember)
- Presença rastreada em Redis (`presence:board:{id}` → set com TTL por heartbeat de 20s).
- Escalabilidade horizontal via Socket.IO Redis Adapter.

## Autenticação em detalhe

- `POST /auth/login` → retorna `{accessToken, refreshToken}`; access no body, refresh no cookie httpOnly+Secure+SameSite=Lax (expira 30d).
- `Authorization: Bearer {access}` em todas as requisições.
- Access expira em 15min → cliente intercepta 401, chama `POST /auth/refresh` (cookie enviado), recebe novos tokens, re-tenta.
- `POST /auth/logout` revoga `Session` correspondente.
- `POST /auth/logout-all` revoga todas as sessões do usuário.

## Tenant isolation

Middleware `TenantContextMiddleware` em todas as rotas autenticadas:
1. Extrai `organizationId` do header `X-Org-Id` (que o frontend sempre envia) ou do default do usuário.
2. Valida via `Membership` que o usuário pertence à Org.
3. Popula `req.tenant = {organizationId, membership}` (inclui `Membership.role`).

Todo service recebe `req.tenant` via decorator `@CurrentOrg()`. Services **nunca** confiam em `organizationId` vindo de body/query.

### BoardRoleGuard (resolução de permissão de quadro)

Pseudocódigo:
```ts
resolveBoardPermission(user, board, required: BoardRole) {
  const membership = await getMembership(user.id, board.organizationId);
  if (!membership) throw Forbidden;

  // Bypass: OWNER, ADMIN e GESTOR têm BoardRole=ADMIN implícito em todos os quadros da Org
  if (['OWNER', 'ADMIN', 'GESTOR'].includes(membership.role)) {
    return 'ADMIN';
  }

  // MEMBER/GUEST: precisa de BoardMember explícito OU quadro com visibility=ORGANIZATION (só MEMBER)
  const boardMember = await getBoardMember(user.id, board.id);
  if (boardMember) return boardMember.role;

  if (board.visibility === 'ORGANIZATION' && membership.role === 'MEMBER') {
    return 'VIEWER'; // Org-visible: MEMBER tem leitura por padrão; GUEST não
  }

  throw Forbidden;
}
```

Queries de listagem (`GET /boards`) aplicam o mesmo bypass: OWNER/ADMIN/GESTOR pulam o `WHERE boardMember.userId = me`; MEMBER/GUEST filtram.

Futuro SaaS: pode-se adicionar **Row-Level Security (RLS)** nativo do Postgres como defesa em profundidade, com `SET app.current_org = ...` no início de cada transação via Prisma middleware.

## Infra de desenvolvimento (docker-compose.yml)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: kharis_tarefas, POSTGRES_USER: dev, POSTGRES_PASSWORD: dev }
    ports: [ "5432:5432" ]
    volumes: [ pgdata:/var/lib/postgresql/data ]

  redis:
    image: redis:7-alpine
    ports: [ "6379:6379" ]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment: { MINIO_ROOT_USER: minio, MINIO_ROOT_PASSWORD: miniominio }
    ports: [ "9000:9000", "9001:9001" ]
    volumes: [ miniodata:/data ]

  mailpit:
    image: axllent/mailpit
    ports: [ "1025:1025", "8025:8025" ]

volumes: { pgdata: {}, miniodata: {} }
```

Scripts pnpm raiz:
- `pnpm dev` → `turbo run dev` (sobe web + api + workers)
- `pnpm infra:up` / `pnpm infra:down`
- `pnpm db:migrate` / `pnpm db:seed`
- `pnpm test` / `pnpm test:e2e`
- `pnpm lint` / `pnpm typecheck`

## Deploy (proposta inicial)

- **Staging**: Railway/Render, 1 serviço web, 1 api, 1 worker, Postgres managed, Redis managed.
- **Produção MVP interno**: VPS (Hetzner/DigitalOcean) com Docker Compose + Caddy (HTTPS automático) + backups noturnos.
- **Produção SaaS**: Kubernetes (EKS ou DOKS) com HPA nos workers, Managed Postgres (Neon/RDS), Managed Redis (Upstash/ElastiCache).

## Observabilidade

- **Logs**: Pino em JSON → stdout → agregador (Loki ou Elastic).
- **Traces**: OpenTelemetry SDK no Nest + Next, exportado para Tempo/Jaeger.
- **Métricas**: `prom-client` em Nest expõe `/metrics`; Prometheus faz scrape; Grafana renderiza.
- **Erros**: Sentry (web + api + workers) com release tagging e sourcemaps.
- **Dashboards essenciais**: uptime, latência p95/p99, QPS por endpoint, tamanho de filas (BullMQ UI também acessível em `/admin/queues` com guard), execuções de automation com taxa de falha.

## Conhecidos "pontos de atenção"

1. **Position rebalancing**: ordenação por float funciona bem mas degrada após muitos inserts entre. Job `rebalance-positions` roda periodicamente por List quando gap mínimo < threshold.
2. **Rich text colaborativo simultâneo**: MVP aceita "last write wins" com toast de conflito. v2 troca por Tiptap Collaboration (Yjs).
3. **WhatsApp delivery**: Evolution API pode estar fora (número banido, sessão caída). Toda automação com WhatsApp deve registrar falha e permitir reenvio manual.
4. **N+1 queries no quadro**: endpoint `GET /boards/{id}/full` precisa trazer lists+cards+labels+members em query única (Prisma `include` cuidadoso) ou via view materializada.
5. **Webhooks externos lentos**: ação `CALL_WEBHOOK` sempre assíncrona com timeout (10s) e retry; nunca bloqueia outras ações.
