# Engine de Automações — KTask

Módulo mais complexo do sistema. Este documento detalha o contrato, o fluxo de execução, segurança, observabilidade e UI do builder antes de começar a implementação.

Modelo mental: **Trigger → (Conditions) → Actions** — igual Zapier/Make/Ummense.

---

## 1. Contrato de dados

### Automation
Persistida no banco como `Automation` (ver `03-entidades-e-dominio.md`). Corpo relevante:

```ts
{
  id: string;
  boardId: string;
  organizationId: string; // desnormalizado p/ escoar queries
  name: string;
  isEnabled: boolean;
  trigger: Trigger;       // jsonb
  conditions?: Conditions; // jsonb (opcional)
  actions: Action[];      // jsonb (array ordenado)
  createdById: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### Trigger
```ts
type Trigger =
  | { type: 'CARD_CREATED_IN_LIST'; params: { listId: string } }
  | { type: 'CARD_MOVED_TO_LIST'; params: { listId: string } }
  | { type: 'CARD_ARCHIVED'; params: {} }
  | { type: 'DUE_DATE_APPROACHING'; params: { daysBefore: number; atHour?: number } }
  | { type: 'DUE_DATE_PASSED'; params: { daysAfter: number } }
  | { type: 'FIELD_CHANGED'; params: { fieldId: string; toValue?: unknown } }
  | { type: 'LABEL_ADDED'; params: { labelId: string } }
  | { type: 'CHECKLIST_COMPLETED'; params: {} }
  | { type: 'COMMENT_ADDED'; params: { mentionOnly?: boolean } }
  | { type: 'MEMBER_ASSIGNED'; params: { memberId?: string } }
  | { type: 'SLA_BREACHED'; params: { listId?: string } }
  | { type: 'FORM_SUBMITTED'; params: { formId: string } }          // v1.5
  | { type: 'WEBHOOK_RECEIVED'; params: { webhookId: string } }     // v1.5
  | { type: 'SCHEDULED'; params: { cron: string; timezone: string } }; // v1.5
```

### Conditions
```ts
type Condition =
  | { field: 'label'; op: 'includes' | 'notIncludes'; value: string /* labelId */ }
  | { field: 'priority'; op: 'eq' | 'neq' | 'gte' | 'lte'; value: 'LOW'|'MEDIUM'|'HIGH'|'URGENT' }
  | { field: 'assignee'; op: 'includes' | 'notIncludes' | 'isEmpty'; value?: string }
  | { field: 'dueDate'; op: 'beforeToday' | 'afterToday' | 'withinDays' | 'isNull'; value?: number }
  | { field: 'listId'; op: 'eq' | 'neq'; value: string }
  | { field: `custom.${string}`; op: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'isEmpty'; value?: unknown }
  | { field: 'title'; op: 'contains' | 'startsWith'; value: string };

type Conditions = {
  combinator: 'AND' | 'OR';
  rules: Condition[];
  // Opcional: grupos aninhados (v1.5+)
  groups?: Conditions[];
};
```

### Action
```ts
type Action =
  | { id: string; type: 'MOVE_TO_LIST'; params: { listId: string; position?: 'top' | 'bottom' } }
  | { id: string; type: 'ASSIGN_MEMBER'; params: { userId: string | 'triggeringUser' } }
  | { id: string; type: 'UNASSIGN_MEMBER'; params: { userId: string | 'all' } }
  | { id: string; type: 'ADD_LABEL'; params: { labelId: string } }
  | { id: string; type: 'REMOVE_LABEL'; params: { labelId: string } }
  | { id: string; type: 'SET_PRIORITY'; params: { priority: 'LOW'|'MEDIUM'|'HIGH'|'URGENT' } }
  | { id: string; type: 'SET_DUE_DATE'; params: { daysFromNow: number; time?: 'HH:mm'; businessDays?: boolean } }
  | { id: string; type: 'SET_FIELD'; params: { fieldId: string; value: unknown } }
  | { id: string; type: 'APPEND_CHECKLIST_FROM_TEMPLATE'; params: { templateId: string } }
  | { id: string; type: 'POST_COMMENT'; params: { body: string /* com {{vars}} */ } }
  | { id: string; type: 'SEND_EMAIL'; params: { to: EmailRecipient; templateId: string; data?: Record<string, unknown> } }
  | { id: string; type: 'SEND_WHATSAPP'; params: { integrationId: string; to: WhatsRecipient; templateId: string } }
  | { id: string; type: 'CREATE_CARD'; params: { boardId: string; listId: string; title: string; fromTemplateId?: string } }
  | { id: string; type: 'CALL_WEBHOOK'; params: { url: string; method: 'POST'|'PUT'; headers?: Record<string,string>; body?: unknown } }
  | { id: string; type: 'DELAY'; params: { minutes?: number; hours?: number; days?: number; untilBusinessHours?: boolean } }
  | { id: string; type: 'IF'; params: { condition: Conditions; thenActions: Action[]; elseActions?: Action[] } }; // v2

