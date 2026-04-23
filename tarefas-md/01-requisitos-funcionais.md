# Requisitos Funcionais

Convenção de IDs: `RF-<MÓDULO>-<NNN>`. Prioridade: **M** (MVP), **1** (v1), **1.5** (v1.5), **2** (v2 / SaaS).

---

## RF-AUTH — Autenticação e Conta

| ID | Descrição | Prio |
|---|---|---|
| RF-AUTH-001 | Login com e-mail + senha (hash argon2id) | M |
| RF-AUTH-002 | Sessão via refresh token httpOnly + access token JWT curto (15 min) | M |
| RF-AUTH-003 | Logout individual e "logout em todas as sessões" | M |
| RF-AUTH-004 | Recuperação de senha por e-mail (token único, expira em 1h) | M |
| RF-AUTH-005 | Troca de senha autenticada (exige senha atual) | M |
| RF-AUTH-006 | Bloqueio após 10 tentativas falhas em 10 minutos (por IP + por conta) | M |
| RF-AUTH-007 | 2FA por TOTP (Google Authenticator, 1Password, etc) | 1 |
| RF-AUTH-008 | Login social (Google Workspace) | 2 |
| RF-AUTH-009 | SSO SAML (plano enterprise SaaS) | 2 |
| RF-AUTH-010 | Verificação de e-mail no cadastro (SaaS) | 2 |

## RF-ORG — Organização (Tenant) e Membros

| ID | Descrição | Prio |
|---|---|---|
| RF-ORG-001 | Toda conta pertence a pelo menos uma Organização | M |
| RF-ORG-002 | Papéis globais na Organização: `OWNER`, `ADMIN`, `GESTOR`, `MEMBER`, `GUEST` | M |
| RF-ORG-002a | Papel `OWNER`: acesso total à Org e a todos os quadros (inclusive privados onde não foi adicionado) como BoardAdmin implícito. Único que deleta a Org. | M |
| RF-ORG-002b | Papel `ADMIN`: administra a Organização (convidar/remover membros, integrações, billing no SaaS) **e** tem acesso total aos quadros — BoardAdmin implícito em todos (inclusive privados onde não é BoardMember). Não pode deletar a Org nem transferir `OWNER`. | M |
| RF-ORG-002c | Papel `GESTOR`: **cross-board** — vê e edita como BoardAdmin **todos** os quadros da Org (inclusive privados). **Não** administra a Org (não convida membros, não mexe em integrações nem billing). Equivalente a um `ADMIN` sem o lado IT/administrativo. | M |
| RF-ORG-002d | Papel `MEMBER`: usuário operacional padrão. Vê quadros com `visibility=ORGANIZATION` e aqueles em que é BoardMember. Pode criar novos quadros. | M |
| RF-ORG-002e | Papel `GUEST`: convidado externo. Só vê quadros específicos em que é BoardMember. Não aparece no diretório da Org. | M |
| RF-ORG-003 | Convidar membro por e-mail (cria Invitation pendente com token) | M |
| RF-ORG-004 | Aceitar/recusar convite; convite expira em 7 dias | M |
| RF-ORG-005 | Remover membro da Organização (não deleta dados criados por ele) | M |
| RF-ORG-006 | Alterar papel de membro segue **teto por rank**: cada papel só define papéis iguais ou inferiores ao seu. `OWNER` → qualquer papel; `ADMIN` → até `ADMIN` (inclusive); `GESTOR` → até `GESTOR`. Regras extras: nunca rebaixar o último `OWNER`; `ADMIN` não rebaixa outro `ADMIN` (só `OWNER` faz isso); `GESTOR` nunca toca em `ADMIN`/`OWNER`. | M |
| RF-ORG-006a | Convidar **novo** membro para a Org exige `OWNER` ou `ADMIN`. `GESTOR` pode promover existentes até `GESTOR`, mas não traz gente nova de fora. | M |
| RF-ORG-007 | Transferir `OWNER` para outro membro | 1 |
| RF-ORG-008 | Configurações da Org: nome, logo, fuso horário, idioma | M |
| RF-ORG-009 | Suporte a múltiplas Orgs por usuário (seletor no topo) | 1 |
| RF-ORG-010 | Domínios confiáveis: auto-ingressa usuários do domínio X | 2 |

## RF-BOARD — Quadros

