# Visão Geral — KTask

## Nome
**KTask** — sistema de gestão de tarefas da Kharis.

## Objetivo
Plataforma interna de gestão de tarefas e fluxos de trabalho para as operações da empresa, inspirada em **Ummense** (núcleo funcional: automações, SLAs, formulários, time tracking) e **Trello** (DNA de UX: Kanban fluido, drag & drop, edição rápida, colaboração em tempo real).

**Uso interno é a prioridade agora**. SaaS multi-empresa é um horizonte possível, sem data e sem compromisso — não gastamos energia em features puramente comerciais (billing, landing, cadastro público) até o sistema estar sólido internamente. A arquitetura é **multi-tenant desde o dia zero** (`organizationId` em tudo) porque o custo é baixo e evita refactor futuro.

## Problema que resolve
Equipes da empresa hoje usam (ou usariam) ferramentas terceiras (Trello, Ummense, planilhas) com limitações:
- Automações restritas a planos pagos caros e pouco customizáveis
- Integração frágil com WhatsApp (Evolution API interno resolve)
- Dificuldade de cruzar dados entre quadros e módulos
- Falta de controle sobre dados (LGPD, retenção, backups)
- Custo por assento cresce linearmente com a equipe

Um sistema próprio elimina esses atritos e concentra a operação em uma base única e auditável.

## Público-alvo
### Fase 1 — Uso interno (MVP → v1.5)
- Equipes internas da empresa (operação, comercial, produto, suporte)
- Usuários variam entre iniciantes (precisam de UX simples tipo Trello) e power-users (precisam de automações e views avançadas tipo Ummense)

### Fase 2 — SaaS (v2+)
- PMEs brasileiras em setores com rotina repetitiva e necessidade de Whatsapp (clínicas, escritórios de advocacia, agências, lojas, prestadoras de serviço)
- Concorrência direta: Ummense, Pipefy, Monday, ClickUp, Trello

## Diferenciais
1. **Automações em camada de domínio, não bolt-on**: engine próprio de triggers + conditions + actions, com biblioteca extensível e execução assíncrona via filas.
2. **WhatsApp nativo via Evolution API**: disparos dentro de automações, respostas criando cards, templates de mensagem — algo que as concorrentes só fazem via Zapier caro.
3. **Multi-tenant desde o início**: pronto para virar SaaS sem refactor.
4. **Real-time colaborativo**: presença, cursores, movimentação de cards espelhada entre clientes (Socket.IO).
5. **Dados sob controle do cliente (pós-SaaS)**: exportação completa, LGPD-friendly, possibilidade de self-host no futuro.

## Princípios de produto
- **Velocidade percebida > completude**: interação tem que parecer instantânea. Optimistic UI + WebSocket para reconciliar.
- **Kanban é o default, não o único**: views de Lista, Calendário e Timeline vêm depois, mas o modelo de dados já suporta.
- **Automação é cidadão de primeira classe**: qualquer ação humana deve poder ser automatizada.
- **Um clique a menos vence**: decisões de UX sempre buscam reduzir cliques em fluxos repetitivos.
- **Audit trail sempre**: toda ação relevante grava `Activity` — nunca se perde o histórico.

## Fora do escopo (explicitamente)
- CRM completo (pipeline de vendas com deals, empresas, contatos) — só o suficiente para cards representarem "leads" via formulários
- Wiki/documentação interna (tipo Notion)
- Chat persistente estilo Slack (comentários em cards cobrem o essencial)
- Gestão financeira / faturamento de clientes
- App mobile nativo no MVP (PWA responsivo dá conta)

## Nomenclatura (enum interno ↔ UI pt-BR)

UI sempre em português. Enums/código em inglês (padrão do domínio técnico).

| Enum (código) | UI pt-BR |
|---|---|
| `OrgRole.OWNER` | Dono |
| `OrgRole.ADMIN` | Administrador |
| `OrgRole.GESTOR` | Gestor |
| `OrgRole.MEMBER` | Membro |
| `OrgRole.GUEST` | Convidado |
| `BoardRole.ADMIN` | Admin do quadro |
| `BoardRole.EDITOR` | Editor |
| `BoardRole.COMMENTER` | Comentarista |
| `BoardRole.VIEWER` | Observador |
| `Visibility.PRIVATE` | Privado |
| `Visibility.ORGANIZATION` | Toda a empresa |
| `Priority.LOW/MEDIUM/HIGH/URGENT` | Baixa / Média / Alta / Urgente |

Termos gerais:
- **Board** → "Quadro"
- **List** → "Lista" (ou "Coluna" na UX conforme contexto)
- **Card** → "Card" (termo já absorvido pelo mercado brasileiro; evitar "Cartão")
- **Workspace / Organization** → "Empresa" (no contexto interno) ou "Organização" (SaaS)

## Referências
- **Ummense** (https://ummense.com) — referência principal de funcionalidades
- **Trello** (https://trello.com) — referência de UX do Kanban
- **Pipefy**, **Monday**, **ClickUp** — referências secundárias para views avançadas
- **Linear** — referência de qualidade de UI e atalhos de teclado