type EmailRecipient =
  | { kind: 'assignees' }
  | { kind: 'creator' }
  | { kind: 'mentioned' }
  | { kind: 'field'; fieldId: string }        // campo tipo EMAIL
  | { kind: 'static'; emails: string[] };

type WhatsRecipient =
  | { kind: 'field'; fieldId: string }         // campo tipo PHONE
  | { kind: 'assignees' }
  | { kind: 'static'; numbers: string[] };      // E.164
```

## 2. Fluxo de execução

```
┌────────────────────────────────────────────────────────────────┐
│ 1. Evento de domínio publicado (ex: "card.moved")              │
│    via Nest EventEmitter2                                      │
└─────────────────────────┬──────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. AutomationDispatcher escuta evento, traduz pra TriggerType  │
│    (ex: card.moved + toListId → CARD_MOVED_TO_LIST)            │
└─────────────────────────┬──────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. Query: automations com { boardId, trigger.type, enabled }   │
│    Match de params (ex: trigger.params.listId === event.toId)  │
└─────────────────────────┬──────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. Enfileira BullMQ job "automation:run" para cada match       │
│    com payload { automationId, context, eventId, chainDepth }  │
└─────────────────────────┬──────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. Worker processa:                                            │
│    a. Cria AutomationRun (status=RUNNING)                      │
│    b. Avalia conditions — se false, status=SKIPPED, sai        │
│    c. Para cada action (em ordem):                             │
│       - resolveParams (renderiza {{vars}})                     │
│       - executa handler dedicado                               │
│       - loga passo em actionsLog                               │
│       - se erro: retry (3x exp. backoff) ou marca FAILED       │
│    d. Finaliza: status=SUCCESS ou FAILED                       │
└─────────────────────────┬──────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│ 6. WS emite `automation.run.completed` p/ UI de log ao vivo    │
└────────────────────────────────────────────────────────────────┘
```

### Pseudocódigo do worker (simplificado)

```ts
@Processor('automation')
export class AutomationProcessor {
  @Process('run')
  async handle(job: Job<RunPayload>) {
    const { automationId, context, chainDepth } = job.data;

    if (chainDepth > MAX_CHAIN_DEPTH) {
      return { skipped: true, reason: 'max chain depth' };
    }

    const automation = await this.db.automation.findUnique({ where: { id: automationId } });
    if (!automation?.isEnabled) return;

    const run = await this.db.automationRun.create({
      data: { automationId, cardId: context.cardId, status: 'RUNNING', triggerEvent: context.event },
    });

    // Condições
    if (automation.conditions) {
      const passes = this.evalConditions(automation.conditions, context);
      if (!passes) {
        await this.db.automationRun.update({ where: { id: run.id }, data: { status: 'SKIPPED' } });
        return;
      }
    }

    // Actions
    const log: ActionLogEntry[] = [];
    try {
      for (const action of automation.actions as Action[]) {
        const entry = await this.runAction(action, context, { chainDepth });
        log.push(entry);
        if (entry.status === 'FAILED') throw new Error(entry.error);
        if (entry.status === 'DELAYED') break; // re-enqueue com delay
      }
      await this.db.automationRun.update({
        where: { id: run.id },
        data: { status: 'SUCCESS', actionsLog: log, finishedAt: new Date() },
      });
    } catch (err) {
      await this.db.automationRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', actionsLog: log, error: String(err), finishedAt: new Date() },
      });
      // Notifica criador se preferência estiver ligada
      await this.notifyCreatorOnFailure(automation, err);
    }
  }
}
```

## 3. Avaliação de condições

- Função pura `evalConditions(cond, context) → boolean`.
- `context` contém: `card`, `board`, `list`, `event`, `actor`, `now`.
- Operadores mapeados direto (ex: `op: 'eq'` → `===`).
- Campos tipo `custom.{fieldId}` resolvem valor via `context.card.customValues[fieldId]`.
- **Sem eval/Function** — só dispatch em switch.

## 4. Template engine (variáveis em strings)

Usado em comentários, e-mails, WhatsApp, títulos de card criado.

**Sintaxe**: `{{path}}` — path dotted com whitelist de raízes.

**Raízes permitidas**:
- `card.title`, `card.description`, `card.url`, `card.priority`, `card.dueDate`, `card.startDate`
- `card.list.name`, `card.board.name`
- `card.assignees[0].name`, `card.assignees[0].email`
- `card.field.{fieldId}` — valor do campo personalizado
- `card.field.{fieldSlug}` — alias por slug (mais legível)
- `actor.name`, `actor.email` — quem disparou o evento
- `event.type`, `event.timestamp`
- `org.name`, `org.url`

**Funções (v1.5)**: `{{card.dueDate | date:"dd/MM/yyyy HH:mm"}}`, `{{card.title | upper}}`.

**Implementação**:
- Lib: **Mustache** (simples) ou **LiquidJS** (mais poderoso, com filtros).
- **Decisão**: começar com Mustache, trocar por LiquidJS quando precisar de filtros/loops.
- Resolvedor de path com whitelist estrita — **nunca** fazer `eval` ou `new Function`.
- Valores undefined renderizam string vazia (não `undefined` literal).

## 5. Handlers de Action

Cada action é um arquivo em `apps/api/src/modules/automations/actions/{tipo}.handler.ts`. Interface comum:

```ts
interface ActionHandler<P = unknown> {
  readonly type: ActionType;
  execute(params: P, context: AutomationContext): Promise<ActionResult>;
}

