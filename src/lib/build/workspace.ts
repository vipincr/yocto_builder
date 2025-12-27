import fs from 'fs/promises';
import path from 'path';
import simpleGit from 'simple-git';

export class WorkspaceManager {
  private buildsDir: string;

  constructor(buildsDir: string = process.env.BUILDS_DIRECTORY || './builds') {
    this.buildsDir = path.resolve(buildsDir);
  }

  async createWorkspace(projectName: string, branchName: string): Promise<{
    workspacePath: string;
    sourcePath: string;
    buildPath: string;
  }> {
    const workspaceName = `${projectName}_${branchName}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const workspacePath = path.join(this.buildsDir, workspaceName);
    const sourcePath = path.join(workspacePath, 'source');
    const buildPath = path.join(workspacePath, 'build');

    await fs.mkdir(workspacePath, { recursive: true });
    await fs.mkdir(sourcePath, { recursive: true });
    await fs.mkdir(buildPath, { recursive: true });

    return { workspacePath, sourcePath, buildPath };
  }

  async cloneRepository(
    repoUrl: string,
    branch: string,
    targetPath: string
  ): Promise<void> {
    const git = simpleGit();
    
    // Check if already cloned
    const gitDir = path.join(targetPath, '.git');
    try {
      await fs.access(gitDir);
      // Repository exists, fetch and checkout
      await simpleGit(targetPath).fetch('origin', branch);
      await simpleGit(targetPath).checkout(branch);
      await simpleGit(targetPath).pull('origin', branch);
    } catch {
      // Clone fresh
      await git.clone(repoUrl, targetPath, ['--branch', branch, '--single-branch']);
    }
  }

  async checkNoBuildFile(repoPath: string, commitSha?: string): Promise<boolean> {
    const noBuildPath = path.join(repoPath, '.nobuild');
    try {
      await fs.access(noBuildPath);
      return true;
    } catch {
      return false;
    }
  }

  async getCommitSha(repoPath: string, ref: string = 'HEAD'): Promise<string> {
    const git = simpleGit(repoPath);
    return (await git.revparse([ref])).trim();
  }

  async getCommitMessage(repoPath: string, commitSha: string): Promise<string> {
    const git = simpleGit(repoPath);
    const log = await git.log({ from: commitSha, to: commitSha, maxCount: 1 });
    return log.latest?.message || '';
  }

  async cleanBuildDirectory(
    buildPath: string,
    cleanType: 'build' | 'all' | 'sstate' | 'downloads' = 'build'
  ): Promise<{ freedSpace: string }> {
    const pathsToClean: string[] = [];

    switch (cleanType) {
      case 'build':
        pathsToClean.push(path.join(buildPath, 'tmp'));
        pathsToClean.push(path.join(buildPath, 'cache'));
        break;
      case 'sstate':
        pathsToClean.push(path.join(buildPath, 'sstate-cache'));
        break;
      case 'downloads':
        pathsToClean.push(path.join(buildPath, 'downloads'));
        break;
      case 'all':
        // Keep source, remove everything else
        const parentDir = path.dirname(buildPath);
        const sourcePath = path.join(parentDir, 'source');
        // This is destructive, so we'll be careful
        pathsToClean.push(buildPath);
        break;
    }

    let totalSize = 0;
    for (const cleanPath of pathsToClean) {
      try {
        const stats = await this.getDirectorySize(cleanPath);
        totalSize += stats;
        await fs.rm(cleanPath, { recursive: true, force: true });
      } catch (error) {
        // Ignore errors for non-existent paths
      }
    }

    return {
      freedSpace: this.formatBytes(totalSize),
    };
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    } catch {
      // Ignore errors
    }
    return totalSize;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

