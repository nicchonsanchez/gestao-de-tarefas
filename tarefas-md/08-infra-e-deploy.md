# Infra e Deploy — KTask

Decisões de hospedagem, domínios, secrets, CI/CD e ambientes.

---

## 1. Visão geral da arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                    ktask.agenciakharis.com.br                │
│                         (Vercel — Next.js)                   │
│                              │                               │
│                              │ HTTPS                         │
│                              ▼                               │
│              api.ktask.agenciakharis.com.br                  │
│            (AWS App Runner — NestJS + Socket.IO)             │
│                              │                               │
│         ┌────────────────────┼────────────────────┐          │
│         ▼                    ▼                    ▼          │
│   ┌──────────┐        ┌──────────────┐    ┌────────────┐    │
│   │   RDS    │        │ ElastiCache  │    │    S3      │    │
│   │ Postgres │        │   Redis      │    │  Anexos    │    │
│   └──────────┘        └──────────────┘    └────────────┘    │
│                              │                               │
│                              ▼                               │
│                       ┌──────────────┐                       │
│                       │   Workers    │                       │
│                       │ (App Runner  │                       │
│                       │  secundário) │                       │
│                       └──────────────┘                       │
│                              │                               │
│                              ▼                               │
│                  ┌──────────────────────┐                    │
│                  │  Evolution API       │                    │
│                  │  (externa, via URL)  │                    │
│                  └──────────────────────┘                    │
└──────────────────────────────────────────────────────────────┘

        SES (e-mail) ─ CloudWatch (logs) ─ SSM (secrets) ─ Sentry
```

## 2. Ambientes

| Ambiente     | URL frontend                         | URL API                                  | Banco                                                              |
| ------------ | ------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------ |
| **Local**    | `http://localhost:3000`              | `http://localhost:4000`                  | Docker Compose (Postgres + Redis + MinIO + Mailpit)                |
| **Staging**  | `ktask-staging.agenciakharis.com.br` | `api-ktask-staging.agenciakharis.com.br` | RDS pequeno (db.t4g.micro) + ElastiCache t4g.micro                 |
| **Produção** | `ktask.agenciakharis.com.br`         | `api.ktask.agenciakharis.com.br`         | RDS (db.t4g.small, Single-AZ inicialmente) + ElastiCache t4g.micro |

Staging vive o tempo todo e recebe merge automático de `main`. Prod recebe deploy via tag (`v1.2.3`) ou aprovação manual.

## 3. Cloud split

### Vercel — Frontend (`apps/web`)

- Deploy automático a cada push (preview per-branch; produção em `main`).
- **Custo**: Hobby grátis ou Pro ~$20/mês (recomendado para custom domain + analytics).
- **Config**:
  - Env var `NEXT_PUBLIC_API_URL=https://api.ktask.agenciakharis.com.br`
  - Env var `NEXT_PUBLIC_WS_URL=wss://api.ktask.agenciakharis.com.br`
  - Build: `pnpm turbo run build --filter=web`
  - Output: `apps/web/.next`
- **Observação**: Next.js pode ter **API routes** leves (BFF) rodando em serverless da Vercel — usadas só para: uploads pré-assinados (cliente → S3) e proxy de autenticação. **Não** usar serverless da Vercel para lógica pesada — tudo pesado vai pra NestJS na AWS.
- **WebSocket**: nunca na Vercel. Cliente conecta direto em `wss://api.ktask...`.

### AWS — Backend

**Serviços**:

| Serviço                 | Uso                                           | Custo mensal estimado (MVP)     |
| ----------------------- | --------------------------------------------- | ------------------------------- |
| **App Runner** (API)    | NestJS REST + Socket.IO                       | ~$25 (2 vCPU, 2GB, 1 instância) |
| **App Runner** (Worker) | BullMQ workers (automações, e-mail, WhatsApp) | ~$15 (0.5 vCPU, 1GB)            |
| **RDS PostgreSQL 16**   | Banco                                         | ~$15 (db.t4g.micro, 20GB gp3)   |
| **ElastiCache Redis 7** | Filas + WS adapter + cache                    | ~$12 (cache.t4g.micro)          |
| **S3**                  | Anexos                                        | < $5 (primeiros GB)             |
| **SES**                 | E-mail transacional                           | < $1 (62k/mês grátis)           |
| **CloudWatch Logs**     | Logs centralizados                            | ~$5                             |
| **SSM Parameter Store** | Secrets                                       | Grátis (tier standard)          |
| **Route 53** (opcional) | DNS                                           | $0.50/mês por zona              |
| **ACM**                 | Certificados SSL                              | Grátis                          |
| **Total MVP**           |                                               | **~$80/mês**                    |

**Justificativa App Runner vs ECS Fargate**:

