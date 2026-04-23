# Requisitos Não-Funcionais

Convenção: `RNF-<CATEGORIA>-<NNN>`.

---

## RNF-PERF — Performance

| ID | Descrição | Meta |
|---|---|---|
| RNF-PERF-001 | Tempo de resposta da API (p95) em endpoints críticos (carregar quadro, criar/mover card) | < 300ms |
| RNF-PERF-002 | Tempo de resposta da API (p99) | < 800ms |
| RNF-PERF-003 | Drag & drop de card deve ter feedback visual | < 16ms (60fps, optimistic UI) |
| RNF-PERF-004 | Latência de propagação real-time (mudança local → outro cliente) | < 500ms em 90% |
| RNF-PERF-005 | TTI (Time to Interactive) do quadro | < 2.5s em 3G simulado |
| RNF-PERF-006 | Paginação / virtualização em listas com > 200 cards | obrigatória |
| RNF-PERF-007 | Suporte a quadro com até 5.000 cards ativos sem degradação | MVP |
| RNF-PERF-008 | Automação enfileirada deve executar em | < 5s (fila saudável) |

Estratégias:
- Optimistic UI no cliente (TanStack Query `onMutate` + rollback em erro)
- Índices em Postgres nas colunas mais consultadas (`organizationId`, `boardId`, `listId + position`)
- Cache Redis para endpoints de leitura intensa (membros, labels, configs de quadro) com invalidação por evento
- Virtualização (`@tanstack/react-virtual`) em listas longas
- Compressão `gzip`/`br` em respostas

## RNF-SEG — Segurança

| ID | Descrição |
|---|---|
| RNF-SEG-001 | Autenticação via JWT access token (15 min) + refresh token httpOnly, SameSite=Lax, Secure |
| RNF-SEG-002 | Senhas hash com argon2id (memória 64MiB, iterações 3, paralelismo 4) |
| RNF-SEG-003 | Rate limiting: 100 req/min por IP, 20 req/min em endpoints de auth |
| RNF-SEG-004 | CSRF: tokens duplo-submit em endpoints que usam cookie |
| RNF-SEG-005 | CORS restrito à lista de origins configurada por Org |
| RNF-SEG-006 | Helmet headers (CSP, X-Frame-Options, Referrer-Policy) |
| RNF-SEG-007 | Validação de input com Zod (TS) / class-validator (Nest) em toda entrada |
| RNF-SEG-008 | Proteção de tenant isolation: todo query helper impõe `organizationId` do usuário logado; não existe endpoint que aceita `organizationId` do cliente |
| RNF-SEG-009 | Upload: validação de mime-type real (magic bytes), não extensão; URLs de download pré-assinadas e expiráveis |
| RNF-SEG-010 | SQL injection: só via Prisma com parâmetros; nada de raw query concatenado |
| RNF-SEG-011 | XSS: sanitização de rich-text (DOMPurify) no render; never `dangerouslySetInnerHTML` sem sanitizar |
| RNF-SEG-012 | Secrets em `.env` nunca comitados; Vault / AWS SM em produção |
| RNF-SEG-013 | Auditoria OWASP ASVS nível 2 antes do go-live SaaS |
| RNF-SEG-014 | Dependências monitoradas com `pnpm audit` + Dependabot/Renovate |
| RNF-SEG-015 | Logs nunca devem conter senhas, tokens, PII em texto claro |
| RNF-SEG-016 | Ações destrutivas (deletar quadro, remover Owner) exigem confirmação + registro em audit log |
| RNF-SEG-017 | 2FA obrigatório para papel `OWNER` (configurável) |

## RNF-ESC — Escalabilidade

| ID | Descrição |
|---|---|
| RNF-ESC-001 | API stateless (nenhum estado em memória) — escalável horizontalmente |
| RNF-ESC-002 | WebSocket com adapter Redis no Socket.IO (suporta múltiplas instâncias) |
| RNF-ESC-003 | BullMQ com Redis para filas assíncronas (automações, e-mail, WhatsApp) |
| RNF-ESC-004 | Separar workers de API web (containers distintos) |
| RNF-ESC-005 | Postgres: inicialmente single primary; preparar para read replicas na v2 |
| RNF-ESC-006 | Storage de anexos em S3-compatible (horizontalmente infinito) |
| RNF-ESC-007 | Schema multi-tenant single-database com `organizationId` em todas as tabelas; migração para schema-per-tenant só se necessário |

## RNF-DISP — Disponibilidade

| ID | Descrição | Meta |
|---|---|---|
| RNF-DISP-001 | Uptime em uso interno (MVP) | 99.5% |
| RNF-DISP-002 | Uptime SaaS (v2+) | 99.9% |
| RNF-DISP-003 | Health checks `/healthz` (liveness) e `/readyz` (readiness) | sempre |
| RNF-DISP-004 | Graceful shutdown (fecha WS, drena filas, encerra conexões DB) | sempre |
| RNF-DISP-005 | Failover automático de fila em caso de Redis cair (retries com backoff) | v1 |

