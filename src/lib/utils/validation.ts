import { z } from 'zod';

export const createProjectSchema = z.object({
  githubRepoId: z.string().min(1),
  githubRepoUrl: z.string().url(),
  repoFullName: z.string().regex(/^[\w\-\.]+\/[\w\-\.]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  yoctoVersion: z.enum(['KIRKSTONE', 'SCARTHGAP', 'STYHEAD']),
  defaultBranch: z.string().min(1),
});

export const createBranchSchema = z.object({
  name: z.string().min(1).max(100),
  autoBuild: z.boolean().default(true),
});

export const triggerBuildSchema = z.object({
  commitSha: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  yoctoVersion: z.enum(['KIRKSTONE', 'SCARTHGAP', 'STYHEAD']).optional(),
  defaultBranch: z.string().min(1).optional(),
});

