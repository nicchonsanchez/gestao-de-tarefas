# syntax=docker/dockerfile:1.6
# Multi-stage build para KTask API (NestJS).
# Rodar do diretório RAIZ do monorepo:
#   docker build -f apps/api/Dockerfile -t ktask-api:latest .

ARG NODE_VERSION=22.12.0
ARG PNPM_VERSION=9.15.0

# ----------------- Stage 1: base -----------------
FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache libc6-compat openssl
# npm -g corepack@latest corrige bug de signature em corepacks antigos
RUN npm install -g corepack@latest && corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

# ----------------- Stage 2: pruner -----------------
# Usa turbo prune para gerar um workspace enxuto com só o que a API precisa.
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@^2 prune @ktask/api --docker

# ----------------- Stage 3: deps -----------------
FROM base AS deps
COPY --from=pruner /repo/out/json/ ./
COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --prod=false

# ----------------- Stage 4: builder -----------------
FROM base AS builder
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /repo/packages ./packages
COPY --from=pruner /repo/out/full/ ./
# Gera o Prisma client e compila
RUN cd apps/api && pnpm prisma generate
RUN pnpm turbo run build --filter=@ktask/api

# ----------------- Stage 5: runner -----------------
FROM node:${NODE_VERSION}-alpine AS runner
RUN apk add --no-cache libc6-compat openssl tini
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000 \
    HOSTNAME=0.0.0.0

# Usuário não-root por segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copia apenas o necessário para rodar
COPY --from=builder --chown=nestjs:nodejs /repo/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /repo/apps/api/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /repo/apps/api/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /repo/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /repo/apps/api/node_modules ./apps-api-node_modules
# Mescla node_modules do app sobre o root (resolve deps locais do workspace)
RUN cp -r apps-api-node_modules/. node_modules/ 2>/dev/null || true && rm -rf apps-api-node_modules

USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:4000/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
# Aplica migrations antes de subir
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
