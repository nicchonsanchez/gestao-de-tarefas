/**
 * KTask — seed inicial.
 *
 * Cria:
 *   - Uma Organização "Kharis" (slug: kharis)
 *   - Um OWNER: admin@kharis.local / senha: ktask123 (trocar no primeiro login)
 *
 * Rodar com: pnpm db:seed (ou pnpm --filter @ktask/api prisma:seed)
 */
import argon2 from 'argon2';
import { PrismaClient, OrgRole, OrgPlan } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.info('[seed] Seeding KTask initial data...');

  const passwordHash = await argon2.hash('ktask123', {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 4,
  });

  const owner = await prisma.user.upsert({
    where: { email: 'admin@kharis.local' },
    update: {},
    create: {
      email: 'admin@kharis.local',
      name: 'Admin Kharis',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });
  console.info(`[seed] User:         ${owner.email} (${owner.id})`);

  const org = await prisma.organization.upsert({
    where: { slug: 'kharis' },
    update: {},
    create: {
      name: 'Kharis',
      slug: 'kharis',
      plan: OrgPlan.INTERNAL,
    },
  });
  console.info(`[seed] Organization: ${org.name} (${org.id})`);

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: owner.id,
        organizationId: org.id,
      },
    },
    update: { role: OrgRole.OWNER },
    create: {
      userId: owner.id,
      organizationId: org.id,
      role: OrgRole.OWNER,
    },
  });
  console.info(`[seed] Membership:   OWNER`);

  console.info('\n[seed] Done.');
  console.info('       Login: admin@kharis.local');
  console.info('       Senha: ktask123 (troque no primeiro login)\n');
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
