import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('base64');
}

async function updatePasswords() {
  const users = await prisma.user.findMany();

  for (const user of users) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = hashPassword(user.password, salt);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        salt: salt,
      },
    });
  }
}

updatePasswords()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