type ActionResult =
  | { status: 'SUCCESS'; data?: Record<string, unknown> }
  | { status: 'FAILED'; error: string; retriable: boolean }
  | { status: 'DELAYED'; resumeAt: Date }; // para DELAY e untilBusinessHours
```

Registro em `ActionHandlerRegistry` (Nest provider) com resolução por `type`.

### Exemplo — `MoveToListHandler`
```ts
@Injectable()
export class MoveToListHandler implements ActionHandler<{ listId: string; position?: 'top'|'bottom' }> {
  readonly type = 'MOVE_TO_LIST';

  constructor(private readonly cards: CardsService) {}

  async execute(params, ctx) {
    try {
      await this.cards.move({
        cardId: ctx.card.id,
        toListId: params.listId,
        position: params.position ?? 'bottom',
        actor: { kind: 'automation', automationId: ctx.automationId },
      });
      return { status: 'SUCCESS' };
    } catch (err) {
      return { status: 'FAILED', error: String(err), retriable: true };
    }
  }
}
```

### Exemplo — `SendWhatsAppHandler`
```ts
async execute(params, ctx) {
  const integration = await this.integrations.getDecrypted(params.integrationId);
  const to = this.resolveRecipient(params.to, ctx);
  const template = await this.templates.findById(params.templateId);
  const body = this.renderTemplate(template.body, ctx);
  try {
    const resp = await this.evolution.sendText({
      url: integration.config.url,
      apiKey: integration.config.apiKey,
      instance: integration.config.instanceName,
      to,
      body,
    });
    await this.whatsMsg.log({ cardId: ctx.card.id, body, to, status: 'SENT', externalId: resp.id });
    return { status: 'SUCCESS', data: { externalId: resp.id } };
  } catch (err) {
    await this.whatsMsg.log({ cardId: ctx.card.id, body, to, status: 'FAILED', errorMessage: String(err) });
    return { status: 'FAILED', error: String(err), retriable: this.isTransient(err) };
  }
}
```

### Exemplo — `DelayHandler`
```ts
async execute(params, ctx) {
  const minutes = (params.days ?? 0) * 1440 + (params.hours ?? 0) * 60 + (params.minutes ?? 0);
  const resumeAt = new Date(Date.now() + minutes * 60_000);
  // Marca no AutomationRun e re-enqueue com delay
  await this.queue.add('automation:resume', { runId: ctx.runId, resumeFromActionIdx: ctx.actionIdx + 1 }, { delay: minutes * 60_000 });
  return { status: 'DELAYED', resumeAt };
}
```

## 6. Retries e idempotência

### Retries (BullMQ)
- Cada job tem `attempts: 4` (1 inicial + 3 retries).
- Backoff: `exponential`, delay inicial 30s (`30s → 60s → 120s → 240s`).
- Só retenta se handler retornar `retriable: true` (erros transientes: 5xx externo, timeout). **Não retenta** se for `4xx` (input inválido, permissão).

### Idempotência
- Toda action recebe `idempotencyKey = ${runId}:${actionIdx}`.
- Handlers que chamam serviços externos (WhatsApp, webhooks) passam esse key. Serviços internos usam pra evitar dupla escrita em retry.
- `SEND_WHATSAPP`: Evolution aceita `externalAttributes.customId` — reutilizamos.
- `CREATE_CARD`: cria com dedup key unique index composta (`automationRunId`, `actionIdx`).

## 7. Segurança

### Anti-loop
- **Profundidade de cadeia**: job recebe `chainDepth`. Se `> MAX_CHAIN_DEPTH` (default 5), pula. Evita A → B → A → B ... infinito.
- Incremento: quando uma action gera um evento que dispara outra automação, o novo job herda `chainDepth + 1`.

### Rate limiting por Org
- Limite de **automations em execução simultânea** por Org: 20 (configurável).
- Limite de **execuções por minuto** por Org: 100.
- Excedentes ficam na fila (não descartados), mas alertam o criador.

### Sandboxing de templates
- Templates passam por renderer com **whitelist de paths** (ver seção 4). Nenhuma execução de código arbitrário.
- HTML em descrições sanitizado com **DOMPurify** ao renderizar no frontend.

### Webhooks de saída
- `CALL_WEBHOOK` tem timeout de 10s e tamanho máximo de body de 64KB.
- Não permite localhost / IPs privados (resposta `192.168.*`, `10.*`, `127.*` bloqueada — previne SSRF).
- Assinatura HMAC-SHA256 no header `X-KTask-Signature` com secret da Org.

### Permissões
- Só `BoardAdmin` (ou OWNER/ADMIN/GESTOR da Org via bypass) pode criar/editar automação.
- Automação roda com **permissões do sistema** (bypassa permission checks dos services, pois é evento interno). Mas:
  - Auditada em `Activity` como `actor: { kind: 'automation', automationId }`.
  - Email/WhatsApp não pode contatar membros fora da Org.

## 8. Observabilidade

### AutomationRun
- Toda execução grava row em `AutomationRun` com `actionsLog` (array por passo: `type`, `status`, `durationMs`, `error?`, `data?`).
- Retenção: 90 dias. Job noturno purga runs antigos (exceto FAILED, que ficam 180d pra troubleshoot).

### UI de logs
- Página por automação: timeline das execuções com status e duração.
- Detalhe do run: árvore de steps com expand/collapse, payload do evento, erro completo.
- Ações: **retentar** (cria novo job), **ver card** (deep link).

### Métricas
- Contador Prometheus:
  - `ktask_automation_runs_total{status, action_type, org}`
  - `ktask_automation_duration_seconds{action_type}`
- Alertas: taxa de erro > 5% em 15min → Slack.

## 9. Dry-run (v1.5)

- Botão "Testar" no builder.
- Escolhe um card real como "entrada hipotética".
- Worker executa em **modo simulado**: handlers têm flag `dryRun=true`.
  - Side-effect internos (DB): rollback no fim da transação.
  - Chamadas externas (WhatsApp, webhooks): **não disparam** — apenas logam "would send".
- Retorna log como run real, mas com flag `dryRun: true`.

## 10. UI do Builder

Decisão: **Wizard por passos** no MVP, evoluir para flow visual na v2.

### Wizard 3 passos

```
1️⃣  Quando isto acontecer  (Trigger)
   ────────────────────────────────────
   ( ) Um card for criado na lista [Select de listas]
   (•) Um card for movido para a lista [A Fazer ▾]
   ( ) A data de prazo chegar em [7] dias
   ( ) Um campo for alterado [Seleciona campo + valor opcional]
   ( ) ...

