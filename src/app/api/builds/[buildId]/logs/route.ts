import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getBuildById } from '@/lib/db/queries/builds';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
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

    if (!build.logPath) {
      return NextResponse.json({
        logs: '',
        totalLines: 0,
        offset: 0,
        hasMore: false,
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '1000', 10);

    // Read log file
    const logContent = await fs.readFile(build.logPath, 'utf-8');
    const lines = logContent.split('\n');
    const totalLines = lines.length;
    const requestedLines = lines.slice(offset, offset + limit);
    const hasMore = offset + limit < totalLines;

    return NextResponse.json({
      logs: requestedLines.join('\n'),
      totalLines,
      offset,
      hasMore,
    });
  } catch (error: any) {
    console.error('Error fetching build logs:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

