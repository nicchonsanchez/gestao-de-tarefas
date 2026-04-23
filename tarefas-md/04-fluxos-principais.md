# Fluxos Principais (Jornadas do Usuário)

Descrições ponta-a-ponta das interações críticas. Foco em: gatilho, passos do usuário, interações de sistema (API, WS, fila), critérios de sucesso e casos de erro.

---

## F-01 — Primeiro acesso (uso interno, Org já existente)

**Ator**: novo colaborador.

1. Admin cria Invitation via UI (e-mail + papel) → backend cria `Invitation` + envia e-mail com link `/convite/{token}`.
2. Colaborador clica no link:
   - Token válido → página de criação de conta (nome, senha) já com email travado.
   - Token inválido/expirado → página de erro com CTA "solicitar novo convite".
3. Submete → backend cria `User` + `Membership` (role do convite) + marca Invitation como aceita + loga → emite access + refresh tokens → redireciona para `/`.
4. Home mostra lista de quadros que o usuário tem acesso (ORGANIZATION visíveis + PRIVATE onde é BoardMember).

**Sucesso**: usuário logado, vê quadros, pode clicar e abrir.
**Erros comuns**: e-mail já existe (mostra login), senha fraca (validação Zod), token usado por outra pessoa (não acontece — invitation é 1:1 e-mail).

---

## F-02 — Criar quadro a partir do zero

1. Usuário clica "Novo quadro" → modal com nome, descrição opcional, visibilidade (Privado/Organização), cor/ícone.
2. Submete → `POST /boards` → backend cria `Board` + 3 `List`s default ("A fazer", "Em progresso", "Concluído") + `BoardMember` criador como ADMIN.
3. Socket.IO emite `organization:{orgId}` → `board.created` para atualizar sidebar dos membros.
4. Redireciona para `/b/{boardId}`.

**Variante**: "Criar a partir de template" → seletor de templates → backend copia estrutura (listas, campos, automações) aplicando ids novos.

---

## F-03 — Criar, mover e editar card (fluxo mais crítico)

### Criar card rápido
1. Usuário clica "+ Adicionar card" no fim da lista → input aparece.
2. Digita título, Enter → requisição `POST /cards` com `listId`, `title`. Cliente aplica **optimistic update** (card aparece imediatamente com id temporário).
3. Backend cria Card com `position = max(position das cards) + 1024` → responde com id real.
4. Cliente reconcilia id temporário com real.
5. Backend emite `board:{boardId}` → `card.created` para outros usuários conectados.

### Mover card (drag & drop)
1. Usuário arrasta card da Lista A (pos 2048) para Lista B entre os cards nas posições 1000 e 2000.
2. Cliente calcula `position = (1000 + 2000) / 2 = 1500` e aplica UI otimista.
3. `PATCH /cards/{id}` com `{ listId, position }`.
4. Backend valida permissão (EDITOR+), atualiza Card, grava `Activity(CARD_MOVED, payload={from,to,byUser})`.
5. Enqueue automations: fila inspeciona triggers tipo `CARD_MOVED_TO_LIST` que casam.
6. WS emite `board:{boardId}` → `card.moved` com versão nova do card.
7. Outros clientes aplicam; se havia drag concorrente, reconcilia via `updatedAt`/`version`.

**Erro**: permissão negada → rollback visual; usuário vê toast "sem permissão".
**Edge**: reordenação extrema → job `rebalance-positions` roda quando `|pos_i - pos_{i+1}| < 1e-6`.

### Editar descrição
1. Abre detalhe do card → editor Tiptap carrega `description` (JSON).
2. Debounce 800ms no salvamento → `PATCH /cards/{id}` com descrição.
3. WS propaga; outros veem descrição atualizada (sem CRDT no MVP — se dois editam, o último vence, com aviso visual).

---

## F-04 — Comentar com menção

1. Usuário digita `@` → autocomplete puxa `GET /boards/{id}/members` (cached).
2. Seleciona membro, escreve comentário, salva → `POST /cards/{id}/comments`.
3. Backend:
   - Cria `Comment` com `mentions: [userId1, userId2]`.
   - Cria `Activity(COMMENT_ADDED)`.
   - Para cada mentioned user: cria `Notification(MENTION)` e, via preferências, enfileira e-mail/WhatsApp.
4. WS:
   - Canal do card → `comment.added` (atualiza thread em tempo real).
   - Canal pessoal `user:{id}` → `notification.created` (atualiza sininho).

---

## F-05 — Criar automação "quando entrar em 'Cliente Novo' → atribuir comercial + enviar WhatsApp"

1. Dentro do quadro → menu "Automações" → "Nova automação".
2. Etapa 1 — Gatilho: seleciona `Card movido para lista` → escolhe lista "Cliente Novo".
3. Etapa 2 — Condições (opcional): pula.
4. Etapa 3 — Ações (ordenadas):
   - `Atribuir membro` → escolhe usuário do comercial.
   - `Enviar WhatsApp` → escolhe Integration Evolution + MessageTemplate "Boas-vindas" + campo origem do número (`card.field.telefone`).
