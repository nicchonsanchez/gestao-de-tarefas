# Checklist — KTask

Rastreador vivo do progresso. Atualizar a cada entrega relevante.

Legenda: `[ ]` a fazer · `[~]` em andamento · `[x]` concluído · `[-]` descartado/adiado

---

## Decisões travadas

- [x] Nome do produto: **KTask**
- [x] Referências principais: Ummense (funcionalidade) + Trello (UX)
- [x] Uso interno primeiro, SaaS sem data
- [x] Multi-tenancy lógica desde o dia zero (`organizationId` em tudo)
- [x] Stack: monorepo pnpm+Turborepo, Next.js 15, NestJS 11, Prisma 6, Postgres 16, Redis 7, BullMQ, Socket.IO, S3-compatible
- [x] Auth própria (JWT access 15min + refresh httpOnly)
- [x] Integração WhatsApp via Evolution API
- [x] Papéis Org: OWNER / ADMIN / GESTOR / MEMBER / GUEST
- [x] Papéis Board: ADMIN / EDITOR / COMMENTER / VIEWER
- [x] Teto por rank nas promoções
- [x] Editor MVP simples (bold/italic/listas/links/menções); Tiptap completo na v1
- [x] UI em pt-BR (Dono / Administrador / Gestor / Membro / Convidado)
- [x] Cloud: Vercel (web) + AWS App Runner (api/workers) + RDS + ElastiCache + S3 + SES + SSM
- [x] Domínio prod: `ktask.agenciakharis.com.br` | API: `api.ktask.agenciakharis.com.br`
- [x] Docker nos containers (App Runner + dev local com Docker Compose)
- [x] DNS via Cloudflare (free)
- [x] Paleta primária: violet-700 (#6D28D9) no light / violet-600 (#7C3AED) no dark; accent teal #2EE8B8
- [x] Fonte: Inter
- [x] Ícones: Lucide
- [x] Evolution creds: `.env.local` em dev; SSM + `Integration.config` criptografado em prod

## Decisões pendentes

- [ ] 2FA obrigatório pro OWNER?
- [ ] Política exata de senha (sugestão: mín 10 + check pwned)
- [ ] Como é criado o primeiro OWNER? (Seed CLI / página de setup única)
- [ ] Analytics de produto: PostHog? Mixpanel? Nada?
- [ ] Região AWS: `sa-east-1` (São Paulo) confirmada?
- [ ] Vercel plano: Hobby ou Pro ($20/mês)?
- [ ] Sentry: já tem conta Kharis ou cria nova?
- [ ] WhatsApp: Baileys (via Evolution padrão) ou Cloud API oficial no futuro?

## Itens parkados (sem data, revisitar depois)

- [-] Billing / Stripe / planos
- [-] Cadastro público / landing
- [-] SSO SAML
- [-] Importadores Trello/Ummense
- [-] i18n (en, es)
- [-] Política de privacidade / Termos de Uso / DPA
- [-] App mobile nativo (PWA cobre)
- [-] Timeline / Gantt

---

## Documentação

- [x] `README.md` (raiz)
- [x] `.gitignore`
- [x] `tarefas-md/00-visao-geral.md`
- [x] `tarefas-md/01-requisitos-funcionais.md`
- [x] `tarefas-md/02-requisitos-nao-funcionais.md`
- [x] `tarefas-md/03-entidades-e-dominio.md`
- [x] `tarefas-md/04-fluxos-principais.md`
- [x] `tarefas-md/05-stack-e-arquitetura.md`
- [x] `tarefas-md/06-roadmap-mvp.md`
- [x] `tarefas-md/07-design-system.md`
- [x] `tarefas-md/08-infra-e-deploy.md`
- [x] `tarefas-md/09-engine-automacoes.md`
- [x] `tarefas-md/checklist.md`
- [ ] `tarefas-md/10-api-contracts.md` (antes de codar os módulos)
- [ ] `tarefas-md/11-wireframes.md` ou Figma (antes do primeiro fluxo de UI complexo)

---

## Fase 0 — Fundação

Bootstrap do monorepo e infra local.

- [x] Estrutura de pastas do monorepo (`apps/web`, `apps/api`, `packages/*`)
- [x] `package.json` raiz + `pnpm-workspace.yaml` + `turbo.json`
- [x] Configs compartilhadas (`packages/config-eslint`, `packages/config-tsconfig`)
- [x] `apps/api` — NestJS 11 com health check, logger Pino, config module, Prisma
- [x] `apps/web` — Next.js 15 App Router com Tailwind + tokens de design (07) + tema light/dark + toggle
- [x] `packages/contracts` — Zod schemas compartilhados (auth, users, organizations, roles com teto de rank)
- [x] `packages/ui` — base shadcn + wrappers KTask (Button, Card, Input, Dialog, Label, Badge)
- [x] `infra/docker-compose.yml` (Postgres 16 na porta **5433**, Redis 7, MinIO, Mailpit)
- [x] Prisma inicial com models `User`, `Organization`, `Membership`, `Invitation`, `Session`
- [x] Primeira migration + seed (Org "Kharis" + OWNER admin@kharis.local)
- [x] GitHub Actions CI: lint, typecheck, test, build
- [x] Husky + lint-staged
- [x] `.env.example` completo (raiz + apps/api + apps/web)
- [x] Dockerfile multi-stage pra App Runner
- [x] README dev com instruções completas
- [x] Validação live: `/healthz` e `/readyz` retornando 200 com DB check verde

## Fase 1 — MVP

Ver detalhes em `06-roadmap-mvp.md`.

### Auth

- [ ] Login e-mail/senha com argon2id
- [ ] Refresh token httpOnly + rotação
- [ ] Logout + logout all sessions
- [ ] Recuperação de senha por e-mail
- [ ] Bloqueio após 10 tentativas (IP + conta)
- [ ] Guards: JwtGuard, OrgGuard, BoardRoleGuard (com bypass OWNER/ADMIN/GESTOR)

### Organização

- [ ] CRUD Organization (1 por instalação no MVP interno)
- [ ] Convite por e-mail (Invitation com token, 7d)
- [ ] Aceitar convite e criar conta
- [ ] Gerenciar membros (listar/remover/alterar papel com teto por rank)
- [ ] Config Org (nome, logo, timezone, idioma)

### Quadros / Listas / Cards

- [ ] Criar/listar/arquivar quadro; membros com papéis
- [ ] Listas com reordenação drag & drop
- [ ] Cards: criar rápido, editar, mover, duplicar, arquivar
- [ ] Prioridade, due date, descrição (editor simples), capa
- [ ] Labels (CRUD + aplicar)
- [ ] Checklists
- [ ] Anexos com URL pré-assinada S3/MinIO

### Interação

- [ ] Comentários com menções `@`
- [ ] Notificações in-app (sininho com contador + lista)
- [ ] Busca global (`Ctrl+K`)
- [ ] Activity log por card e quadro

### Real-time

- [ ] Gateway Socket.IO com JWT no handshake
- [ ] Canais `board:{id}`, `user:{id}`
- [ ] Presença no quadro (avatares online)
- [ ] Eventos: card.created/moved/updated, list._, comment._, notification.\*
- [ ] Reconexão com re-sync (`GET /boards/{id}?since={ts}`)

### Qualidade

- [ ] Cobertura de testes ≥ 60% backend
- [ ] Testes e2e (Playwright): F-01, F-03, F-04, F-08b
- [ ] Design tokens aplicados, light/dark funcional
- [ ] A11y passando em Axe em páginas principais
- [ ] Deploy staging automatizado

## Fase 2 — v1 (Automações + WhatsApp)

Ver `09-engine-automacoes.md` para detalhamento.

- [ ] Schema `Automation`, `AutomationRun`
- [ ] Engine core: dispatcher, worker, registry de handlers
- [ ] Template renderer (Mustache) + resolver de paths
- [ ] Anti-loop (chainDepth) + rate limit por Org
- [ ] 10 actions iniciais (seção 12 do doc 09)
- [ ] 8 triggers iniciais
- [ ] UI wizard 3 passos para criar automação
- [ ] Biblioteca de receitas (10 templates)
- [ ] Log de execuções com retentar
- [ ] Integração Evolution API (CRUD Integration, teste de conexão)
- [ ] MessageTemplate + WhatsAppMessage
- [ ] Campos personalizados (tipos core: text, number, date, select, multiselect, email, phone, user)
- [ ] Time tracking (timer + manual)
- [ ] SLA por lista + alertas
- [ ] Templates de quadro/card/checklist
- [ ] View Lista (tabela)
- [ ] Subtarefas (1 nível)
- [ ] API Tokens + endpoints REST documentados (OpenAPI)

## Fase 3 — v1.5 (Formulários + Views + Reports)

- [ ] Formulários públicos (slug, campos, submissão → card)
- [ ] Webhook de entrada (Evolution recebe mensagem → comentário/card)
- [ ] Webhooks de saída (configuráveis)
- [ ] View Calendário
- [ ] Dashboard por quadro (throughput, cycle time, SLA cumprido)
- [ ] Relatórios de time tracking
- [ ] Dry-run de automação
- [ ] Trigger `SCHEDULED` (cron)
- [ ] Importação CSV

---

## Operacional

- [ ] Provisionar AWS (ver seção 10 do doc 08)
- [ ] Vercel projeto criado + domínio custom
- [ ] Cloudflare DNS
- [ ] Sentry projetos (web + api + worker)
- [ ] GitHub Actions secrets
- [ ] Primeiro deploy manual em staging
- [ ] Primeiro deploy em produção
- [ ] Teste de restore de backup (após 30d)
- [ ] Runbook de incidente (quando atingir uso interno amplo)