- App Runner: push de container, ele cuida de scaling, SSL, health check. Custo menor pra baixa escala. Perfeito para uso interno.
- ECS Fargate: mais controle (VPC, ALB, regras finas), mas mais config. Vale se/quando escalar muito.
- **Decisão**: App Runner pra começar; migrar pra Fargate só se o custo ou limite do App Runner apertar.

### DNS

**Opção recomendada**: **Cloudflare** (mesmo com domínio `.com.br` no Registro.br, basta apontar NS do subdomínio `ktask.agenciakharis.com.br` para Cloudflare).

Vantagens:

- DNS rápido e de borda.
- WAF e rate limit grátis no plano Free.
- Analytics de tráfego.
- Pode ser usado como proxy ou DNS-only.

Configuração:

- `ktask.agenciakharis.com.br` → CNAME para Vercel (`cname.vercel-dns.com`)
- `api.ktask.agenciakharis.com.br` → CNAME para o App Runner (`xxx.awsapprunner.com`)
- Cloudflare DNS-only (cinza) no subdomínio da API para **não** proxy-ar WebSocket (proxy Cloudflare pode bloquear ou timeoutar WS longos no plano free).

### Domínios de staging

- `ktask-staging.agenciakharis.com.br` → Vercel preview / environment "staging"
- `api-ktask-staging.agenciakharis.com.br` → App Runner ambiente staging

## 4. Secrets e configuração

### Estratégia em camadas

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Dev local    │   │ Staging/Prod │   │ Por-Org      │
│ .env.local   │   │ AWS SSM      │   │ DB (cripto)  │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Arquivos no repo

| Arquivo               | Propósito                                      | Commitado?          |
| --------------------- | ---------------------------------------------- | ------------------- |
| `.env.example`        | Template com todas as variáveis (valores fake) | ✅ Sim              |
| `apps/api/.env.local` | Valores reais do dev local                     | ❌ Não (gitignored) |
| `apps/web/.env.local` | Idem front                                     | ❌ Não              |

### Variáveis principais (`.env.example`)

