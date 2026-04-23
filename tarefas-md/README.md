# Planejamento — KTask

Sistema de gestão de tarefas da Kharis, inspirado em **Ummense** (funcional) e **Trello** (UX). **Uso interno primeiro**; SaaS sem data — arquitetura pronta pra isso mas sem planejar features comerciais até o sistema estar útil internamente.

## Documentos

1. [00 — Visão geral](00-visao-geral.md) — objetivo, público, diferenciais, princípios, nomenclatura pt-BR
2. [01 — Requisitos funcionais](01-requisitos-funcionais.md) — features por módulo e prioridade (~170 RFs)
3. [02 — Requisitos não-funcionais](02-requisitos-nao-funcionais.md) — performance, segurança, escalabilidade, LGPD, a11y
4. [03 — Entidades e domínio](03-entidades-e-dominio.md) — modelo de dados em Prisma, enums, invariantes
5. [04 — Fluxos principais](04-fluxos-principais.md) — 15 jornadas ponta-a-ponta + matriz de permissões
6. [05 — Stack e arquitetura](05-stack-e-arquitetura.md) — decisões técnicas, monorepo, gateways, real-time
7. [06 — Roadmap](06-roadmap-mvp.md) — fases Fundação → MVP → v1 → v1.5 (+ v2/SaaS parkado)
8. [07 — Design System](07-design-system.md) — tokens, paleta light/dark, tipografia, componentes, microcopy
9. [08 — Infra e Deploy](08-infra-e-deploy.md) — AWS + Vercel, domínios, secrets, CI/CD, custos
10. [09 — Engine de Automações](09-engine-automacoes.md) — contratos, fluxo, segurança, UI builder
11. [Checklist](checklist.md) — rastreador vivo de decisões e entregas

## TL;DR

- **Stack**: Next.js 15 + NestJS + Prisma + Postgres + Redis + BullMQ + Socket.IO + Evolution API + S3-compatible, monorepo pnpm/Turborepo, containerizado com Docker.
- **Cloud**: Vercel (front) + AWS App Runner (api/workers) + RDS + ElastiCache + S3 + SES + SSM + Cloudflare DNS.
- **Multi-tenant** desde o início (`organizationId` em tudo) — se virar SaaS depois, é commit não refactor.
- **Automações** são cidadão de primeira classe: triggers + conditions + actions com execução assíncrona em fila.
- **WhatsApp** via Evolution API, disponível como action de automação e como canal de entrada.
- **Real-time** no MVP via Socket.IO com adapter Redis.
- **Identidade**: roxo Kharis (#6D28D9 primário, #7C3AED no dark) + teal #2EE8B8 accent. Fonte Inter, ícones Lucide.

## Próximos passos

1. ✅ Planejamento completo (arquivos 00–09 + checklist).
2. **Fase 0 — Fundação**: bootstrap do monorepo, Docker Compose (Postgres/Redis/MinIO/Mailpit), Prisma inicial, CI.
3. **Fase MVP**: Kanban core + permissões + real-time + notificações (8 semanas).
4. **v1**: engine de automações + Evolution WhatsApp + campos personalizados + SLA + time tracking (6–7 semanas).
5. **v1.5**: formulários + views avançadas + webhooks (5–6 semanas).
6. **v2/SaaS**: parkado sem data.
