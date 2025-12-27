import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getBuildById } from '@/lib/db/queries/builds';
import { createBuild, getNextBuildNumber } from '@/lib/db/queries/builds';
import { getBuildQueue } from '@/lib/build/queue';
import { prisma } from '@/lib/db/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ buildId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { buildId } = await params;
    const originalBuild = await getBuildById(buildId);

    if (!originalBuild) {
      return NextResponse.json({ error: 'Build not found' }, { status: 404 });
    }

    if (originalBuild.branch.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create new build
    const buildNumber = await getNextBuildNumber(originalBuild.branchId);
    const newBuild = await createBuild({
      branchId: originalBuild.branchId,
      buildNumber,
      commitSha: originalBuild.commitSha,
      commitMessage: originalBuild.commitMessage || undefined,
      status: 'QUEUED',
      triggeredBy: 'RETRY',
    });

    // Enqueue build
    const queue = getBuildQueue();
    await queue.enqueue(newBuild.id);

    return NextResponse.json(
      {
        newBuildId: newBuild.id,
        buildNumber: newBuild.buildNumber,
        status: newBuild.status,
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('Error retrying build:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

