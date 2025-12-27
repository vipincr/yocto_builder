import { prisma } from '../client';
import { YoctoVersion } from '@/types/build';

export async function getProjectsByUserId(userId: string) {
  return prisma.project.findMany({
    where: { userId },
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
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProjectById(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include: {
      branches: {
        include: {
          builds: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      },
    },
  });
}

export async function createProject(data: {
  userId: string;
  name: string;
  description?: string;
  githubRepoId: string;
  githubRepoUrl: string;
  repoFullName: string;
  defaultBranch: string;
  yoctoVersion: YoctoVersion;
  webhookId?: string;
  webhookSecret?: string;
}) {
  return prisma.project.create({
    data,
  });
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: {
    name?: string;
    description?: string | null;
    yoctoVersion?: YoctoVersion;
    defaultBranch?: string;
    buildConfig?: any;
  }
) {
  return prisma.project.updateMany({
    where: {
      id: projectId,
      userId,
    },
    data,
  });
}

export async function deleteProject(projectId: string, userId: string) {
  return prisma.project.deleteMany({
    where: {
      id: projectId,
      userId,
    },
  });
}

