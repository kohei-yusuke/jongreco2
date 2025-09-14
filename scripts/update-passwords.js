const { PrismaClient } = require('@prisma/client');
const { TextEncoder } = require('util');

const prisma = new PrismaClient();
const encoder = new TextEncoder();

async function hashPassword(password, salt) {
  const data = encoder.encode(password + salt);
  const hash = await crypto.subtle.digest('SHA-512', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

async function updatePasswords() {
  const users = await prisma.user.findMany();

  for (const user of users) {
    const salt = await generateSalt();
    const hashedPassword = await hashPassword(user.password, salt);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        salt: salt,
      },
    });
  }

  console.log('All passwords updated successfully');
}

updatePasswords()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
