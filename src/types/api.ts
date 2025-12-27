import { BuildStatus, BuildTrigger, YoctoVersion } from './build';

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}

export interface ProjectsResponse {
  projects: ProjectSummary[];
  total: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  githubRepoUrl: string;
  repoFullName: string;
  yoctoVersion: YoctoVersion;
  defaultBranch: string;
  branchCount: number;
  lastBuildStatus: BuildStatus | null;
  lastBuildAt: string | null;
  createdAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  description: string | null;
  githubRepoId: string;
  webhookId: string | null;
  buildConfig: Record<string, unknown> | null;
  branches: BranchSummary[];
}

export interface BranchSummary {
  id: string;
  name: string;
  autoBuild: boolean;
  lastCommitSha: string | null;
  lastBuildAt: string | null;
  lastBuildStatus: BuildStatus | null;
  buildCount: number;
}

export interface BuildsResponse {
  builds: BuildSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface BuildSummary {
  id: string;
  buildNumber: number;
  commitSha: string;
  commitMessage: string | null;
  status: BuildStatus;
  triggeredBy: BuildTrigger;
  startedAt: string | null;
  finishedAt: string | null;
  duration: number | null;
}

export interface CreateProjectRequest {
  githubRepoId: string;
  githubRepoUrl: string;
  repoFullName: string;
  name: string;
  description?: string;
  yoctoVersion: YoctoVersion;
  defaultBranch: string;
}

export interface CreateBranchRequest {
  name: string;
  autoBuild: boolean;
}

export interface TriggerBuildRequest {
  commitSha?: string;
}

