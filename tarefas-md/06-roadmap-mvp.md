# Roadmap e Fases

Quatro fases: **MVP → v1 → v1.5 → v2 (SaaS)**. Cada fase tem escopo, critérios de aceite e entregável demo-ável.

Tempo é **estimativa** baseada em 2 devs full-time (1 fullstack sênior + 1 pleno). Ajustável conforme time real.

---

## Fase 0 — Fundação (1 semana)

Antes de qualquer feature, montar o esqueleto.

### Entregas

- Monorepo pnpm + Turborepo inicializado.
- `apps/web` (Next.js 15) e `apps/api` (NestJS 11) bootados com "hello world".
- `docker-compose.yml` (Postgres, Redis, MinIO, Mailpit).
- Prisma configurado + primeira migração com modelos mínimos (User, Organization, Membership).
- CI GitHub Actions: lint, typecheck, build.
- ESLint + Prettier + Husky + lint-staged.
- `packages/contracts` com Zod base.
- Seed: 1 Org + 1 usuário admin (`admin@kharis.local / admin`).

### Aceite

- `pnpm dev` sobe tudo; `curl /healthz` responde 200; `pnpm test` passa em ambos.

---

## Fase 1 — MVP (8 semanas)

**Objetivo**: Kanban colaborativo funcional para a primeira equipe usar de verdade.

### Escopo (requisitos marcados **M**)

- **Auth** completa: login, logout, refresh, recuperação, bloqueio por tentativas.
- **Organização**: criação inicial, convites, papéis OWNER/ADMIN/MEMBER.
- **Quadros**: criar, listar, arquivar, visibilidade, membros com papéis.
- **Listas**: criar, renomear, reordenar, arquivar.
- **Cards**: criar, editar (título + descrição rich text), mover (drag&drop), arquivar, duplicar, prazo, prioridade, membros, labels, anexos (upload via URL pré-assinada), capa.
- **Comentários**: criar, editar, mentions.
- **Busca global** (Ctrl+K) básica em cards e quadros.
- **Notificações in-app** (mention, atribuição, prazo próximo) com sininho em tempo real.
- **Real-time**: mudanças propagadas em `board:{id}`, presença de usuários.
- **Activity log** em card e quadro.
- **Permissões**: guards server-side cobrindo OrgRole e BoardRole.
- **Tema claro/escuro**.

### Aceite

- Equipe de 5 pessoas usa por 2 semanas sem bug bloqueador.
- Quadro com 200 cards: TTI < 3s, drag sem lag.
- 2+ usuários no mesmo quadro veem alterações < 1s.
- Cobertura de testes ≥ 60% no backend; testes e2e Playwright cobrindo F-01, F-03, F-04.
- Deploy em staging automatizado.

### Riscos / atenções

- Drag & drop real-time tem armadilha de movimentos concorrentes (dois usuários arrastando simultaneamente) — validar conflict resolution com `updatedAt`.
- Rich-text (Tiptap) pode virar tempo perdido se tentar estender demais no MVP — limitar a: bold, italic, listas, links, menções, código inline.

---

## Fase 2 — v1: Automações + WhatsApp (6–7 semanas)

**Objetivo**: o pulo do gato vs Trello. Aqui o sistema vira "Ummense-like".

### Escopo (requisitos **1**)

- **Engine de automações** completo (triggers, conditions, actions).
- **Biblioteca inicial de actions**: move-to-list, assign, label, set-field, post-comment, send-email, **send-whatsapp (Evolution API)**, create-card, delay.
- **UI builder** de automação tipo "assistente por passos".
- **Integration Evolution API**: configuração, teste de conexão, templates de mensagem.
- **Campos personalizados** (tipos core + uso em automação).
- **Checklists** completas.
- **Templates**: quadros, cards, checklists, mensagens, automações (receitas).
- **Time tracking** (timer + entrada manual).
- **SLA** por lista + alertas.
- **Prioridade** visual + filtro.
- **View Lista** (tabela).
- **Subtarefas** (1 nível).
- **Card linking** (`#id`).
- **Digest diário** de e-mail (opcional por usuário).
- **API Tokens** + endpoints REST básicos.
- **Documentação OpenAPI** navegável.

### Aceite

- Automação "card movido → atribui comercial + envia WhatsApp" funciona de ponta a ponta em menos de 10s.
- Log de execuções permite diagnosticar falhas.
- SLA estourado gera notificação e é visível no relatório.
- Campos personalizados usáveis como variáveis em templates.
- Testes cobrem todos os action handlers.