| ID | Descrição | Prio |
|---|---|---|
| RF-BOARD-001 | Criar quadro com nome, descrição, cor/ícone | M |
| RF-BOARD-002 | Quadros privados (só membros adicionados) e quadros da Org (todos veem) | M |
| RF-BOARD-003 | Arquivar/desarquivar quadro | M |
| RF-BOARD-004 | Duplicar quadro (com ou sem cards) | 1 |
| RF-BOARD-005 | Templates de quadro (biblioteca + criar a partir de quadro existente) | 1 |
| RF-BOARD-006 | Membros do quadro com papéis: `ADMIN`, `EDITOR`, `COMMENTER`, `VIEWER` | M |
| RF-BOARD-007 | Favoritar quadro (estrela) | M |
| RF-BOARD-008 | Buscar quadros na Org | M |
| RF-BOARD-009 | Exportar quadro para JSON/CSV | 1.5 |

## RF-LIST — Listas (Colunas)

| ID | Descrição | Prio |
|---|---|---|
| RF-LIST-001 | Criar lista dentro do quadro com nome | M |
| RF-LIST-002 | Reordenar listas por drag & drop | M |
| RF-LIST-003 | Renomear / arquivar lista | M |
| RF-LIST-004 | WIP limit: limite de cards por lista com alerta visual | 1 |
| RF-LIST-005 | Configurar SLA da lista: tempo máximo que um card pode ficar antes de disparar aviso | 1 |
| RF-LIST-006 | Cor/ícone da lista | 1 |

## RF-CARD — Cards (Tarefas)

| ID | Descrição | Prio |
|---|---|---|
| RF-CARD-001 | Criar card rápido (só título) a partir do fim de uma lista | M |
| RF-CARD-002 | Editar título, descrição com editor simples (bold, itálico, listas, links, menções) e capa | M |
| RF-CARD-002b | Upgrade da descrição para editor rich-text completo (Tiptap: headings, tabelas, code blocks, embeds, imagens inline) | 1 |
| RF-CARD-003 | Mover card entre listas por drag & drop, reordenar dentro da lista | M |
| RF-CARD-004 | Arquivar/desarquivar/excluir card | M |
| RF-CARD-005 | Atribuir membros (responsáveis) — múltiplos | M |
| RF-CARD-006 | Labels (etiquetas): nome + cor, gerenciáveis no quadro | M |
| RF-CARD-007 | Data de início e prazo (due date) com hora opcional | M |
| RF-CARD-008 | Checklist (múltiplas, com itens marcáveis e % concluído) | M |
| RF-CARD-009 | Anexos (upload de arquivos + link externo) | M |
| RF-CARD-010 | Campos personalizados (ver RF-CF) | 1 |
| RF-CARD-011 | Prioridade (baixa/média/alta/urgente) | M |
| RF-CARD-012 | Estimativa e tempo gasto (ver RF-TIME) | 1 |
| RF-CARD-013 | Duplicar card (mesmo quadro ou outro) | M |
| RF-CARD-014 | Cards filhos / subtarefas (1 nível de aninhamento) | 1 |
| RF-CARD-015 | Dependências entre cards (bloqueia / é bloqueado por) | 1.5 |
| RF-CARD-016 | Card linking (referenciar outros cards por `#id`) | 1 |
| RF-CARD-017 | Atalhos de teclado (estilo Linear: `C` cria, `/` busca, `E` edita) | 1 |

## RF-COMMENT — Comentários e Menções

| ID | Descrição | Prio |
|---|---|---|
| RF-COMMENT-001 | Comentar em card (editor simples: bold, itálico, listas, links, menções) | M |
| RF-COMMENT-001b | Comentários com editor rich-text completo (mesmo upgrade da descrição) | 1 |
| RF-COMMENT-002 | Editar/deletar próprio comentário (histórico preservado) | M |
| RF-COMMENT-003 | Menção `@usuario` dispara notificação | M |
| RF-COMMENT-004 | Reações emoji em comentários | 1.5 |
| RF-COMMENT-005 | Anexar arquivo em comentário | 1 |

## RF-ATTACH — Anexos

