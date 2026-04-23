#!/usr/bin/env node
/**
 * Orquestrador do `pnpm dev` / `npm run dev` do KTask.
 *
 * Passos:
 *   1. Verifica se Docker está disponível
 *   2. Sobe infra (Postgres, Redis, MinIO, Mailpit) com healthcheck (--wait)
 *   3. Copia .env.example → .env (necessário pro Prisma CLI no dev) se ainda não existir
 *   4. Aplica migrations pendentes (idempotente)
 *   5. Executa `turbo run dev --parallel` pra apps/web e apps/api
 *
 * Ctrl+C encerra o turbo; containers Docker ficam up (mais rápido no próximo start).
 * Use `pnpm infra:down` para parar a infra quando quiser desligar tudo.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

function log(tag, message, color = COLORS.cyan) {
  const stamp = new Date().toLocaleTimeString('pt-BR');
  console.log(`${COLORS.dim}[${stamp}]${COLORS.reset} ${color}${COLORS.bold}[${tag}]${COLORS.reset} ${message}`);
}

function die(message) {
  log('dev', `${COLORS.red}${message}${COLORS.reset}`, COLORS.red);
  process.exit(1);
}

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Comando falhou (exit ${result.status}): ${command} ${args.join(' ')}`);
  }
}

function checkDocker() {
  log('infra', 'Verificando Docker...');
  const res = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], {
    shell: process.platform === 'win32',
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    die(
      'Docker não está disponível ou não está rodando.\n' +
      '  Abra o Docker Desktop e tente de novo.',
    );
  }
  log('infra', `Docker ok (engine ${res.stdout.trim()})`, COLORS.green);
}

function ensureApiEnv() {
  const apiEnv = resolve(ROOT, 'apps/api/.env');
  const apiEnvLocal = resolve(ROOT, 'apps/api/.env.local');
  const apiEnvExample = resolve(ROOT, 'apps/api/.env.example');

  // Prisma CLI lê .env; nossos dev envs ficam em .env.local.
  // Se não há .env mas existe .env.local, copiamos para manter Prisma feliz.
  if (!existsSync(apiEnv)) {
    if (existsSync(apiEnvLocal)) {
      copyFileSync(apiEnvLocal, apiEnv);
      log('env', 'apps/api/.env criado a partir de .env.local (Prisma CLI)', COLORS.yellow);
    } else if (existsSync(apiEnvExample)) {
      copyFileSync(apiEnvExample, apiEnv);
      copyFileSync(apiEnvExample, apiEnvLocal);
      log(
        'env',
        'apps/api/.env e .env.local criados a partir de .env.example. ' +
        'Ajuste os valores se necessário.',
        COLORS.yellow,
      );
    }
  }

  // apps/web/.env.local — cliente
  const webEnvLocal = resolve(ROOT, 'apps/web/.env.local');
  const webEnvExample = resolve(ROOT, 'apps/web/.env.example');
  if (!existsSync(webEnvLocal) && existsSync(webEnvExample)) {
    copyFileSync(webEnvExample, webEnvLocal);
    log('env', 'apps/web/.env.local criado a partir de .env.example', COLORS.yellow);
  }
}

function startInfra() {
  log('infra', 'Subindo Postgres + Redis + MinIO + Mailpit...');
  run('docker', [
    'compose',
    '-f',
    'infra/docker-compose.yml',
    'up',
    '-d',
    '--wait',
  ]);
  log('infra', 'Containers healthy.', COLORS.green);
}

function applyMigrations() {
  log('db', 'Aplicando migrations pendentes (prisma migrate deploy)...');
  // Idempotente: só aplica migrations ainda não executadas.
  run('pnpm', ['--filter', '@ktask/api', 'prisma:migrate:deploy']);
  log('db', 'Schema em dia.', COLORS.green);
}

function startDev() {
  log('dev', 'Iniciando web + api em paralelo (Ctrl+C para parar)...');
  const child = spawn('pnpm', ['run', 'dev:web-api'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  const shutdown = (signal) => {
    if (child.exitCode === null) {
      child.kill(signal);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  child.on('exit', (code) => {
    log(
      'dev',
      code === 0 ? 'Desenvolvimento encerrado.' : `turbo dev encerrou com código ${code}`,
      code === 0 ? COLORS.green : COLORS.yellow,
    );
    log(
      'dev',
      'Containers da infra continuam rodando. `pnpm infra:down` para parar tudo.',
      COLORS.dim,
    );
    process.exit(code ?? 0);
  });
}

// Main
try {
  checkDocker();
  ensureApiEnv();
  startInfra();
  applyMigrations();
  startDev();
} catch (err) {
  die(err instanceof Error ? err.message : String(err));
}
