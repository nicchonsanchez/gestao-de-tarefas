# Modo Independente — 2026-04-25 (noite 2)

> Continuação. Primeira ativação desta noite (02:21–03:25) foi encerrada a pedido do operador após etapas 1 e 2 do cronômetro. Reativação agora pra fechar pendências em sequência.

## Escopo da noite (reativação)

**Foco em ordem:**

1. **Fase 2A — Editor Tiptap pra descrição do card** (deps já instaladas em commit anterior, falta criar componente + integrar)
2. **Fase 2B — Upload de imagem inline na descrição** (Attachment.embedded + endpoint + integração com toolbar Tiptap)
3. **Fase 3 — Timeline com anexos + drag-drop** (substituir editor de comments por Tiptap, botões "imagem"/"anexo", drop zone, chips de arquivo)
4. **Etapas 3-7 do doc 18** (cronômetro): bloco "Tempo registrado" no modal, página `/indicadores/timesheet`, resumo na página de Membros, realtime, exportar CSV
5. **Itens `[ ]` da `tarefas-md/checklist.md` em fallback** se algo travar — respeitando denylist e dependências

**Push direto na main:** liberado.

**Arquivos/diretórios proibidos:** nenhum específico (denylist global da memory `feedback_modo_independente.md` continua).

**Onde aviso:** WhatsApp do operador `5531993767301` via Evolution API. Eventos:

- Reativação do modo (esta mensagem)
- Conclusão de cada feature/fase relevante (ex: "Fase 2A do editor concluída às HHh")
- BLOQUEIO PARCIAL com pivot
- BLOQUEIO TOTAL
- Encerramento total (com resumo)

**Pivot em bloqueio:** liberado pra qualquer item `[ ]` do checklist.md que não dependa de decisão pendente.

## Decisões já travadas (validas pra esta noite tambem)

Reaproveitadas da primeira ativação:

- **Editor Tiptap (Fase 2A)**: starter-kit + link + underline + placeholder. Rich completo (bold, italic, underline, headings 1-3, listas, link, código inline, blockquote). Lazy-load via `dynamic` do Next pra não inflar bundle.
- **Imagem na descrição (Fase 2B)**: Attachment.embedded boolean default false. Filtragem em `getOne` exclui embedded. Drag-drop direto no editor.
- **Anexos da timeline (Fase 3)**: já suportados no backend (Fase 1 fechada — commit `bf047cc`). Frontend faz upload via presign e attach inline no comment.
- **CSV via papaparse** pra exportar timesheet (Fase 4 do cronômetro). XLSX fica como follow-up.
- **Lançar entry manual pra outro user**: só OWNER/ADMIN.
- **Overlap de duração**: alertar (toast warn) mas permitir.

## Notificações WhatsApp (idem noite 1)

- URL: `https://whats.agenciakharis.com.br`
- Instance: `NicchonSanchez`
- API key: env `EVOLUTION_DEFAULT_API_KEY` em `apps/api/.env`
- Operator phone (envio): `5531993767301`
- Operator JID real (leitura, polling opcional): `553193767301@s.whatsapp.net`

## Último WA lido (epoch unix)

1777094312

## Log

2026-04-25T04:32 — Reativação. Foco: Fase 2A → 2B → 3 dos anexos → etapas 3-7 do cronômetro → checklist em fallback. Task Scheduler do Windows continua armado (registro será atualizado). Registro de 04:32.

2026-04-25T04:44 — Cron tentando retomar. Registro de 04:44.

2026-04-25T04:55 — Limpeza do estado deixado pela sessao anterior (que rodou e morreu antes de commitar). 3 commits gerados/pushed: c4b581c (List.organizationId denormalizado, migration 20260425071405), bdfb786 (sensores Mouse/Touch separados pra liberar scroll mobile), 1d1fb24 (Tiptap deps pra Fase 2A). Typecheck verde nos dois apps. Migration ja aplicada localmente. Iniciando Fase 2A: editor Tiptap na descricao do card. Registro de 04:55.

2026-04-25T05:10 — Fase 2A concluida. Commit 7ababde (pushed): RichEditor (StarterKit + Underline + Link + Placeholder) lazy-loaded, toolbar completa (bold, italic, underline, code, h1-3, listas, citacao, link, undo/redo), auto-save debounce 800ms com indicador "Salvando…/Salvo". Substituiu textarea+plain-text na descricao do card. Typecheck e lint verdes. WhatsApp enviado pro operador. Iniciando Fase 2B: upload inline de imagem (Attachment.embedded + extension-image + drop/paste). Registro de 05:10.

2026-04-25T05:21 — Heartbeat. Backend da Fase 2B pronto: schema com Attachment.embedded boolean default false, migration 20260425081151_attachment_embedded aplicada, DTO CreateAttachmentSchema aceita embedded opcional, attachments.service.create propaga, cards.service.getOne filtra `embedded:false` em ambos (anexos do card e anexos dos comments). Tiptap extension-image instalada (3.22.4). Tive que matar `pnpm dev` rodando pra liberar a DLL do query-engine — pode ser necessario reiniciar. Indo pra integracao do Image extension + drag-drop + paste no RichEditor. Registro de 05:21.

2026-04-25T05:50 — Fase 2B concluida. Commit fe74529 (pushed): RichEditor com Image extension, handleDrop/handlePaste pra interceptar imagens, botao de imagem na toolbar com input file escondido, status "Enviando imagem…/Salvando…/Salvo" no rodape, card-modal wired com `onUploadImage` chamando `uploadAttachment(card.id, file, { embedded: true })` (publicUrl direto pro setImage). Typecheck e lint verdes. WhatsApp enviado.

2026-04-25T05:51 — Encerramento (sessão de cron). Budget de retomada apertado (~$0.73 restantes do teto desta sessao). Fase 3 (timeline com anexos + drag-drop) e etapas 3-7 do cronometro ficam pra proxima retomada do cron. State pra proximo ciclo: Fase 2A e 2B fechadas, Fase 3 ainda nao iniciada — retomar exatamente desse ponto. Todos os processos encerrados. Registro de 05:51.

2026-04-25T04:32 (BRT) — Reativação pelo operador. Operador foi dormir e pediu pra retomar. Fase 2A e 2B já fechadas em commits 7ababde e fe74529 (cron fez antes). Próximo foco: Fase 3 (timeline com anexos + drag-drop), depois etapas 3-7 do cronômetro (doc 18), depois checklist em fallback. Registro de 04:32.
