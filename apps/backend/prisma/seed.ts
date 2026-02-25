import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const run = async () => {
  const username = process.env.ADMIN_SEED_USERNAME || 'admin';
  const password = process.env.ADMIN_SEED_PASSWORD;
  const role = (process.env.ADMIN_SEED_ROLE as Role) || 'admin';

  if (!password) {
    throw new Error('ADMIN_SEED_PASSWORD is required');
  }

  const passwordHash = await argon2.hash(password);

  await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      role
    },
    create: {
      username,
      passwordHash,
      role
    }
  });
};

run()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
