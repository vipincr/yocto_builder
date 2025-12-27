import { prisma } from '../client';

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      gitHubAccount: true,
      projects: {
        include: {
          branches: {
            include: {
              builds: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function createGitHubAccount(data: {
  userId: string;
  githubId: string;
  username: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  scopes: string[];
}) {
  return prisma.gitHubAccount.upsert({
    where: { userId: data.userId },
    create: data,
    update: data,
  });
}

export async function getGitHubAccountByUserId(userId: string) {
  return prisma.gitHubAccount.findUnique({
    where: { userId },
  });
}