| ID | Descrição | Prio |
|---|---|---|
| RF-ATTACH-001 | Upload de arquivo (até 25 MB por padrão, configurável) | M |
| RF-ATTACH-002 | Armazenamento em S3-compatible (MinIO dev, S3/R2/Spaces prod) | M |
| RF-ATTACH-003 | Preview inline de imagens e PDFs | 1 |
| RF-ATTACH-004 | Definir uma imagem como capa do card | M |
| RF-ATTACH-005 | Antivírus scan (ClamAV) em upload | 2 |
| RF-ATTACH-006 | Integração com Google Drive (anexar link "vivo") | 2 |

## RF-CF — Campos Personalizados

| ID | Descrição | Prio |
|---|---|---|
| RF-CF-001 | Tipos: texto curto, texto longo, número, moeda, data, select, multiselect, checkbox, url, email, telefone, usuário | 1 |
| RF-CF-002 | Campos definidos no quadro, valores armazenados no card | 1 |
| RF-CF-003 | Campos podem ser obrigatórios ou opcionais | 1 |
| RF-CF-004 | Campos usáveis como trigger/condition/action em automações | 1 |
| RF-CF-005 | Campos usáveis em filtros e views | 1 |
| RF-CF-006 | Campos tipo "fórmula" (calculado a partir de outros) | 2 |
| RF-CF-007 | Campos tipo "relacionamento" (vínculo com card de outro quadro) | 2 |

## RF-AUTO — Automações (Engine)

Modelo mental: **Gatilho → Condições (opcionais) → Ações**. Execução assíncrona via fila (BullMQ).

### Gatilhos (Triggers)
| ID | Descrição | Prio |
|---|---|---|
| RF-AUTO-T-001 | Card criado na lista X | 1 |
| RF-AUTO-T-002 | Card movido para lista X | 1 |
| RF-AUTO-T-003 | Data de prazo atingida (N dias antes / no dia / N dias depois) | 1 |
| RF-AUTO-T-004 | Campo X alterado para valor Y | 1 |
| RF-AUTO-T-005 | Checklist concluído / item marcado | 1 |
| RF-AUTO-T-006 | Comentário adicionado | 1 |
| RF-AUTO-T-007 | Membro adicionado/removido | 1 |
| RF-AUTO-T-008 | SLA da lista estourado | 1 |
| RF-AUTO-T-009 | Agendado (cron — toda segunda 08h, etc) | 1.5 |
| RF-AUTO-T-010 | Webhook recebido | 1.5 |
| RF-AUTO-T-011 | Formulário submetido | 1.5 |

### Condições
| ID | Descrição | Prio |
|---|---|---|
| RF-AUTO-C-001 | Card tem label X / prioridade Y / campo Z = valor | 1 |
| RF-AUTO-C-002 | Membro responsável é X | 1 |
| RF-AUTO-C-003 | Operadores lógicos AND/OR entre condições | 1 |
| RF-AUTO-C-004 | Data (prazo > hoje + N dias) | 1 |

### Ações
| ID | Descrição | Prio |
|---|---|---|
| RF-AUTO-A-001 | Mover card para lista X | 1 |
| RF-AUTO-A-002 | Atribuir / remover membro | 1 |
| RF-AUTO-A-003 | Adicionar / remover label | 1 |
| RF-AUTO-A-004 | Alterar campo personalizado | 1 |
| RF-AUTO-A-005 | Criar checklist a partir de template | 1 |
| RF-AUTO-A-006 | Definir prazo relativo (hoje + N dias úteis) | 1 |
| RF-AUTO-A-007 | Postar comentário (com template/variáveis do card) | 1 |
| RF-AUTO-A-008 | Enviar notificação in-app | 1 |
| RF-AUTO-A-009 | Enviar e-mail (template + variáveis) | 1 |
| RF-AUTO-A-010 | **Enviar WhatsApp via Evolution API** (template + variáveis) | 1 |
| RF-AUTO-A-011 | Criar card (em outro quadro, inclusive) | 1 |
| RF-AUTO-A-012 | Chamar webhook externo (HTTP POST) | 1.5 |
| RF-AUTO-A-013 | Aguardar N minutos/horas/dias antes da próxima ação (delay) | 1.5 |
| RF-AUTO-A-014 | Ramificar (if/else) entre ações | 2 |

### Gerenciamento
| ID | Descrição | Prio |
|---|---|---|
| RF-AUTO-M-001 | Criar/editar/desativar automação via UI no quadro | 1 |
| RF-AUTO-M-002 | Variáveis `{{card.title}}`, `{{card.assignee.name}}`, `{{card.field.xxx}}` em templates | 1 |
| RF-AUTO-M-003 | Log de execuções (AutomationRun) com status, erros, duração | 1 |
| RF-AUTO-M-004 | Simulador / dry-run de automação | 1.5 |
| RF-AUTO-M-005 | Biblioteca de receitas prontas (ex: "Quando mover para Feito, enviar WhatsApp ao cliente") | 1 |

