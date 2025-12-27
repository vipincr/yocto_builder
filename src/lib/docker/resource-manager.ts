export interface ContainerResourceLimits {
  cpus: number;
  memory: string;
  memorySwap: string;
  storage: string;
}

export const DEFAULT_BUILD_RESOURCES: ContainerResourceLimits = {
  cpus: parseInt(process.env.BUILD_CONTAINER_CPUS || '6', 10),
  memory: process.env.BUILD_CONTAINER_MEMORY || '28g',
  memorySwap: '32g',
  storage: '500g',
};

export const MINIMUM_BUILD_RESOURCES: ContainerResourceLimits = {
  cpus: 4,
  memory: '16g',
  memorySwap: '20g',
  storage: '200g',
};

export function createContainerConfig(
  imageName: string,
  workspacePath: string,
  resources: ContainerResourceLimits = DEFAULT_BUILD_RESOURCES
) {
  return {
    Image: imageName,
    Tty: true,
    OpenStdin: true,
    HostConfig: {
      Binds: [
        `${workspacePath}/source:/workspace/source:rw`,
        `${workspacePath}/build:/workspace/build:rw`,
      ],
      NanoCpus: resources.cpus * 1e9,
      Memory: parseMemoryLimit(resources.memory),
      MemorySwap: parseMemoryLimit(resources.memorySwap),
      AutoRemove: false,
      NetworkMode: 'bridge',
    },
    Env: [
      'TERM=xterm-256color',
      `BB_NUMBER_THREADS=${resources.cpus}`,
      `PARALLEL_MAKE=-j${resources.cpus}`,
    ],
  };
}

function parseMemoryLimit(memory: string): number {
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

