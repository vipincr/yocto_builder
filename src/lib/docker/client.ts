import Docker from 'dockerode';
import { ContainerResourceLimits } from './resource-manager';

export class DockerClient {
  private docker: Docker;

  constructor() {
    const socketPath = process.env.DOCKER_HOST?.replace('unix://', '') || '/var/run/docker.sock';
    this.docker = new Docker({
      socketPath,
    });
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  async createContainer(
    imageName: string,
    workspacePath: string,
    resources: ContainerResourceLimits
  ): Promise<Docker.Container> {
    const containerConfig = {
      Image: imageName,
      Tty: true,
      OpenStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        Binds: [
          `${workspacePath}/source:/workspace/source:rw`,
          `${workspacePath}/build:/workspace/build:rw`,
        ],
        NanoCpus: resources.cpus * 1e9,
        Memory: this.parseMemoryLimit(resources.memory),
        MemorySwap: this.parseMemoryLimit(resources.memorySwap),
        AutoRemove: false,
        NetworkMode: 'bridge',
      },
      Env: [
        'TERM=xterm-256color',
        `BB_NUMBER_THREADS=${resources.cpus}`,
        `PARALLEL_MAKE=-j${resources.cpus}`,
      ],
    };

    return this.docker.createContainer(containerConfig);
  }

  async startContainer(container: Docker.Container): Promise<void> {
    await container.start();
  }

  async stopContainer(container: Docker.Container): Promise<void> {
    await container.stop();
  }

  async removeContainer(container: Docker.Container): Promise<void> {
    await container.remove();
  }

  async getContainer(containerId: string): Promise<Docker.Container> {
    return this.docker.getContainer(containerId);
  }

  async execInContainer(
    container: Docker.Container,
    command: string[],
    options: Docker.ExecCreateOptions = {}
  ): Promise<NodeJS.ReadWriteStream> {
    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
      ...options,
    });

    return exec.start({
      hijack: true,
      stdin: false,
    });
  }

  async attachToContainer(
    container: Docker.Container
  ): Promise<NodeJS.ReadWriteStream> {
    return container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });
  }

  async inspectContainer(container: Docker.Container): Promise<Docker.ContainerInspectInfo> {
    return container.inspect();
  }

  private parseMemoryLimit(memory: string): number {
    const units: Record<string, number> = {
      'k': 1024,
      'm': 1024 * 1024,
      'g': 1024 * 1024 * 1024,
    };

    const match = memory.match(/^(\d+)([kmg])?$/i);
    if (!match) {
      throw new Error(`Invalid memory format: ${memory}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2]?.toLowerCase() || 'b';
    const multiplier = units[unit] || 1;

    return value * multiplier;
  }
}

