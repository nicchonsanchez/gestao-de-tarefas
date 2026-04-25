# Modo Independente — 2026-04-25

## Escopo da noite

**Foco:** primeiro implementar o cronômetro de cards (doc [18-time-tracking.md](18-time-tracking.md), etapas 1–7). Depois descer pela fila de itens `[ ]` em [checklist.md](checklist.md), respeitando a denylist da memory `feedback_modo_independente.md`.

**Push direto na main:** liberado.

**Arquivos/diretórios proibidos:** nenhum específico esta noite (denylist global da memory continua valendo: nada de force-push, reset --hard, mexer em prod, deletar `.env*`, etc).

**Onde aviso:** WhatsApp do operador `5531993767301` via Evolution API (creds em `apps/api/.env`). Eventos:

- Ativação do modo
- Conclusão de cada etapa/implementação relevante (ex: "Implementação do cronômetro concluída às HHh")
- BLOQUEIO PARCIAL com pivot
- BLOQUEIO TOTAL
- Encerramento total

Mensagens curtas, sem emoji.

**Última sessão de Claude antes desta:** desconhecida. Assumindo batch completo de 11 crons (cobertura 5h30).

**Pivot em bloqueio:** liberado para qualquer item `[ ]` da `tarefas-md/checklist.md` que não dependa da decisão pendente.

## Decisões já travadas para o doc 18 (sem bloquear)

1. ~~Posição mobile do widget~~ — resolvido: timer fica no header global, não flutua.
2. **"Indicadores" no menu**: KTask não tem sidebar fixo. Item provisório no menu do user (clicar avatar → "Indicadores"), até a feature de menu lateral existir.
3. **Exportar dados**: CSV via `papaparse` (lib leve, ~7KB gz). XLSX fica como follow-up.
4. **Lançar entry manual pra outro user**: só OWNER/ADMIN da Org. GESTOR não, MEMBER não.
5. **Overlap de duração**: alertar via toast warn ("Conflita com entry de HH:MM–HH:MM") mas permitir salvar.

## Notificações WhatsApp

- URL: `https://whats.agenciakharis.com.br`
- Instance: `NicchonSanchez`
- API key: env `EVOLUTION_DEFAULT_API_KEY` em `apps/api/.env`
- Operator phone (envio): `5531993767301`
- Operator JID real (leitura): `553193767301@s.whatsapp.net` (sem o "9" extra)

## Último WA lido (epoch unix)

1777094312

## Log

2026-04-25T02:21 — Ativação. Foco: cronômetro de cards (doc 18, etapas 1–7) + checklist em fallback. Batch #1 de 11 crons sendo armado. Registro de 02:21.
