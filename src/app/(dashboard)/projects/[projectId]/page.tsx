import { getServerSession } from '@/lib/auth/session';
import { getProjectById } from '@/lib/db/queries/projects';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return null;
  }

  const { projectId } = await params;
  const project = await getProjectById(projectId, session.user.id);

  if (!project) {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/projects"
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to projects
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {project.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">{project.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Branches
            </h2>
            <div className="space-y-3">
              {project.branches.map((branch) => (
                <div
                  key={branch.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {branch.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {branch.builds.length} build{branch.builds.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Link
                    href={`/projects/${projectId}/branches/${branch.id}`}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    View →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Details
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Repository</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  <a
                    href={project.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {project.repoFullName}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Yocto Version</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {project.yoctoVersion}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Default Branch</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {project.defaultBranch}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

