# syntax=docker/dockerfile:1.6
# Multi-stage build para KTask Web (Next.js 15 standalone).
# Rodar do diretório RAIZ do monorepo:
#   docker build -f apps/web/Dockerfile -t ktask-web:latest .

ARG NODE_VERSION=22.12.0
ARG PNPM_VERSION=9.15.0

# ---------------- Stage 1: base ----------------
FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

# ---------------- Stage 2: pruner ----------------
# turbo prune gera um subset do monorepo só com o que @ktask/web precisa
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@^2 prune @ktask/web --docker

# ---------------- Stage 3: deps ----------------
FROM base AS deps
COPY --from=pruner /repo/out/json/ ./
COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --prod=false

# ---------------- Stage 4: builder ----------------
FROM base AS builder
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=pruner /repo/out/full/ ./

# Builds packages dependencies primeiro (contracts)
RUN pnpm turbo run build --filter=@ktask/contracts

# Variáveis public do Next.js precisam estar no build (são inlined)
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:4000
ARG NEXT_PUBLIC_APP_NAME=KTask
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm turbo run build --filter=@ktask/web

# ---------------- Stage 5: runner ----------------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone gera /apps/web/.next/standalone/ com tudo que precisa
# + /apps/web/.next/static + /apps/web/public (copiados separadamente)
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public 2>/dev/null || true

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:3000/ || exit 1

CMD ["node", "apps/web/server.js"]
