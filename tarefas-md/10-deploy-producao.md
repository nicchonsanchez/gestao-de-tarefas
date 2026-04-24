# 10 — Deploy em produção

Documento vivo do deploy atual. Se algo divergir do que está aqui, consertar o doc.

---

## Visão geral

- **Provider**: Hetzner Cloud — VM `CX23` em Falkenstein (DE)
- **IP público**: `178.104.220.28`
- **Domínios**:
  - Web: `https://ktask.agenciakharis.com.br`
  - API: `https://api.ktask.agenciakharis.com.br`
- **DNS**: registros A apontando pro IP acima, gerenciados no DNS Pro (dnspro.com.br)
- **TLS**: Caddy com Let's Encrypt automático (renovação sozinha)
- **Runtime**: Docker Compose (`infra/docker-compose.prod.yml`) — 5 containers: `ktask-web`, `ktask-api`, `ktask-caddy`, `ktask-postgres`, `ktask-redis`
- **Deploy**: GitHub Actions em push pra `main` (`.github/workflows/deploy.yml`)
- **Custo aproximado**: ~R$ 34/mês (CX23 + backup + snapshot ocasional)

## Acesso ao servidor

### Chave pessoal (operação interativa, acesso root)

- Chave: `~/.ssh/ktask-deploy` (no notebook)
- Uso: `ssh -i ~/.ssh/ktask-deploy root@178.104.220.28`
- Contexto: debug pontual, inspeção de logs, intervenções manuais

### Chave de CI (uso pelo GitHub Actions, sem privilégios de root)

- Chave: `~/.ssh/ktask-ci` (no notebook; privada está nos secrets do GitHub)
- Usuário no servidor: `deploy` (grupo `docker`, sem sudo)
- Acesso: só o diretório `/opt/ktask` e o socket Docker
- Uso manual: `ssh -i ~/.ssh/ktask-ci deploy@178.104.220.28`

## Estrutura no servidor

```
/opt/ktask/                  # repo clonado (owner: deploy)
├── infra/
│   ├── docker-compose.prod.yml
│   ├── Caddyfile
│   └── prod.env             # (chmod 600, NÃO versionado)
├── apps/
└── ...
```

Volumes Docker persistentes:

| Volume                    | Conteúdo                       |
| ------------------------- | ------------------------------ |
| `ktask-prod_pgdata`       | Postgres (todos os dados)      |
| `ktask-prod_redisdata`    | Redis (filas BullMQ + pub/sub) |
| `ktask-prod_caddy_data`   | Certificados Let's Encrypt     |
| `ktask-prod_caddy_config` | Config em runtime do Caddy     |

## Secrets

### No servidor (`/opt/ktask/infra/prod.env`, chmod 600)

Variáveis sensíveis: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `POSTGRES_PASSWORD`, etc. Template: `infra/prod.env.example`. Gerar segredos com:

```bash
openssl rand -base64 48
```

### No GitHub (repo kharis-edu/gestao-de-tarefas → Settings → Secrets)

| Secret            | Conteúdo                                                       |
| ----------------- | -------------------------------------------------------------- |
| `DEPLOY_HOST`     | `178.104.220.28`                                               |
| `DEPLOY_USER`     | `deploy`                                                       |
| `DEPLOY_SSH_KEY`  | conteúdo de `~/.ssh/ktask-ci` (chave privada, ed25519)         |
| `DEPLOY_HOST_KEY` | saída de `ssh-keyscan -t ed25519 178.104.220.28` (known_hosts) |

Pra trocar qualquer secret: `gh secret set <NOME> --repo kharis-edu/gestao-de-tarefas`.

## Fluxo de deploy automatizado

1. Push pra `main` dispara 2 workflows em paralelo:
   - `CI` — lint, typecheck, test, build
   - `Deploy` — espera o `CI` passar antes de aplicar
2. `Deploy` conecta via SSH no servidor como `deploy@178.104.220.28` e roda:
   ```bash
   cd /opt/ktask
   git fetch --prune origin
   git reset --hard origin/main
   docker compose -f infra/docker-compose.prod.yml --env-file infra/prod.env up -d --build --remove-orphans
   ```
3. Aguarda healthcheck dos containers `ktask-api` e `ktask-web` ficarem `healthy` (timeout 2,5 min)
4. Faz smoke test HTTPS nos dois domínios esperando `200`

Se qualquer etapa falhar, o job falha e os containers antigos seguem rodando (Compose só troca o container quando o novo está healthy).

## Deploy manual (fallback)

Se o GitHub Actions tiver algum problema:

```bash
ssh -i ~/.ssh/ktask-ci deploy@178.104.220.28
cd /opt/ktask
git pull --ff-only origin main
docker compose -f infra/docker-compose.prod.yml --env-file infra/prod.env up -d --build
```

## Rollback

Sempre usar commit — nada de reverter arquivos no servidor.

```bash
# no notebook
git revert <sha>              # ou git reset --hard <sha-anterior> && push --force-with-lease
git push origin main          # dispara deploy pro estado anterior
```

Em emergência (servidor precisa voltar JÁ):

```bash
ssh -i ~/.ssh/ktask-ci deploy@178.104.220.28
cd /opt/ktask
git reset --hard <sha-anterior>
docker compose -f infra/docker-compose.prod.yml --env-file infra/prod.env up -d --build
```

## Observabilidade básica

```bash
# status dos containers
docker ps --format "table {{.Names}}\t{{.Status}}"

# logs ao vivo
docker logs -f --tail 100 ktask-api
docker logs -f --tail 100 ktask-web
docker logs -f --tail 100 ktask-caddy

# disco
df -h /var/lib/docker

# uso de memória/cpu
docker stats --no-stream
```

## Operações comuns

### Rodar seed (1ª vez, ou novo ambiente)

```bash
docker exec ktask-api sh -c "npx tsx prisma/seed.ts"
```

### Prisma migrate deploy avulso (pouco comum — o CMD do container já roda)

```bash
docker exec ktask-api sh -c "npx prisma migrate deploy"
```

### Backup do banco (manual; TODO automatizar)

```bash
docker exec ktask-postgres pg_dump -U ktask ktask > backup_$(date +%Y%m%d_%H%M).sql
```

## Credenciais iniciais (pós-seed)

- E-mail: `admin@kharis.local`
- Senha: `ktask123` ← **trocar no 1º login**

## Próximos endurecimentos (não urgentes)

- Fail2ban + desabilitar senha/root ssh (só chave)
- Backup automático do Postgres pro Hetzner Storage Box (ou S3 baratinho)
- Snapshot diário da VM (Hetzner oferece)
- Monitoring externo (UptimeRobot grátis já resolve)
- Log centralizado (Grafana Loki quando incomodar)
- Renovação da dependência do `kharis-edu` via deploy key em vez de repo público (quando ficar privado, usar `ssh_key` no clone)
