import { NextRequest, NextResponse } from 'next/server';
import { verifyGitHubWebhook, GitHubWebhookPayload } from '@/lib/github/webhooks';
import { prisma } from '@/lib/db/client';
import { getBuildQueue } from '@/lib/build/queue';
import { createBuild, getNextBuildNumber } from '@/lib/db/queries/builds';
import { WorkspaceManager } from '@/lib/build/workspace';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-hub-signature-256') || '';
    const event = request.headers.get('x-github-event');
    const deliveryId = request.headers.get('x-github-delivery');

    if (event !== 'push') {
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
    }

    const payload = await request.text();
    const payloadJson: GitHubWebhookPayload = JSON.parse(payload);

    // Find project by repository
    const [owner, repo] = payloadJson.repository.full_name.split('/');
    const project = await prisma.project.findFirst({
      where: {
        githubRepoId: String(payloadJson.repository.id),
      },
      include: {
        branches: true,
      },
    });

    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    // Verify signature
    if (!verifyGitHubWebhook(payload, signature, project.webhookSecret || '')) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Find branch
    const branchName = payloadJson.ref.replace('refs/heads/', '');
    const branch = project.branches.find((b) => b.name === branchName);

    if (!branch) {
      return NextResponse.json({ message: 'Branch not configured' }, { status: 200 });
    }

    // Check auto-build
    if (!branch.autoBuild) {
      return NextResponse.json({ message: 'Auto-build disabled' }, { status: 200 });
    }

    // Check for .nobuild file
    const workspace = new WorkspaceManager();
    const hasNoBuild = await workspace.checkNoBuildFile(
      branch.sourcePath,
      payloadJson.head_commit?.id
    );

    if (hasNoBuild) {
      return NextResponse.json({ message: '.nobuild file present' }, { status: 200 });
    }

    // Get commit info
    const commitSha = payloadJson.head_commit?.id || payloadJson.commits[0]?.id;
    if (!commitSha) {
      return NextResponse.json({ message: 'No commit found' }, { status: 200 });
    }

    // Check if this commit was already built
    const existingBuild = await prisma.build.findFirst({
      where: {
        branchId: branch.id,
        commitSha,
      },
    });

    if (existingBuild) {
      return NextResponse.json({ message: 'Build already exists' }, { status: 200 });
    }

    // Create build
    const buildNumber = await getNextBuildNumber(branch.id);
    const build = await createBuild({
      branchId: branch.id,
      buildNumber,
      commitSha,
      commitMessage: payloadJson.head_commit?.message || payloadJson.commits[0]?.message,
      status: 'QUEUED',
      triggeredBy: 'WEBHOOK',
    });

    // Enqueue build
    const queue = getBuildQueue();
    await queue.enqueue(build.id);

    return NextResponse.json({ message: 'Build queued', buildId: build.id }, { status: 202 });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

