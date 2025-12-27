import { DockerClient } from '@/lib/docker/client';
import { DEFAULT_BUILD_RESOURCES } from '@/lib/docker/resource-manager';
import { WorkspaceManager } from './workspace';
import { parseLogLine, extractErrorSummary } from './log-parser';
import { BuildLogEvent, BuildProgressEvent } from '@/types/build';
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

export interface BuildExecutorOptions {
  buildId: string;
  branchId: string;
  projectId: string;
  repoUrl: string;
  branch: string;
  commitSha: string;
  yoctoVersion: 'KIRKSTONE' | 'SCARTHGAP' | 'STYHEAD';
  workspacePath: string;
  sourcePath: string;
  buildPath: string;
  logPath: string;
  onLog?: (event: BuildLogEvent) => void;
  onProgress?: (event: BuildProgressEvent) => void;
}

export class BuildExecutor extends EventEmitter {
  private docker: DockerClient;
  private workspace: WorkspaceManager;
  private container: any;
  private logFile: fs.FileHandle | null = null;
  private logs: string[] = [];

  constructor() {
    super();
    this.docker = new DockerClient();
    this.workspace = new WorkspaceManager();
  }

  async execute(options: BuildExecutorOptions): Promise<{
    status: 'SUCCESS' | 'FAILED';
    duration: number;
    errorSummary?: any;
  }> {
    const startTime = Date.now();
    let container: any = null;

    try {
      // Open log file
      this.logFile = await fs.open(options.logPath, 'w');

      // Get Poky image name
      const imageName = this.getPokyImageName(options.yoctoVersion);

      // Create container
      container = await this.docker.createContainer(
        imageName,
        options.workspacePath,
        DEFAULT_BUILD_RESOURCES
      );
      this.container = container;

      // Emit started event
      this.emitProgress(options, 'CLONE', 'Cloning repository...');

      // Clone repository if needed
      await this.workspace.cloneRepository(
        options.repoUrl,
        options.branch,
        options.sourcePath
      );

      // Checkout specific commit if provided
      if (options.commitSha) {
        const simpleGit = require('simple-git');
        const git = simpleGit(options.sourcePath);
        await git.checkout(options.commitSha);
      }

      // Start container
      await this.docker.startContainer(container);
      this.emitProgress(options, 'INIT', 'Initializing build environment...');

      // Setup build environment
      await this.setupBuildEnvironment(options);

      // Run bitbake
      this.emitProgress(options, 'BUILD', 'Starting bitbake build...');
      const exitCode = await this.runBitbake(options, container);

      const duration = Math.floor((Date.now() - startTime) / 1000);

      if (exitCode === 0) {
        this.emitProgress(options, 'IMAGE', 'Build completed successfully', 100);
        return {
          status: 'SUCCESS',
          duration,
        };
      } else {
        const errorSummary = extractErrorSummary(this.logs);
        this.emitProgress(options, 'BUILD', 'Build failed', undefined);
        return {
          status: 'FAILED',
          duration,
          errorSummary,
        };
      }
    } catch (error: any) {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      const errorSummary = extractErrorSummary(this.logs);
      
      this.emit('error', error);
      return {
        status: 'FAILED',
        duration,
        errorSummary,
      };
    } finally {
      // Cleanup
      if (container) {
        try {
          await this.docker.stopContainer(container);
        } catch {
          // Ignore stop errors
        }
      }
      if (this.logFile) {
        await this.logFile.close();
      }
    }
  }

  async cancel(): Promise<void> {
    if (this.container) {
      await this.docker.stopContainer(this.container);
    }
  }

  private async setupBuildEnvironment(options: BuildExecutorOptions): Promise<void> {
    // This would set up the bitbake environment
    // For now, we'll assume the container has the environment pre-configured
    // In a real implementation, you'd run: source oe-init-build-env
  }

  private async runBitbake(
    options: BuildExecutorOptions,
    container: any
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const command = [
        'bash',
        '-c',
        `cd /workspace/source && source oe-init-build-env /workspace/build && bitbake core-image-minimal 2>&1`,
      ];

      const stream = container.attach({
        stream: true,
        stdout: true,
        stderr: true,
      });

      let lineNumber = 0;
      let buffer = '';

      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          lineNumber++;
          this.logs.push(line);
          this.writeLog(line);
          
          const parsed = parseLogLine(line);
          const logEvent: BuildLogEvent = {
            buildId: options.buildId,
            line,
            lineNumber,
            stream: parsed.isError ? 'stderr' : 'stdout',
            timestamp: new Date().toISOString(),
            isError: parsed.isError,
            errorType: parsed.errorType,
          };

          if (options.onLog) {
            options.onLog(logEvent);
          }
          this.emit('log', logEvent);

          // Detect build phases
          if (line.includes('Loading cache')) {
            this.emitProgress(options, 'PARSE', 'Parsing recipes...');
          } else if (line.includes('NOTE: Executing Tasks')) {
            this.emitProgress(options, 'BUILD', 'Building packages...');
          } else if (line.includes('do_package')) {
            this.emitProgress(options, 'PACKAGE', 'Packaging...');
          } else if (line.includes('do_image')) {
            this.emitProgress(options, 'IMAGE', 'Creating image...');
          }
        }
      });

      stream.on('end', () => {
        resolve(0); // We'll check exit code from container inspect
      });

      stream.on('error', (error: Error) => {
        reject(error);
      });

      // Execute the command
      container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
      }, (err: Error, exec: any) => {
        if (err) {
          reject(err);
          return;
        }

        exec.start({ hijack: true, stdin: false }, (execErr: Error, stream: any) => {
          if (execErr) {
            reject(execErr);
            return;
          }
          // Stream handling is done above
        });
      });
    });
  }

  private emitProgress(
    options: BuildExecutorOptions,
    phase: BuildProgressEvent['phase'],
    message: string,
    progress?: number
  ): void {
    const event: BuildProgressEvent = {
      buildId: options.buildId,
      phase,
      message,
      progress,
      timestamp: new Date().toISOString(),
    };

    if (options.onProgress) {
      options.onProgress(event);
    }
    this.emit('progress', event);
  }

  private async writeLog(line: string): Promise<void> {
    if (this.logFile) {
      await this.logFile.write(line + '\n');
    }
  }

  private getPokyImageName(version: 'KIRKSTONE' | 'SCARTHGAP' | 'STYHEAD'): string {
    const images: Record<string, string> = {
      KIRKSTONE: process.env.POKY_IMAGE_KIRKSTONE || 'yocto-builder/poky-kirkstone:4.0',
      SCARTHGAP: process.env.POKY_IMAGE_SCARTHGAP || 'yocto-builder/poky-scarthgap:5.0',
      STYHEAD: 'yocto-builder/poky-styhead:5.1',
    };
    return images[version] || images.SCARTHGAP;
  }
}