### Riscos / atenções

- UI de builder de automação é grande — começar com flow linear (sem branch) e evoluir.
- Evolution API instável ou número banido: tratar como falha recuperável com log visível.
- Cuidado com loops infinitos de automação (A move → B move → A move). Implementar limite de profundidade por cadeia (default: 5).

---

## Fase 3 — v1.5: Escala operacional (5–6 semanas)

**Objetivo**: tirar dependências externas, cobrir casos de atendimento/CRM leve.

### Escopo (requisitos **1.5**)

- **Formulários públicos** (gera card, pode disparar automação).
- **WhatsApp bidirecional**: recebe mensagem, cria card ou comentário.
- **Webhooks** de entrada e saída.
- **Views**: Calendário, Dashboard do quadro (gráficos simples).
- **Relatórios**: throughput, cycle time, SLA cumprido, time tracking.
- **Importação CSV** para popular cards.
- **Dependências entre cards**.
- **Anexos avançados**: preview PDF, thumbnails, versões.
- **Filtros salvos** como views.
- **Agendamento** em automações (cron) + delay sofisticado.
- **Simulador** de automação (dry-run).

### Aceite

- Formulário público recebe submissões e dispara automação.
- Webhook entrada de Evolution cria cards a partir de mensagens recebidas.
- Dashboard útil o suficiente para 1 gestor acompanhar equipe sem ferramenta externa.

---

## Fase 4 — v2: SaaS (parkado, sem data)

⚠️ **Esta fase está parkada** por decisão explícita: foco em deixar o KTask funcional e útil pra Kharis primeiro. Só voltamos a esta seção quando o sistema estiver maduro em uso interno.

**Objetivo (quando retomar)**: abrir para fora. Estes são os itens específicos de SaaS — o produto em si já deve estar maduro.

### Escopo (requisitos **2**)

- **Cadastro público** + verificação de e-mail.
- **Onboarding** guiado com templates recomendados.
- **Planos + billing** (Stripe): FREE, PRO, ENTERPRISE.
- **Limites por plano**: quantidade de quadros/cards/automações/mês/armazenamento.
- **Contabilização de uso** em tempo real (jobs mensais).
- **Landing page** pública + marketing-site.
- **SSO SAML** (Enterprise).
- **Importação de Trello/Ummense**.
- **i18n**: en, es.
- **Timeline / Gantt**.
- **Campos fórmula e relacionamento**.
- **Ramificação (if/else)** em automações.
- **Integração Google Drive** em anexos.
- **Central de ajuda** (docs).
- **Page de status** público.

### Aceite

- Novo cliente consegue criar conta, pagar, onboarding e usar em < 10 min.
- Importação Trello traz ≥ 95% dos dados (cards, listas, checklists, comentários, anexos).
- Cobrança automática testada com Stripe em modo test + live.

---

## Itens transversais (contínuos em todas as fases)

- **Segurança**: pentest interno ao fim da v1, externo antes da v2.
- **Acessibilidade**: revisão WCAG AA por feature nova.
- **Performance**: budget por página; rodar Lighthouse em CI (>= 85 em PWA).
- **Observabilidade**: dashboards atualizados a cada feature nova com impacto operacional.
- **Documentação**: README por módulo, ADRs (Architecture Decision Records) em `docs/adr/`.

## Marcos (milestones) sugeridos

| Marco                        | Quando          | Evidência                      |
| ---------------------------- | --------------- | ------------------------------ |
| M1 — Fundação ok             | Fim da semana 1 | CI verde, dev env rodando      |
| M2 — Quadro usável           | Fim da semana 5 | 1 equipe testando              |
| M3 — MVP entregue            | Fim da semana 9 | 5 equipes usando internamente  |
| M4 — Automações + WhatsApp   | MVP + 7         | Primeira automação em produção |
| M5 — Dashboard e formulários | M4 + 6          | CRM leve funcionando           |
| M6 — SaaS go-live            | M5 + 8          | Primeiro cliente pagante       |

## Checklist de execução (usar como tracker)

- [ ] Fase 0 — Fundação
- [ ] Fase 1 — MVP
- [ ] Fase 2 — v1 (Automações + WhatsApp)
- [ ] Fase 3 — v1.5 (Formulários + Views + Reports)
- [ ] Fase 4 — v2 (SaaS)
