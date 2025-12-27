import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getProjectsByUserId, createProject } from '@/lib/db/queries/projects';
import { createProjectSchema } from '@/lib/utils/validation';
import { WorkspaceManager } from '@/lib/build/workspace';
import { GitHubClient } from '@/lib/github/client';
import { getGitHubAccountByUserId } from '@/lib/db/queries/users';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const projects = await getProjectsByUserId(userId);
    
    const projectsSummary = projects.map((project) => ({
      id: project.id,
      name: project.name,
      githubRepoUrl: project.githubRepoUrl,
      repoFullName: project.repoFullName,
      yoctoVersion: project.yoctoVersion,
      defaultBranch: project.defaultBranch,
      branchCount: project.branches.length,
      lastBuildStatus: project.branches[0]?.builds[0]?.status || null,
      lastBuildAt: project.branches[0]?.builds[0]?.createdAt || null,
      createdAt: project.createdAt,
    }));

    return NextResponse.json({
      projects: projectsSummary,
      total: projectsSummary.length,
    });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createProjectSchema.parse(body);

    // Get GitHub account
    const userId = session.user.id;
    const githubAccount = await getGitHubAccountByUserId(userId);
    if (!githubAccount) {
      return NextResponse.json(
        { error: 'GitHub account not linked' },
        { status: 400 }
      );
    }

    // Create webhook
    const [owner, repo] = validated.repoFullName.split('/');
    const githubClient = new GitHubClient(githubAccount.accessToken);
    const webhookSecret = crypto.randomBytes(32).toString('hex');
    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/github`;
    
    const webhook = await githubClient.createWebhook(
      owner,
      repo,
      webhookUrl,
      webhookSecret
    );

    // Create project
    const project = await createProject({
      userId,
      name: validated.name,
      description: validated.description,
      githubRepoId: validated.githubRepoId,
      githubRepoUrl: validated.githubRepoUrl,
      repoFullName: validated.repoFullName,
      defaultBranch: validated.defaultBranch,
      yoctoVersion: validated.yoctoVersion,
      webhookId: webhook.id,
      webhookSecret,
    });

    // Create default branch workspace
    const workspace = new WorkspaceManager();
    const workspacePaths = await workspace.createWorkspace(
      project.name,
      validated.defaultBranch
    );

    // Create default branch
    const { createBranch } = await import('@/lib/db/queries/branches');
    await createBranch({
      projectId: project.id,
      name: validated.defaultBranch,
      autoBuild: true,
      workspacePath: workspacePaths.workspacePath,
      sourcePath: workspacePaths.sourcePath,
      buildPath: workspacePaths.buildPath,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

