import { prisma } from '../client';

export async function getBranchesByProjectId(projectId: string, userId: string) {
  // Verify project belongs to user
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  return prisma.branch.findMany({
    where: { projectId },
    include: {
      builds: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: {
        select: { builds: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createBranch(data: {
  projectId: string;
  name: string;
  autoBuild: boolean;
  workspacePath: string;
  sourcePath: string;
  buildPath: string;
}) {
  return prisma.branch.create({
    data,
  });
}

export async function updateBranch(
  branchId: string,
  data: {
    autoBuild?: boolean;
    lastCommitSha?: string;
    lastBuildAt?: Date;
  }
) {
  return prisma.branch.update({
    where: { id: branchId },
    data,
  });
}

export async function deleteBranch(branchId: string) {
  return prisma.branch.delete({
    where: { id: branchId },
  });
}

