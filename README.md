# KTask

Sistema de gestão de tarefas e fluxos operacionais da Kharis, inspirado em **Ummense** (automações, SLAs, formulários, time tracking) e **Trello** (UX de Kanban colaborativo).

Uso interno em primeira fase, com arquitetura preparada para virar SaaS sem refactor.

---

## 🚀 Rodando localmente

### Pré-requisitos

- **Node.js 22+** (ver `.nvmrc`)
- **pnpm 9+** (`corepack enable` habilita automaticamente)
- **Docker Desktop** com Compose (para Postgres, Redis, MinIO, Mailpit)

### Primeiro setup

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir infra local (Postgres + Redis + MinIO + Mailpit)
pnpm infra:up

# 3. Copiar env templates
cp .env.example .env.local
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local

# 4. Gerar Prisma client + aplicar migrations + seed
pnpm --filter @ktask/api prisma:generate
pnpm db:migrate
pnpm db:seed

# 5. Rodar tudo em paralelo (web + api)
pnpm dev
```

URLs locais:

| Serviço         | URL                                                      |
| --------------- | -------------------------------------------------------- |
| Web (Next.js)   | http://localhost:3000                                    |
| API (NestJS)    | http://localhost:4000                                    |
| API Swagger     | http://localhost:4000/docs                               |
| Healthcheck     | http://localhost:4000/healthz                            |
| Readycheck (DB) | http://localhost:4000/readyz                             |
| Postgres        | localhost:**5433** (não 5432, pra não colidir com XAMPP) |
| Mailpit UI      | http://localhost:8025                                    |
| MinIO Console   | http://localhost:9001 (minio / miniominio)               |
| Prisma Studio   | `pnpm db:studio` (abre em 5555)                          |

### Credenciais seed

- **E-mail**: `admin@kharis.local`
- **Senha**: `ktask123` (trocar no primeiro login)

## 📦 Estrutura do monorepo

```
ktask/
├── apps/
│   ├── api/              # NestJS 11 — REST + WS + Workers
│   │   ├── src/
│   │   ├── prisma/       # schema, migrations, seed
│   │   └── Dockerfile
│   └── web/              # Next.js 15 App Router
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── lib/
│       │   └── styles/
│       └── next.config.ts
├── packages/
│   ├── config-eslint/    # Config ESLint compartilhado
│   ├── config-tsconfig/  # tsconfigs base (Nest, Next, lib)
│   ├── contracts/        # Zod schemas e tipos DTO compartilhados
│   └── ui/               # Componentes compartilhados (shadcn base)
├── infra/
│   ├── docker-compose.yml
│   └── README.md
├── tarefas-md/           # Planejamento e referência
│   ├── 00-visao-geral.md
│   ├── 01-requisitos-funcionais.md
│   ├── 02-requisitos-nao-funcionais.md
│   ├── 03-entidades-e-dominio.md
│   ├── 04-fluxos-principais.md
│   ├── 05-stack-e-arquitetura.md
│   ├── 06-roadmap-mvp.md
│   ├── 07-design-system.md
│   ├── 08-infra-e-deploy.md
│   ├── 09-engine-automacoes.md
│   └── checklist.md
└── .github/workflows/ci.yml
```

## 🛠️ Scripts úteis

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
pnpm test                 # Jest/Vitest
pnpm format               # Prettier --write
pnpm format:check         # Prettier --check

# Build
pnpm build                # turbo build em tudo
```

## 🧭 Recursos principais

- **Quadros Kanban colaborativos** com drag & drop em tempo real (Socket.IO)
- **Engine de automações** com triggers, condições e ações (mover card, atribuir membro, enviar e-mail, disparar WhatsApp, criar card em outro quadro, agendar, delay, webhook…)
- **Integração WhatsApp nativa** via Evolution API — disparos dentro de automações e cards criados a partir de mensagens recebidas
- **Formulários públicos** que geram cards no quadro e acionam automações
- **SLA por lista**, **time tracking**, **campos personalizados**, **checklists**, **labels**, **comentários com menções**
- **Real-time**: presença de usuários, atualizações instantâneas, reconexão com re-sync
- **Multi-tenant** desde o início (`organizationId` em tudo, guards com bypass para OWNER/ADMIN/GESTOR)
- **Papéis granulares**: Dono, Administrador, Gestor, Membro, Convidado (Org) + Admin/Editor/Comentarista/Observador (Quadro)
- **Activity log** completo, busca global (Ctrl+K), notificações in-app + e-mail + WhatsApp

## 🏗️ Stack

- **Monorepo** pnpm + Turborepo
- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind + shadcn/ui + @dnd-kit + Tiptap + TanStack Query
- **Backend**: NestJS 11 + Prisma 6 + PostgreSQL 16
- **Filas**: BullMQ + Redis 7
- **Real-time**: Socket.IO com adapter Redis
- **Storage**: S3-compatible (MinIO em dev)
- **Integração**: Evolution API (WhatsApp)
- **Auth**: JWT access 15min + refresh httpOnly

## 🎨 Identidade

- Cor primária: **#6D28D9** (light) / **#7C3AED** (dark) — violet-700/600
- Accent: **#2EE8B8** (teal da logo Kharis)
- Fonte: **Inter**
- Ícones: **Lucide**

## 🧪 Fases

| Fase     | Foco                                                                       | Status           |
| -------- | -------------------------------------------------------------------------- | ---------------- |
| **0**    | Fundação (monorepo, docker, CI, Prisma inicial)                            | ✅ concluída     |
| **MVP**  | Kanban core + permissões + real-time + notificações                        | pendente         |
| **v1**   | Engine de automações + WhatsApp + campos + SLA + templates + time tracking | pendente         |
| **v1.5** | Formulários + views avançadas + webhooks + WhatsApp bidirecional           | pendente         |
| **v2**   | SaaS (billing, cadastro público, SSO, i18n)                                | parkado sem data |

Roadmap detalhado em [tarefas-md/06-roadmap-mvp.md](tarefas-md/06-roadmap-mvp.md).

## 📚 Documentação

Ver pasta [tarefas-md/](tarefas-md/README.md) para o planejamento completo (visão, requisitos, domínio, fluxos, arquitetura, design system, infra, engine de automações, checklist).

## 📄 Licença

Proprietário — Kharis. Todos os direitos reservados.
