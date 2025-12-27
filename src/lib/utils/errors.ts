export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class BuildError extends Error {
  constructor(
    message: string,
    public buildId?: string,
    public errorType?: string
  ) {
    super(message);
    this.name = 'BuildError';
  }
}

export class DockerError extends Error {
  constructor(
    message: string,
    public containerId?: string
  ) {
    super(message);
    this.name = 'DockerError';
  }
}

