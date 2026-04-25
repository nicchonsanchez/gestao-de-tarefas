# KTask

Sistema interno de gestão de tarefas e fluxos operacionais da Kharis. Quadros Kanban colaborativos com automações, integração WhatsApp, formulários públicos, SLAs e time tracking — tudo num único produto, multi-tenant desde o dia zero, com arquitetura preparada para virar SaaS sem refactor.

> **Status:** Fundação concluída · MVP em desenvolvimento. Roadmap detalhado em [`tarefas-md/06-roadmap-mvp.md`](tarefas-md/06-roadmap-mvp.md).

---

## Recursos principais

- **Quadros colaborativos** com drag & drop em tempo real, presença de usuários e reconexão com re-sync
- **Engine de automações** — triggers, condições e ações (mover card, atribuir, enviar e-mail/WhatsApp, criar card em outro quadro, agendar, delay, webhook)
- **Integração WhatsApp nativa** via Evolution API — disparos em automações e criação de cards a partir de mensagens recebidas
- **Formulários públicos** que geram cards e acionam automações
- **SLA por lista**, **time tracking**, **campos personalizados**, **checklists**, **labels**, **comentários com menções**
- **Multi-tenant** com `organizationId` em todas as entidades
- **Papéis granulares** — Dono / Administrador / Gestor / Membro / Convidado (Org) e Admin / Editor / Comentarista / Observador (Quadro)
- **Activity log** completo, busca global (Ctrl+K), notificações in-app + e-mail + WhatsApp

## Stack

- **Monorepo** pnpm + Turborepo
- **Frontend** Next.js 15 (App Router) + React 19 + Tailwind + shadcn/ui + @dnd-kit + Tiptap + TanStack Query
- **Backend** NestJS 11 + Prisma 6 + PostgreSQL 16
- **Filas** BullMQ + Redis 7
- **Real-time** Socket.IO com adapter Redis
- **Storage** S3-compatible (MinIO em dev)
- **Integração** Evolution API (WhatsApp)
- **Auth** JWT access 15min + refresh httpOnly com rotação

## Rodando localmente

### Pré-requisitos

- **Node.js 22+** (ver `.nvmrc`)
- **pnpm 9+** (`corepack enable` habilita automaticamente)
- **Docker Desktop** com Compose (pra Postgres, Redis, MinIO, Mailpit)

### Primeiro setup

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir infra + popular seed
pnpm dev          # sobe tudo; pode parar (Ctrl+C) após ver web+api prontos
pnpm db:seed      # em outro terminal — cria Org "Kharis" + OWNER

# 3. Rodar em dev (reusa a infra já de pé)
pnpm dev
```

`pnpm dev` faz automaticamente:

1. Verifica se Docker Desktop está rodando
2. Sobe `infra/docker-compose.yml` com `--wait` (espera Postgres/Redis/MinIO/Mailpit healthy)
3. Cria `apps/api/.env` e `apps/web/.env.local` a partir dos `.env.example` se ainda não existirem
4. Aplica migrations pendentes (`prisma migrate deploy`, idempotente)
5. Inicia `apps/api` (NestJS watch) e `apps/web` (Next.js Turbopack) em paralelo

`Ctrl+C` encerra web+api; containers Docker continuam rodando (próximo start é instantâneo). `pnpm infra:down` derruba o resto.

### URLs locais

| Serviço         | URL                                                      |
| --------------- | -------------------------------------------------------- |
| Web (Next.js)   | http://localhost:3000                                    |
| API (NestJS)    | http://localhost:4000                                    |
| API Swagger     | http://localhost:4000/docs                               |
| Healthcheck     | http://localhost:4000/healthz                            |
| Readycheck (DB) | http://localhost:4000/readyz                             |
| Postgres        | localhost:**5433** (não 5432, pra não colidir com XAMPP) |
| Mailpit UI      | http://localhost:8025                                    |
| MinIO Console   | http://localhost:9001 (`minio` / `miniominio`)           |
| Prisma Studio   | `pnpm db:studio` (abre em 5555)                          |

### Credenciais de seed

- **E-mail:** `desenvolvimento@agenciakharis.com.br`
- **Senha:** `ktask123` (trocar no primeiro login)

## Estrutura do monorepo

```
ktask/
├── apps/
│   ├── api/              NestJS 11 — REST + WS + Workers
│   │   ├── src/
│   │   ├── prisma/       schema, migrations, seed
│   │   └── Dockerfile
│   └── web/              Next.js 15 App Router
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── lib/
│       │   └── styles/
│       └── next.config.ts
├── packages/
│   ├── config-eslint/    config ESLint compartilhado
│   ├── config-tsconfig/  tsconfigs base (Nest, Next, lib)
│   ├── contracts/        Zod schemas e tipos DTO compartilhados
│   └── ui/               componentes compartilhados (shadcn base)
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── Caddyfile
├── tarefas-md/           planejamento e referência
└── .github/workflows/
```

## Scripts úteis

```bash
# Dev
pnpm dev                  # sobe web + api em paralelo
pnpm infra:up             # sobe docker-compose
pnpm infra:down           # derruba docker-compose
pnpm infra:logs           # streaming dos logs

# Banco
pnpm db:migrate           # cria/aplica migrations
pnpm db:seed              # roda seed
pnpm db:studio            # abre Prisma Studio

# Qualidade
pnpm lint                 # ESLint em tudo
pnpm typecheck            # tsc --noEmit em tudo
pnpm test                 # Jest
pnpm format               # Prettier --write
pnpm format:check         # Prettier --check

# Build
pnpm build                # turbo build em tudo
```

## Identidade visual

- Cor primária: **#6D28D9** (light) / **#7C3AED** (dark) — violet 700/600
- Accent: **#2EE8B8** (teal)
- Fonte: **Inter**
- Ícones: **Lucide**

Detalhes em [`tarefas-md/07-design-system.md`](tarefas-md/07-design-system.md).

## Roadmap por fase

| Fase     | Foco                                                                       | Status           |
| -------- | -------------------------------------------------------------------------- | ---------------- |
| **0**    | Fundação (monorepo, docker, CI, Prisma inicial)                            | concluída        |
| **MVP**  | Kanban core + permissões + real-time + notificações                        | em andamento     |
| **v1**   | Engine de automações + WhatsApp + campos + SLA + templates + time tracking | pendente         |
| **v1.5** | Formulários + views avançadas + webhooks + WhatsApp bidirecional           | pendente         |
| **v2**   | SaaS (billing, cadastro público, SSO, i18n)                                | parkado sem data |

## Deploy

Produção rodando em VM Hetzner via Docker Compose, com Caddy + Let's Encrypt e CI/CD por GitHub Actions. Detalhes em [`tarefas-md/10-deploy-producao.md`](tarefas-md/10-deploy-producao.md).

## Documentação

Pasta [`tarefas-md/`](tarefas-md/README.md) tem o planejamento completo: visão, requisitos funcionais e não-funcionais, modelo de domínio, fluxos principais, stack e arquitetura, design system, infra, engine de automações, deploy e checklist vivo.

## Licença

Proprietário — Kharis. Todos os direitos reservados.
