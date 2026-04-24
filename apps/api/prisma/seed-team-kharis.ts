/**
 * Seed da equipe Kharis — importa os usuários do Ummense.
 *
 * Executar em produção:
 *   docker exec ktask-api sh -c "npx tsx prisma/seed-team-kharis.ts"
 *
 * Idempotente: seguro rodar mais de uma vez. Usa upsert baseado em email.
 * Usuário existente desenvolvimento@agenciakharis.com.br é renomeado pra Nicchon Sanchez.
 *
 * Senha inicial de todos os novos: "ktask123" (orientar a trocar no primeiro login).
 */
import argon2 from 'argon2';
import { PrismaClient, OrgRole } from '@prisma/client';

const prisma = new PrismaClient();

const TEAM: Array<{ email: string; name: string; role: OrgRole }> = [
  { email: 'desenvolvimento@agenciakharis.com.br', name: 'Nicchon Sanchez', role: 'OWNER' },
  { email: 'dhyovaine@agenciakharis.com.br', name: 'Dhyovaine', role: 'OWNER' },
  { email: 'fernanda@agenciakharis.com.br', name: 'Fernanda Biazatti', role: 'ADMIN' },
  { email: 'thiago.bueno@agenciakharis.com.br', name: 'Thiago Bueno', role: 'MEMBER' },
  { email: 'leila.oliveira@agenciakharis.com.br', name: 'Leila Oliveira', role: 'MEMBER' },
  { email: 'gerenciacomunicacao@anec.org.br', name: 'Anna Catarina Fonseca', role: 'MEMBER' },
  {
    email: 'carol.assuncao@afbrasilia.org.br',
    name: 'Carol - Aliança Francesa Assunção',
    role: 'MEMBER',
  },
  { email: 'maciana@catolicaorione.edu.br', name: 'Maciana Ferreira Silva', role: 'MEMBER' },
];

async function main() {
  console.info('[seed-team] Seeding Kharis team...');

  const org = await prisma.organization.findUnique({ where: { slug: 'kharis' } });
  if (!org) {
    throw new Error('Organização "kharis" não encontrada. Rode o seed principal antes.');
  }

  const passwordHash = await argon2.hash('ktask123', {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 4,
  });

  for (const t of TEAM) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: { name: t.name }, // preserva passwordHash existente
      create: {
        email: t.email,
        name: t.name,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.membership.upsert({
      where: {
        userId_organizationId: { userId: user.id, organizationId: org.id },
      },
      update: { role: t.role },
      create: {
        userId: user.id,
        organizationId: org.id,
        role: t.role,
      },
    });

    console.info(`[seed-team] ${t.email.padEnd(42)} ${t.role.padEnd(7)} ${t.name}`);
  }

  console.info('\n[seed-team] Done. Todos os membros novos logam com a senha "ktask123".');
  console.info('           Orientar cada um a trocar no primeiro login.');
}

main()
  .catch((err) => {
    console.error('[seed-team] Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
