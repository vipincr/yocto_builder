import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getGitHubAccountByUserId } from '@/lib/db/queries/users';
import { GitHubClient } from '@/lib/github/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const githubAccount = await getGitHubAccountByUserId(session.user.id);
    if (!githubAccount) {
      return NextResponse.json(
        { error: 'GitHub account not linked' },
        { status: 400 }
      );
    }

    const { owner, repo } = await params;
    const githubClient = new GitHubClient(githubAccount.accessToken);
    const branches = await githubClient.getBranches(owner, repo);

    return NextResponse.json({ branches });
  } catch (error: any) {
    console.error('Error fetching branches:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