## RF-NOTIFY — Notificações

| ID | Descrição | Prio |
|---|---|---|
| RF-NOTIFY-001 | Notificações in-app em tempo real (sininho com badge) | M |
| RF-NOTIFY-002 | Eventos que notificam: mention, atribuição, prazo próximo, comentário em card que sigo, mudança de status | M |
| RF-NOTIFY-003 | Centro de notificações com filtro lida/não lida | M |
| RF-NOTIFY-004 | Digest de e-mail diário configurável | 1 |
| RF-NOTIFY-005 | Preferências de notificação por canal (in-app, e-mail, WhatsApp) | 1 |
| RF-NOTIFY-006 | "Seguir" card explicitamente para receber updates | 1 |
| RF-NOTIFY-007 | Push Web (PWA) | 2 |

## RF-WHATS — Integração WhatsApp (Evolution API)

| ID | Descrição | Prio |
|---|---|---|
| RF-WHATS-001 | Conectar instância Evolution via URL + API key na Org | 1 |
| RF-WHATS-002 | Enviar mensagem texto em automações | 1 |
| RF-WHATS-003 | Enviar mídia (imagem, doc) em automações | 1.5 |
| RF-WHATS-004 | Receber mensagem (webhook Evolution) → criar card/comentário | 1.5 |
| RF-WHATS-005 | Vincular número do WhatsApp a um campo do card (ex: "telefone cliente") | 1 |
| RF-WHATS-006 | Biblioteca de templates de mensagem reutilizáveis | 1 |
| RF-WHATS-007 | Log de mensagens enviadas por card | 1 |

## RF-SEARCH — Busca e Filtros

| ID | Descrição | Prio |
|---|---|---|
| RF-SEARCH-001 | Busca global (`Ctrl+K`) em cards, quadros, comentários | M |
| RF-SEARCH-002 | Filtros no quadro: label, membro, prazo, texto, campo customizado | M |
| RF-SEARCH-003 | Salvar filtros como views nomeadas no quadro | 1 |
| RF-SEARCH-004 | Busca full-text em descrição e comentários (Postgres `tsvector`) | 1 |

## RF-VIEW — Views (Visualizações)

| ID | Descrição | Prio |
|---|---|---|
| RF-VIEW-001 | View Kanban (default) | M |
| RF-VIEW-002 | View Lista (tabela) | 1 |
| RF-VIEW-003 | View Calendário (cards por due date) | 1.5 |
| RF-VIEW-004 | View Timeline / Gantt (início → prazo) | 2 |
| RF-VIEW-005 | View Dashboard por quadro (gráficos) | 1.5 |
| RF-VIEW-006 | Agrupamento (por label, membro, campo) nas views | 1 |

## RF-FORM — Formulários

| ID | Descrição | Prio |
|---|---|---|
| RF-FORM-001 | Criar formulário público vinculado a um quadro | 1.5 |
| RF-FORM-002 | Submissão do formulário gera um card na lista configurada | 1.5 |
| RF-FORM-003 | Mapear campos do formulário → campos do card | 1.5 |
| RF-FORM-004 | Personalização visual (logo, cores) | 1.5 |
| RF-FORM-005 | Captcha anti-spam | 1.5 |
| RF-FORM-006 | Página pública com URL única (`/f/{slug}`) | 1.5 |
| RF-FORM-007 | Formulário pode disparar automação (trigger específico) | 1.5 |

## RF-TIME — Time Tracking

| ID | Descrição | Prio |
|---|---|---|
| RF-TIME-001 | Iniciar/parar timer num card (um ativo por usuário por vez) | 1 |
| RF-TIME-002 | Adicionar tempo manual (ex: "30min ontem") | 1 |
| RF-TIME-003 | Estimativa de tempo no card; comparativo com realizado | 1 |
| RF-TIME-004 | Relatório de tempo por membro/quadro/período | 1.5 |

## RF-SLA — SLA

