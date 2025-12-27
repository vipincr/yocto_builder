import { YoctoVersion } from './build';

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  defaultBranch: string;
  private: boolean;
  stars?: number;
}

export interface GitHubBranch {
  name: string;
  sha: string;
  protected?: boolean;
}

export interface ProjectConfig {
  yoctoVersion: YoctoVersion;
  buildConfig?: Record<string, unknown>;
}

