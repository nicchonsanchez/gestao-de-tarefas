/**
 * Popula variáveis de ambiente mínimas para os testes unitários.
 * Evita depender de .env real e satisfaz a validação Zod de env.ts.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://ktask:ktask@localhost:5433/ktask_test?schema=public';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-minimum-16-chars';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-minimum-16-chars';
