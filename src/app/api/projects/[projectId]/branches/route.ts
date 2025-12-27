import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getBranchesByProjectId, createBranch } from '@/lib/db/queries/branches';
import { createBranchSchema } from '@/lib/utils/validation';
import { WorkspaceManager } from '@/lib/build/workspace';
import { getProjectById } from '@/lib/db/queries/projects';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const branches = await getBranchesByProjectId(projectId, session.user.id);

    const branchesSummary = branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      autoBuild: branch.autoBuild,
      lastCommitSha: branch.lastCommitSha,
      lastBuildAt: branch.lastBuildAt,
      lastBuildStatus: branch.builds[0]?.status || null,
      buildCount: branch._count.builds,
    }));

    return NextResponse.json({ branches: branchesSummary });
  } catch (error: any) {
    console.error('Error fetching branches:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await request.json();
    const validated = createBranchSchema.parse(body);

    // Verify project belongs to user
    const project = await getProjectById(projectId, session.user.id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create workspace
    const workspace = new WorkspaceManager();
    const workspacePaths = await workspace.createWorkspace(
      project.name,
      validated.name
    );

    // Create branch
    const branch = await createBranch({
      projectId,
      name: validated.name,
      autoBuild: validated.autoBuild,
      workspacePath: workspacePaths.workspacePath,
      sourcePath: workspacePaths.sourcePath,
      buildPath: workspacePaths.buildPath,
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error: any) {
    console.error('Error creating branch:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

