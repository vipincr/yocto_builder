import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getGitHubAccountByUserId } from '@/lib/db/queries/users';
import { GitHubClient } from '@/lib/github/client';

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '30', 10);
    const search = searchParams.get('search') || undefined;

    const githubClient = new GitHubClient(githubAccount.accessToken);
    const result = await githubClient.getRepositories(page, perPage, search);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching GitHub repos:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