5. Preview / dry-run mostra exemplo.
6. Salvar → `POST /automations` → backend valida schema do trigger/actions (Zod).
7. Quando um card é movido para essa lista:
   - Handler do evento `CARD_MOVED` consulta automations ativas que casam.
   - Enfileira job `automation:run` com `{automationId, context: {card, event}}`.
   - Worker executa ações sequencialmente:
     1. `CardService.assignMember(userId)`
     2. `WhatsAppService.send({to, template, vars: cardVars})`
   - Grava `AutomationRun` com passos e status.
   - Em falha: registra no log, notifica criador da automação, aplica retry exponencial (3x).

**Observabilidade**: UI de "Execuções" mostra histórico com filtro por status e busca.

---

## F-06 — Formulário público gera card

1. Admin cria formulário vinculado ao quadro "Leads" → define campos (Nome, E-mail, Telefone, Mensagem), mapeia para `title=Nome`, `customField.telefone=Telefone`, etc.
2. Publica → gera URL `https://app.example.com/f/{slug}`.
3. Visitante anônimo preenche → `POST /f/{slug}` (endpoint público).
4. Backend valida captcha + schema + rate-limit (20 submissões/h por IP).
5. Cria `FormSubmission` + `Card` na lista alvo com valores mapeados + registra `Activity(CARD_CREATED, source='form')`.
6. Emite trigger `FORM_SUBMITTED` para automations.

---

## F-07 — SLA estourado

1. Cron de alta frequência (a cada 1 min) varre listas com `slaMinutes != null` buscando cards cujo `entryTime + slaMinutes < now()` e ainda não marcados.
2. Para cada card:
   - Grava `Activity(SLA_BREACHED)`.
   - Enfileira trigger `SLA_BREACH` para automations.
   - Envia Notification aos membros do card e ao criador do quadro (configurável).
3. UI: badge vermelho no card; relatório mostra `% dentro do SLA`.

**Pausa de SLA**: se card tem label configurada como "pausa SLA" (ex: "aguardando cliente"), o cálculo desconta o tempo com essa label.

---

## F-08 — Convidar membro para quadro privado (Guest)

1. Admin do quadro → aba Membros → "Adicionar" → busca usuário da Org por nome/e-mail.
2. Se não está na Org e role = GUEST → envia Invitation com papel `GUEST` na Org e `VIEWER`/`COMMENTER`/`EDITOR` no quadro.
3. GUEST logado só enxerga quadros onde é `BoardMember`; não vê sidebar completa nem outros quadros.

## F-08b — Gestor (ou Admin) acompanha fluxos em que não está incluso

1. Usuário com `Membership.role in (OWNER, ADMIN, GESTOR)` faz login.
2. Backend monta sidebar via `GET /boards` → query bypassa filtro `BoardMember` e retorna **todos** os quadros não-arquivados da Org (privados + ORGANIZATION-visibility), separados em grupos "Meus quadros" e "Todos os quadros da Org" no UI.
3. Usuário abre quadro privado em que não é BoardMember → `BoardRoleGuard` resolve:
   - `Membership.role in (OWNER, ADMIN, GESTOR)` → trata como `BoardRole = ADMIN` implícito → permite.
   - Registra `Activity(BOARD_VIEWED_IMPLICIT)` (opcional, ajuda em auditoria de privacidade / LGPD).
4. Usuário pode editar cards, criar/editar automações, mexer em listas e adicionar/remover membros do quadro — mesma experiência de BoardAdmin.
5. **Diferença**: `GESTOR` **não** consegue acessar rotas de admin da Org (`/configuracoes/membros`, `/configuracoes/integracoes`, `/configuracoes/billing`) — guard devolve 403. `OWNER`/`ADMIN` podem.

**Observação**: promover um usuário a `ADMIN` ou `GESTOR` é ação de `OWNER` (ou `ADMIN` para promover a `GESTOR`/`MEMBER`) e gera `Activity` de auditoria. Pode haver (v1.5+) uma flag opcional por quadro `hideFromImplicitAccess=true` para casos sensíveis (ex: quadro da diretoria, RH) — mas por padrão OWNER/ADMIN/GESTOR veem tudo.

---

## F-09 — Upload de anexo

1. Usuário clica "Anexar" no card → seleciona arquivo.
2. Cliente → `POST /attachments/presign` com `{cardId, fileName, mimeType, size}`.
3. Backend valida limite (25MB), gera URL S3 pré-assinada (PUT), retorna `{uploadUrl, storageKey}`.
4. Cliente faz PUT direto no S3 com progress.
5. Cliente → `POST /cards/{id}/attachments` com `{storageKey, fileName, mimeType, size}` (confirmação).
6. Backend cria `Attachment` + `Activity(ATTACHMENT_ADDED)` + WS emite.

Imagens >1080px geram thumbnails via job assíncrono.

---

## F-10 — Real-time: múltiplos usuários no mesmo quadro

