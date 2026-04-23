# KTask

Sistema de gestão de tarefas e fluxos operacionais da Kharis, inspirado em **Ummense** (automações, SLAs, formulários, time tracking) e **Trello** (UX de Kanban colaborativo).

Uso interno em primeira fase, com arquitetura preparada para virar SaaS sem refactor.

## Principais recursos

- **Quadros Kanban colaborativos** com drag & drop em tempo real (Socket.IO)
- **Engine de automações** com triggers, condições e ações (mover card, atribuir membro, enviar e-mail, disparar WhatsApp, criar card em outro quadro, agendar, delay, webhook...)
- **Integração WhatsApp nativa** via Evolution API — disparos dentro de automações e cards criados a partir de mensagens recebidas
- **Formulários públicos** que geram cards no quadro e acionam automações
- **SLA por lista**, **time tracking**, **campos personalizados**, **checklists**, **labels**, **comentários com menções**
- **Real-time**: presença de usuários, atualizações instantâneas, reconexão com re-sync
- **Multi-tenant** desde o início (`organizationId` em tudo, guards com bypass para OWNER/ADMIN/GESTOR)
- **Papéis granulares**: Dono, Administrador, Gestor, Membro, Convidado (nível Org) + Admin/Editor/Comentarista/Observador (nível quadro)
- **Activity log** completo, busca global (Ctrl+K), notificações in-app + e-mail + WhatsApp

## Stack

- **Monorepo** pnpm + Turborepo
- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind + shadcn/ui + @dnd-kit + Tiptap + TanStack Query
- **Backend**: NestJS 11 + Prisma 6 + PostgreSQL 16
- **Filas**: BullMQ + Redis 7
- **Real-time**: Socket.IO com adapter Redis
- **Storage**: S3-compatible (MinIO em dev)
- **Integração**: Evolution API (WhatsApp)
- **Auth**: JWT access 15min + refresh httpOnly
- **Observabilidade**: Pino + OpenTelemetry + Sentry + Prometheus/Grafana

## Roadmap

- **MVP** — Kanban core + real-time + permissões + busca + notificações (8 semanas)
- **v1** — Engine de automações + WhatsApp + campos personalizados + SLA + time tracking + templates (6–7 semanas)
- **v1.5** — Formulários públicos + views (calendário, dashboards) + webhooks + WhatsApp bidirecional
- **v2** — SaaS: billing Stripe, cadastro público, SSO, i18n, importação Trello/Ummense

Planejamento detalhado em [tarefas-md/](tarefas-md/README.md).

## Status

Em fase de **planejamento**. Primeiros commits são documentação de requisitos, arquitetura e roadmap.