| ID | Descrição | Prio |
|---|---|---|
| RF-SLA-001 | Definir SLA por lista (tempo máximo que card pode ficar) | 1 |
| RF-SLA-002 | Pausar SLA quando card tem label "aguardando cliente" | 1 |
| RF-SLA-003 | Alertas visuais no card (amarelo 80%, vermelho 100%+) | 1 |
| RF-SLA-004 | Automação: "quando SLA estourar, notificar gestor" | 1 |
| RF-SLA-005 | Relatório de SLA cumprido/estourado por quadro | 1.5 |

## RF-REPORT — Dashboards e Relatórios

| ID | Descrição | Prio |
|---|---|---|
| RF-REPORT-001 | Dashboard por quadro: cards por lista, por membro, throughput semanal | 1.5 |
| RF-REPORT-002 | Tempo médio em cada lista (cycle time) | 1.5 |
| RF-REPORT-003 | Burndown / burnup de quadro com prazo | 2 |
| RF-REPORT-004 | Exportar dados (CSV) | 1 |

## RF-TMPL — Templates

| ID | Descrição | Prio |
|---|---|---|
| RF-TMPL-001 | Templates de quadro (galeria + customizados da Org) | 1 |
| RF-TMPL-002 | Templates de card dentro do quadro | 1 |
| RF-TMPL-003 | Templates de checklist | 1 |
| RF-TMPL-004 | Templates de automação (receitas) | 1 |

## RF-RT — Real-Time

| ID | Descrição | Prio |
|---|---|---|
| RF-RT-001 | Mudanças em cards/listas replicadas a todos os clientes conectados ao quadro | M |
| RF-RT-002 | Indicador de presença (avatares dos usuários online no quadro) | M |
| RF-RT-003 | Indicador de "digitando..." em comentários | 1 |
| RF-RT-004 | Cursor compartilhado em edição de descrição (CRDT tipo Tiptap Collaboration) | 2 |
| RF-RT-005 | Reconexão automática com re-sync do estado | M |

## RF-AUDIT — Log de Atividades

| ID | Descrição | Prio |
|---|---|---|
| RF-AUDIT-001 | Toda ação relevante grava registro em `Activity` (who, what, when, entity) | M |
| RF-AUDIT-002 | Timeline de atividade no card | M |
| RF-AUDIT-003 | Timeline de atividade no quadro | 1 |
| RF-AUDIT-004 | Log administrativo da Org (quem convidou quem, mudanças de papel) | 1 |

## RF-API — API Externa e Webhooks

| ID | Descrição | Prio |
|---|---|---|
| RF-API-001 | Tokens de API pessoais (criar, revogar) | 1 |
| RF-API-002 | Endpoints REST para listar/criar/mover cards | 1 |
| RF-API-003 | Webhooks de saída (evento → POST URL configurada) | 1.5 |
| RF-API-004 | Swagger/OpenAPI docs | 1 |

## RF-IMP — Importação e Migração

| ID | Descrição | Prio |
|---|---|---|
| RF-IMP-001 | Importar quadro do Trello (JSON export) | 2 |
| RF-IMP-002 | Importar do Ummense (CSV / API quando disponível) | 2 |
| RF-IMP-003 | Importar CSV genérico para popular cards | 1.5 |

## RF-SAAS — Funcionalidades específicas de SaaS (v2+)

| ID | Descrição | Prio |
|---|---|---|
| RF-SAAS-001 | Cadastro público com verificação de e-mail | 2 |
| RF-SAAS-002 | Planos e billing (Stripe) | 2 |
| RF-SAAS-003 | Limites por plano (nº orgs, cards, automações/mês) | 2 |
| RF-SAAS-004 | Onboarding guiado + templates | 2 |
| RF-SAAS-005 | Landing page pública | 2 |
| RF-SAAS-006 | Central de ajuda / chatbot | 2 |
| RF-SAAS-007 | Multi-idioma UI (pt-BR, en, es) | 2 |

---

## Resumo por prioridade

- **MVP (M)**: auth, org, board, list, card core, comments, attachments, labels, members, notifications básicas, real-time, activity, busca global.
- **v1**: automações + Evolution API, campos customizados, checklist, prioridade, time tracking, SLA, templates, view Lista.
- **v1.5**: formulários, dashboards, views Calendário, anexos avançados, webhooks, importação CSV.
- **v2**: SaaS (billing, cadastro público), timeline/Gantt, SSO, i18n, campos fórmula/relacionamento, ramificação em automações.
