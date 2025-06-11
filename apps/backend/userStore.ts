import { prisma } from './prismaClient';

export async function findAuthByEmail(email: string) {
  return prisma.auth.findUnique({ where: { email } });
}

export async function addAuthAndUser(email: string, passwordHash: string) {
  // Create user first, then auth
  const user = await prisma.user.create({ data: {} });
  const auth = await prisma.auth.create({ data: { email, passwordHash, userId: user.id } });
  return { user, auth };
}
