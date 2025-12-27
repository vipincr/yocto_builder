import { prisma } from '../client';
import { BuildStatus, BuildTrigger } from '@/types/build';

export async function getBuildsByBranchId(
  branchId: string,
  options: {
    page?: number;
    limit?: number;
    status?: BuildStatus;
  } = {}
) {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = { branchId };
  if (options.status) {
    where.status = options.status;
  }

  const [builds, total] = await Promise.all([
    prisma.build.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.build.count({ where }),
  ]);

  return {
    builds,
    total,
    page,
    limit,
  };
}

export async function getBuildById(buildId: string) {
  return prisma.build.findUnique({
    where: { id: buildId },
    include: {
      branch: {
        include: {
          project: true,
        },
      },
    },
  });
}

export async function createBuild(data: {
  branchId: string;
  buildNumber: number;
  commitSha: string;
  commitMessage?: string;
  status: BuildStatus;
  triggeredBy: BuildTrigger;
}) {
  return prisma.build.create({
    data,
  });
}

export async function updateBuild(
  buildId: string,
  data: {
    status?: BuildStatus;
    logPath?: string;
    errorSummary?: any;
    artifactsPath?: string;
    containerId?: string;
    startedAt?: Date;
    finishedAt?: Date;
    duration?: number;
  }
) {
  return prisma.build.update({
    where: { id: buildId },
    data,
  });
}

export async function getNextBuildNumber(branchId: string): Promise<number> {
  const lastBuild = await prisma.build.findFirst({
    where: { branchId },
    orderBy: { buildNumber: 'desc' },
    select: { buildNumber: true },
  });

  return (lastBuild?.buildNumber || 0) + 1;
}

