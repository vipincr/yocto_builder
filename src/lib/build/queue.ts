import { prisma } from '@/lib/db/client';
import { BuildExecutor, BuildExecutorOptions } from './executor';
import { WorkspaceManager } from './workspace';
import { BuildStatus, BuildTrigger } from '@/types/build';
import path from 'path';

export class BuildQueue {
  private executor: BuildExecutor;
  private workspace: WorkspaceManager;
  private processing: Set<string> = new Set();
  private maxConcurrentBuilds: number;

  constructor(maxConcurrentBuilds: number = 2) {
    this.executor = new BuildExecutor();
    this.workspace = new WorkspaceManager();
    this.maxConcurrentBuilds = maxConcurrentBuilds;
  }

  async enqueue(buildId: string): Promise<void> {
    await prisma.buildJob.create({
      data: {
        id: buildId,
        buildId,
        status: 'WAITING',
        priority: 0,
      },
    });
  }

  async processQueue(): Promise<void> {
    // Get waiting jobs, ordered by priority and creation time
    const waitingJobs = await prisma.buildJob.findMany({
      where: {
        status: 'WAITING',
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: this.maxConcurrentBuilds - this.processing.size,
    });

    for (const job of waitingJobs) {
      if (this.processing.size >= this.maxConcurrentBuilds) {
        break;
      }

      this.processJob(job.buildId).catch((error) => {
        console.error(`Error processing job ${job.buildId}:`, error);
      });
    }
  }

  private async processJob(buildId: string): Promise<void> {
    if (this.processing.has(buildId)) {
      return;
    }

    this.processing.add(buildId);

    try {
      // Lock the job
      await prisma.buildJob.update({
        where: { buildId },
        data: {
          status: 'PROCESSING',
          lockedAt: new Date(),
          lockedBy: process.env.WORKER_ID || 'default',
        },
      });

      // Get build details
      const build = await prisma.build.findUnique({
        where: { id: buildId },
        include: {
          branch: {
            include: {
              project: true,
            },
          },
        },
      });

      if (!build) {
        throw new Error(`Build ${buildId} not found`);
      }

      // Update build status
      await prisma.build.update({
        where: { id: buildId },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      // Create workspace if needed
      const workspace = await this.workspace.createWorkspace(
        build.branch.project.name,
        build.branch.name
      );

      // Update branch paths if not set
      if (!build.branch.workspacePath) {
        await prisma.branch.update({
          where: { id: build.branch.id },
          data: {
            workspacePath: workspace.workspacePath,
            sourcePath: workspace.sourcePath,
            buildPath: workspace.buildPath,
          },
        });
      }

      // Create log file path
      const logsDir = process.env.LOGS_DIRECTORY || './logs';
      const logPath = path.join(logsDir, `${buildId}.log`);

      // Execute build
      const executorOptions: BuildExecutorOptions = {
        buildId,
        branchId: build.branchId,
        projectId: build.branch.projectId,
        repoUrl: build.branch.project.githubRepoUrl,
        branch: build.branch.name,
        commitSha: build.commitSha,
        yoctoVersion: build.branch.project.yoctoVersion,
        workspacePath: workspace.workspacePath,
        sourcePath: workspace.sourcePath,
        buildPath: workspace.buildPath,
        logPath,
      };

      const result = await this.executor.execute(executorOptions);

      // Update build with result
      await prisma.build.update({
        where: { id: buildId },
        data: {
          status: result.status,
          finishedAt: new Date(),
          duration: result.duration,
          errorSummary: result.errorSummary,
          logPath,
        },
      });

      // Update job status
      await prisma.buildJob.update({
        where: { buildId },
        data: {
          status: result.status === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
        },
      });

      // Update branch last build info
      await prisma.branch.update({
        where: { id: build.branchId },
        data: {
          lastBuildAt: new Date(),
          lastCommitSha: build.commitSha,
        },
      });
    } catch (error: any) {
      // Mark build as failed
      await prisma.build.update({
        where: { id: buildId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
        },
      });

      await prisma.buildJob.update({
        where: { buildId },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });
    } finally {
      this.processing.delete(buildId);
    }
  }

  async cancel(buildId: string): Promise<void> {
    const build = await prisma.build.findUnique({
      where: { id: buildId },
    });

    if (!build) {
      throw new Error(`Build ${buildId} not found`);
    }

    if (build.status !== 'RUNNING' && build.status !== 'QUEUED') {
      throw new Error(`Cannot cancel build in status: ${build.status}`);
    }

    // If currently processing, cancel the executor
    if (this.processing.has(buildId)) {
      await this.executor.cancel();
    }

    await prisma.build.update({
      where: { id: buildId },
      data: {
        status: 'CANCELLED',
        finishedAt: new Date(),
      },
    });

    await prisma.buildJob.update({
      where: { buildId },
      data: {
        status: 'FAILED',
        error: 'Cancelled by user',
      },
    });

    this.processing.delete(buildId);
  }

  startProcessing(intervalMs: number = 5000): void {
    setInterval(() => {
      this.processQueue().catch(console.error);
    }, intervalMs);
  }
}

// Singleton instance
let buildQueueInstance: BuildQueue | null = null;

export function getBuildQueue(): BuildQueue {
  if (!buildQueueInstance) {
    buildQueueInstance = new BuildQueue();
    buildQueueInstance.startProcessing();
  }
  return buildQueueInstance;
}