[Continuar →]

2️⃣  Se estas condições forem atendidas (opcional)
   ────────────────────────────────────
   [+ Adicionar condição]
   • Etiqueta [inclui ▾] [Urgente ▾]           [x]
   • Prioridade [é ▾] [Alta ▾]                 [x]
     Combinar com: (•) Todas   ( ) Qualquer

[← Voltar]  [Continuar →]

3️⃣  Fazer estas ações
   ────────────────────────────────────
   1. [Atribuir membro ▾] [João Silva ▾]      [x]
   2. [Adicionar etiqueta ▾] [Em Análise ▾]   [x]
   3. [Enviar WhatsApp ▾]
       Para: [Campo "Telefone" ▾]
       Template: [Boas-vindas ▾]               [x]
   4. [Aguardar 30 minutos ▾]                  [x]
   5. [Postar comentário ▾]
       "Olá {{card.assignees[0].name}}, ..."  [x]
   [+ Adicionar ação]

[← Voltar]  [Salvar automação]
```

### Editor de template (variáveis)
- Campo rich-text com autocompletar `{{` → dropdown com paths disponíveis baseados no trigger selecionado.
- Preview ao lado mostrando exemplo renderizado com dados do último card da lista escolhida.

### Recipe library
- Tela "Novo a partir de modelo" com 10-15 receitas prontas:
  - "Avisar cliente quando card entrar em 'Pronto'" (WhatsApp)
  - "Atribuir responsável por etiqueta"
  - "Lembrar 1 dia antes do prazo"
  - "Criar subtarefa padrão ao criar card"
  - ...

## 11. Testes

- **Unit**: cada handler tem seus testes (mock services, verifica idempotência, resposta).
- **Integration**: testa dispatch completo com banco real em Postgres test + fila in-memory.
- **E2E**: Playwright cria automação via UI, dispara evento, verifica efeito.

Cobertura mínima: 80% nos handlers (são o núcleo).

## 12. Implementação em fases

| Fase | Entrega |
|---|---|
| **v1** | Engine core + 10 actions (move, assign, label, setField, comment, email, whatsapp, createCard, delay, setDueDate) + 8 triggers (list moves, creates, dueDate, field change, mentions, assign) + wizard UI + logs |
| **v1.5** | Form trigger, webhook trigger, dry-run, biblioteca de receitas, condições em grupos aninhados |
| **v2** | Action IF/ELSE, cron trigger sofisticado, editor visual (flow), filtros em template engine |

## 13. Pontos de atenção

1. **Latência percebida**: ação "Enviar WhatsApp" depende da Evolution — pode atrasar 5-30s. Usuário vê "executando" em tempo real via WS.
2. **Sincronia vs assíncrono**: algumas actions afetam o card imediatamente (move, assign) — usuário espera ver mudança rápida. Considerar executar actions "rápidas" inline (antes de retornar do service) e enfileirar só as "lentas" (WhatsApp, e-mail, webhook). Decisão v1: **tudo assíncrono**, simplifica raciocínio.
3. **Order of operations**: se actions 1 e 2 são `move` e `assign`, e 1 falhar, 2 não deve executar (já é assim pelo `throw` no worker).
4. **Ressuscitar run parado em deploy**: se worker morre no meio, BullMQ marca como `stalled` e re-processa automaticamente — mas actions já executadas podem repetir. Por isso idempotência em tudo que toca serviço externo.
5. **Schema evolution**: `trigger`/`actions` são JSONB. Adicionar novos campos deve ser retrocompatível. Usar Zod schemas versionados.