1. Ao abrir quadro, cliente abre socket → handshake com JWT.
2. Cliente emite `join` canal `board:{boardId}` → servidor valida permissão.
3. Servidor registra presença em Redis `presence:board:{boardId}` (TTL 30s, renovado por heartbeat).
4. Avatares dos usuários online aparecem no topo do quadro (limite 8 visíveis + contador).
5. Mudanças de qualquer cliente viram eventos `card.*` / `list.*` / `comment.*` roteados via Redis adapter.
6. Desconexão (rede) → ao reconectar, cliente faz `GET /boards/{id}?since={timestamp}` para re-sincronizar delta (ou full reload se gap > 5min).

---

## F-11 — Busca global (Ctrl+K)

1. Usuário pressiona `Ctrl+K` em qualquer tela → abre modal de command palette.
2. Digita termo → debounce 200ms → `GET /search?q=...&types=card,board,comment`.
3. Backend usa Postgres `tsvector` em `title`, `description_plain`, `comment_body_plain` (colunas derivadas via trigger).
4. Resultados agrupados por tipo, com highlight, keyboard navigation.
5. Seleciona card → abre modal do card sobre a página atual.

---

## F-12 — Time tracking

1. No card, clica "Iniciar timer" → `POST /cards/{id}/time/start` → backend cria `TimeEntry` com `startedAt=now, endedAt=null`; só pode haver uma ativa por usuário.
2. UI mostra cronômetro no card e na topbar.
3. Clica "Parar" → `POST /time/{id}/stop` → `endedAt=now`, `minutes=diff`.
4. Entrada manual: formulário com data + duração + nota.
5. Relatório por quadro/membro/período — agregação SQL direta (inicialmente sem cube).

---

## F-13 — Alteração de papel (teto por rank)

Regra geral: cada papel só atribui papéis **iguais ou inferiores ao seu**.

1. Usuário logado (actor) tenta alterar papel de outro membro via UI.
2. Backend valida na ordem:
   - Actor tem papel ≥ papel-alvo? (Ex: `GESTOR` tentando setar `ADMIN` → 403.)
   - Actor tem papel ≥ papel-atual do alvo? (Ex: `GESTOR` tentando rebaixar um `ADMIN` → 403. Só `OWNER` rebaixa um `ADMIN`.)
   - Não está rebaixando o **último** `OWNER` da Org.
   - Caso especial: `ADMIN` pode promover outro a `ADMIN`, mas **não** pode rebaixar outro `ADMIN` (só `OWNER` faz).
3. Permissões de quadro (`BoardMember`) **não** são removidas automaticamente — a relação é independente. Ex: membro era `BoardMember ADMIN` no quadro "Vendas"; ao virar `GUEST` na Org, continua com acesso àquele quadro específico.
4. Registra `Activity(MEMBER_ROLE_CHANGED, payload={from,to,actor})` na Org.
5. WS emite `user:{id}` → `role.changed` para o afetado ajustar UI (sidebar, menus de admin).

**Matriz resumo de quem pode definir o quê:**

| Actor / Alvo | → OWNER | → ADMIN | → GESTOR | → MEMBER | → GUEST |
|---|:---:|:---:|:---:|:---:|:---:|
| OWNER | ✅ (transfer) | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ❌ | ✅ (promover) / ❌ (rebaixar outro) | ✅ | ✅ | ✅ |
| GESTOR | ❌ | ❌ | ✅ | ✅ | ✅ |
| MEMBER / GUEST | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## F-14 — Receber mensagem WhatsApp (v1.5)

1. Evolution API chama webhook `POST /integrations/evolution/webhook` (com HMAC secret).
2. Backend valida assinatura, identifica Organization pela integrationId.
3. Busca card vinculado pelo número do cliente (em `CustomFieldValue` tipo `PHONE`).
4. Se encontra: cria `Comment` no card com o corpo da mensagem + `WhatsAppMessage(IN)`.
5. Se não encontra e há "lista default de novos leads" configurada: cria card na lista com título `"Novo lead: {número}"`.
6. Notifica membros do card.

---

## Matriz de permissões (resumo)

| Ação | OWNER | ADMIN | GESTOR | MEMBER | GUEST |
|---|---|---|---|---|---|
| Criar quadro | ✅ | ✅ | ✅ | ✅ | ❌ |
| Gerenciar membros da Org (convidar/remover/alterar papel) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configurar integrações (Evolution, Drive, SMTP) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver **todos** os quadros da Org (incl. privados onde não é BoardMember) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Editar qualquer quadro como BoardAdmin implícito (automações, listas, cards, membros do quadro) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Editar quadros onde é BoardMember | (já é Admin implícito) | (já é Admin implícito) | (já é Admin implícito) | conforme BoardRole | conforme BoardRole |
| Billing / planos (pós-SaaS) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Deletar Org | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transferir `OWNER` | ✅ | ❌ | ❌ | ❌ | ❌ |

| Ação no quadro | BOARD ADMIN | EDITOR | COMMENTER | VIEWER |
|---|---|---|---|---|
| Editar config do quadro | ✅ | ❌ | ❌ | ❌ |
| Criar/mover/editar cards | ✅ | ✅ | ❌ | ❌ |
| Comentar | ✅ | ✅ | ✅ | ❌ |
| Ver | ✅ | ✅ | ✅ | ✅ |
| Criar automações | ✅ | ❌ | ❌ | ❌ |
