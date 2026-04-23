# Infraestrutura local (dev)

`docker-compose.yml` sobe os 4 serviços que o KTask precisa localmente:

| Serviço         | Porta       | URL / Interface                                                                                            |
| --------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| **Postgres 16** | 5433        | `postgresql://ktask:ktask@localhost:5433/ktask` (porta 5433 para não colidir com Postgres do XAMPP/outros) |
| **Redis 7**     | 6379        | `redis://localhost:6379`                                                                                   |
| **MinIO (S3)**  | 9000 / 9001 | API: http://localhost:9000 · Console: http://localhost:9001 (`minio` / `miniominio`)                       |
| **Mailpit**     | 1025 / 8025 | SMTP: `localhost:1025` · UI: http://localhost:8025                                                         |

## Comandos

```bash
# Subir
pnpm infra:up

# Ver logs
pnpm infra:logs

# Parar
pnpm infra:down

# Limpar volumes (apaga dados!)
docker compose -f infra/docker-compose.yml down -v
```

## Bucket MinIO

O serviço `minio-init` roda automaticamente depois do MinIO ficar healthy e cria o bucket `ktask-attachments` com leitura anônima (para servir anexos públicos em dev). É container one-shot, sai ao terminar.

## Troubleshooting

- **Porta ocupada**: outro Postgres/Redis local? Ajuste a porta no `docker-compose.yml` ou pare o outro serviço.
- **Dados corrompidos no Postgres**: `docker compose down -v` limpa tudo. Depois rode `pnpm db:migrate && pnpm db:seed`.
- **Mailpit não recebe e-mails**: confirme que a API está configurada com `SMTP_HOST=localhost SMTP_PORT=1025` em `.env.local`.
