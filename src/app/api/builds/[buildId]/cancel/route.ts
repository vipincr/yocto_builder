import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getBuildById } from '@/lib/db/queries/builds';
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
    const build = await getBuildById(buildId);

    if (!build) {
      return NextResponse.json({ error: 'Build not found' }, { status: 404 });
    }

    if (build.branch.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const queue = getBuildQueue();
    await queue.cancel(buildId);

    return NextResponse.json({ status: 'CANCELLED' });
  } catch (error: any) {
    console.error('Error cancelling build:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