## RNF-BKP — Backup e Retenção

| ID | Descrição |
|---|---|
| RNF-BKP-001 | Backup diário de Postgres (retenção 30 dias), semanal (6 meses) |
| RNF-BKP-002 | Backup testado com restore em staging a cada 30 dias |
| RNF-BKP-003 | Storage de anexos com versionamento habilitado |
| RNF-BKP-004 | Exclusão lógica (soft-delete) para cards/quadros; purge físico após 90 dias |
| RNF-BKP-005 | Exportação completa dos dados da Org em ZIP (LGPD) |

## RNF-OBS — Observabilidade

| ID | Descrição |
|---|---|
| RNF-OBS-001 | Logs estruturados JSON (Pino) com `requestId`, `userId`, `orgId` |
| RNF-OBS-002 | Tracing distribuído (OpenTelemetry) — Next → API → Workers |
| RNF-OBS-003 | Métricas Prometheus (QPS, latência por endpoint, tamanho de fila, duração de automação) |
| RNF-OBS-004 | Erros agregados no Sentry (frontend + backend) com release tagging |
| RNF-OBS-005 | Dashboard Grafana: saúde do sistema em tempo real |
| RNF-OBS-006 | Alertas: fila com > 1000 jobs pendentes, p99 > 1s, 5xx > 1% |

## RNF-A11Y — Acessibilidade

| ID | Descrição |
|---|---|
| RNF-A11Y-001 | Conformidade WCAG 2.1 AA |
| RNF-A11Y-002 | Navegação completa por teclado (tab order, atalhos, escape) |
| RNF-A11Y-003 | ARIA roles corretos em Kanban (drag & drop com `role="button"` e `aria-grabbed`) |
| RNF-A11Y-004 | Contraste mínimo 4.5:1 no tema padrão |
| RNF-A11Y-005 | Foco visível em todos os controles |
| RNF-A11Y-006 | Modais com `aria-modal`, foco preso |
| RNF-A11Y-007 | Tema escuro disponível (preferência do SO + toggle) |

## RNF-I18N — Internacionalização

| ID | Descrição |
|---|---|
| RNF-I18N-001 | MVP em pt-BR, com toda UI passando por chaves i18n (nada hardcoded) |
| RNF-I18N-002 | Biblioteca: `next-intl` |
| RNF-I18N-003 | Datas/moeda formatadas via `Intl.*` respeitando preferência do usuário/Org |
| RNF-I18N-004 | Timezone por Org com override por usuário |
| RNF-I18N-005 | Idiomas adicionais (en, es) na v2 |

## RNF-LGPD — Conformidade LGPD

| ID | Descrição |
|---|---|
| RNF-LGPD-001 | Política de privacidade acessível em app e home |
| RNF-LGPD-002 | Consentimento explícito no cadastro (quando virar SaaS) |
| RNF-LGPD-003 | Direito de acesso: exportar todos os dados do usuário |
| RNF-LGPD-004 | Direito de exclusão: deletar conta + anonimizar histórico |
| RNF-LGPD-005 | Cookies essenciais vs analytics claramente separados |
| RNF-LGPD-006 | Data Processing Addendum (DPA) disponível no SaaS |

## RNF-DEV — Experiência de Desenvolvimento

| ID | Descrição |
|---|---|
| RNF-DEV-001 | Monorepo pnpm + Turborepo; `pnpm dev` sobe tudo via docker-compose |
| RNF-DEV-002 | Lint: ESLint + Prettier com config compartilhada |
| RNF-DEV-003 | Pre-commit hooks (husky + lint-staged): lint, typecheck, test impactado |
| RNF-DEV-004 | CI (GitHub Actions): lint, typecheck, test unit, test e2e, build |
| RNF-DEV-005 | CD: deploy automatizado para staging em merge na `main`, produção via tag |
| RNF-DEV-006 | Seeds reproduzíveis (`pnpm db:seed`) — dados de demo |
| RNF-DEV-007 | Migrações versionadas (Prisma Migrate) — nunca `db push` em produção |
| RNF-DEV-008 | Storybook para componentes compartilhados |

## RNF-QUAL — Qualidade

| ID | Descrição |
|---|---|
| RNF-QUAL-001 | Cobertura de testes backend ≥ 70% (foco em services/automations) |
| RNF-QUAL-002 | Testes e2e (Playwright) cobrindo jornadas críticas (RF-FLOW) |
| RNF-QUAL-003 | Testes de carga (k6) antes de releases maiores: 1000 usuários simulados |
| RNF-QUAL-004 | Definition of Done: PR com review, testes passando, documentação atualizada |
| RNF-QUAL-005 | TypeScript estrito (`strict: true`, `noUncheckedIndexedAccess`) em todo código |