```dotenv
# API — core
DATABASE_URL=postgresql://dev:dev@localhost:5433/ktask
REDIS_URL=redis://localhost:6379
PORT=4000
NODE_ENV=development

# API — auth
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

# API — storage
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=ktask-attachments
S3_ACCESS_KEY=minio
S3_SECRET_KEY=miniominio
S3_PUBLIC_URL=http://localhost:9000/ktask-attachments

# API — e-mail
EMAIL_FROM="KTask <noreply@ktask.agenciakharis.com.br>"
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=

# API — Evolution (somente fallback; o normal é config por Org no DB)
EVOLUTION_DEFAULT_URL=
EVOLUTION_DEFAULT_API_KEY=

# API — criptografia
INTEGRATION_ENCRYPTION_KEY=change-me-32-bytes-hex

# API — observabilidade
SENTRY_DSN=
LOG_LEVEL=debug

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

### Em produção: AWS SSM Parameter Store

- Cada variável vira um `SecureString` em `/ktask/prod/<NOME>`.
- App Runner (role IAM) lê via SDK na inicialização e popula `process.env` — não precisa editar código.
- Rotação de segredo: versiona o parâmetro + redeploy do App Runner (reinicia).

### Credenciais Evolution API (o caso da pergunta)

**Não ficam no `.env` em produção** (porque podem mudar por Org quando virar multi-empresa). Ficam no banco, no modelo `Integration`:

```
Integration {
  organizationId
  provider = EVOLUTION_WHATSAPP
  config: encrypted JSON {
    url: "https://evolution.xxx.com",
    apiKey: "...",
    instanceName: "..."
  }
}
```

A criptografia usa **AES-256-GCM** com chave mestra vinda de `INTEGRATION_ENCRYPTION_KEY` (que está no SSM). O backend descriptografa on-the-fly ao usar.

Para o **dev local** (enquanto só existe uma Evolution da Kharis), tudo bem começar com `EVOLUTION_DEFAULT_URL` e `EVOLUTION_DEFAULT_API_KEY` no `.env.local`, e na primeira vez que abrir a página de Integrações, o backend popula a row `Integration` com esses defaults.

## 5. CI/CD

### GitHub Actions

**`.github/workflows/ci.yml`** (em toda PR):

1. Lint (`pnpm lint`)
2. Typecheck (`pnpm typecheck`)
3. Tests unit (`pnpm test`)
4. Build (`pnpm build`)
5. Tests e2e (Playwright, só em PRs para `main`)

**`.github/workflows/deploy-api.yml`** (em merge para `main`):

1. Build imagem Docker da API + Worker (duas tags).
2. Push pra **ECR** (Elastic Container Registry).
3. `aws apprunner start-deployment` em cada serviço App Runner.

**Vercel** faz deploy sozinho:

- Preview em cada PR.
- Production em merge pra `main` → aponta pra `ktask.agenciakharis.com.br`.
- Staging → branch `staging` aponta pra `ktask-staging.agenciakharis.com.br`.

### Migrations

- Prisma migrations versionadas em `apps/api/prisma/migrations/`.
- No deploy, App Runner roda `prisma migrate deploy` no `pre-start` (antes do `npm start`).
- Em caso de migration demorada ou destrutiva, rodar manualmente em janela planejada — nunca "só mergear e deixar o deploy rodar".

### Rollback

- App Runner mantém as 3 últimas revisões; `start-deployment --revision-id` volta em segundos.
- Prisma: migrations não têm `down` automático. Escrever migration reversa se precisar.
- Vercel: rollback de deploy em 1 clique no dashboard.

## 6. Observabilidade

### Logs

- **Aplicação** (Nest + Next): Pino → stdout → CloudWatch (capturado automaticamente pelo App Runner).
- **Formato**: JSON estruturado com `requestId`, `userId`, `orgId`, `level`, `msg`.
- **Retenção**: 30 dias padrão; 90 dias em logs de auditoria (Activity).

### Métricas

- App Runner expõe métricas padrão (CPU, mem, req count, 5xx). Suficiente pro MVP.
- **Extra** (opcional na v1): endpoint `/metrics` no NestJS (`prom-client`) e Prometheus externo (self-hosted em VPS simples ou Grafana Cloud Free).

### Traces

- **OpenTelemetry** no Nest + Next, export pra **Sentry** (que aceita traces) ou **Honeycomb** trial.
- Implementar só quando houver problema de performance real — não é prioridade MVP.

### Erros

- **Sentry** (free tier: 5k erros/mês, suficiente).
- Source maps do Next e do Nest upload no deploy.
- Release tagging igual ao commit SHA.

### Alertas (configurar na v1)

- API 5xx > 1% em 5min → Slack/e-mail
- Latência p99 > 1s em 10min → Slack
- Fila BullMQ com > 1000 jobs pendentes → Slack
- RDS CPU > 80% por 15min → Slack

## 7. Backup e recuperação

- **RDS**: backup automático diário (retenção 7 dias MVP; 30 dias v1). Point-in-time recovery habilitado.
- **S3**: versionamento de bucket habilitado.
- **Teste de restore**: a cada 90 dias, restaurar snapshot em ambiente isolado e rodar smoke test. Documentar no checklist.

## 8. Segurança operacional

- **Usuário root da AWS**: só usado pra criar a primeira conta IAM. Guardar MFA em gerenciador de senhas.
- **IAM**: cada pessoa/serviço tem sua própria IAM com MFA obrigatório.
- **Roles**: App Runner usa role separada (com permissão mínima: SSM read, S3 read/write no bucket, SES send, CloudWatch write, RDS connect).
- **Security Groups**: RDS e ElastiCache só aceitam conexão do App Runner (não expostos à internet).
- **SSL**: TLS 1.2+ em tudo (Vercel, App Runner, RDS, ElastiCache). ACM gerencia certs.
- **WAF**: Cloudflare grátis no nível DNS.

## 9. Custos esperados por fase

| Fase                                  | Infra mensal aproximada | Observação                                                   |
| ------------------------------------- | ----------------------- | ------------------------------------------------------------ |
| **Dev local**                         | $0                      | Docker Compose na máquina do dev                             |
| **MVP** (1 Org, <10 users)            | ~$80                    | 1x App Runner API + 1x Worker + RDS micro + Redis micro + S3 |
| **v1** (mais tráfego de automação)    | ~$150                   | App Runner escala, logs crescem                              |
| **v1.5 interno** (Kharis toda usando) | ~$200-300               | RDS vai pra `small`, Redis mantém                            |
| **Se virar SaaS**                     | depende                 | Outra conversa, sem data                                     |

## 10. Checklist de provisionamento (pré-MVP)

Quando for a hora de subir a infra:

- [ ] Conta AWS separada para o KTask (ou sub-org)
- [ ] IAM admin com MFA
- [ ] Região escolhida: `sa-east-1` (São Paulo) — latência baixa pra usuários BR
- [ ] VPC padrão aceita (App Runner gerencia)
- [ ] RDS Postgres criado
- [ ] ElastiCache Redis criado
- [ ] S3 bucket `ktask-attachments-prod` + CORS config
- [ ] SES em modo produção (sair da sandbox) + domínio `ktask.agenciakharis.com.br` verificado
- [ ] SSM: parâmetros populados
- [ ] ECR: repositórios `ktask-api` e `ktask-worker`
- [ ] App Runner: 2 serviços (api + worker)
- [ ] Domínio custom no App Runner: `api.ktask.agenciakharis.com.br`
- [ ] Vercel: projeto criado, domínio custom vinculado
- [ ] Cloudflare: DNS apontado
- [ ] Sentry: projetos criados
- [ ] GitHub Actions: secrets configurados (AWS keys, SSM paths)
