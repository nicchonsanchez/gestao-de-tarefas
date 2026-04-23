# Planejamento — KTask

Sistema de gestão de tarefas da Kharis, inspirado em **Ummense** (funcional) e **Trello** (UX). Uso interno primeiro, SaaS depois.

## Documentos

1. [00 — Visão geral](00-visao-geral.md) — objetivo, público, diferenciais, princípios
2. [01 — Requisitos funcionais](01-requisitos-funcionais.md) — todas as features por módulo e prioridade
3. [02 — Requisitos não-funcionais](02-requisitos-nao-funcionais.md) — performance, segurança, escalabilidade, LGPD, a11y
4. [03 — Entidades e domínio](03-entidades-e-dominio.md) — modelo de dados em Prisma, enums, invariantes
5. [04 — Fluxos principais](04-fluxos-principais.md) — 14 jornadas ponta-a-ponta + matriz de permissões
6. [05 — Stack e arquitetura](05-stack-e-arquitetura.md) — decisões técnicas, monorepo, engine de automação, real-time
7. [06 — Roadmap](06-roadmap-mvp.md) — fases MVP → v1 → v1.5 → v2 (SaaS) com critérios de aceite

## TL;DR

- **Stack**: Next.js 15 + NestJS + Prisma + Postgres + Redis + BullMQ + Socket.IO + Evolution API + S3-compatible, monorepo pnpm/Turborepo.
- **Multi-tenant** desde o início (`organizationId` em tudo) — migrar para SaaS depois vira commit, não refactor.
- **Automações** são cidadão de primeira classe: triggers + conditions + actions com execução assíncrona em fila.
- **WhatsApp** via Evolution API, disponível como action de automação e como canal de entrada (recebe → vira card/comentário).
- **Real-time** em MVP via Socket.IO com adapter Redis.

## Próximos passos sugeridos

1. Validar requisitos + escopo do MVP com stakeholders.
2. Escolher nome final do produto.
3. Fase 0 (fundação): bootstrap do monorepo, infra docker-compose, primeiras migrações Prisma.
4. Abrir issues/tickets para RF do MVP (M) e distribuir.
