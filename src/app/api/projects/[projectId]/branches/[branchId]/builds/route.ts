import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getBuildsByBranchId, createBuild, getNextBuildNumber } from '@/lib/db/queries/builds';
import { triggerBuildSchema } from '@/lib/utils/validation';
import { getBuildQueue } from '@/lib/build/queue';
import { WorkspaceManager } from '@/lib/build/workspace';
import { prisma } from '@/lib/db/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; branchId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { branchId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') as any;

    const result = await getBuildsByBranchId(branchId, { page, limit, status });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching builds:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; branchId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { branchId } = await params;
    const body = await request.json();
    const validated = triggerBuildSchema.parse(body);

    // Get branch and verify access
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        project: true,
      },
    });

    if (!branch || branch.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    // Get commit SHA
    const workspace = new WorkspaceManager();
    let commitSha = validated.commitSha;
    if (!commitSha) {
      commitSha = await workspace.getCommitSha(branch.sourcePath);
    }

    const commitMessage = await workspace.getCommitMessage(branch.sourcePath, commitSha);

    // Create build
    const buildNumber = await getNextBuildNumber(branchId);
    const build = await createBuild({
      branchId,
      buildNumber,
      commitSha,
      commitMessage,
      status: 'QUEUED',
      triggeredBy: 'MANUAL',
    });

    // Enqueue build
    const queue = getBuildQueue();
    await queue.enqueue(build.id);

    return NextResponse.json(
      {
        buildId: build.id,
        buildNumber: build.buildNumber,
        status: build.status,
        message: 'Build queued successfully',
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('Error triggering build:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

