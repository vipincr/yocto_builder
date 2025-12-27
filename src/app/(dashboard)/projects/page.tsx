import { getServerSession } from '@/lib/auth/session';
import { getProjectsByUserId } from '@/lib/db/queries/projects';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return null;
  }

  const projects = await getProjectsByUserId(session.user.id);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
        <Link
          href="/projects/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          New Project
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="block rounded-lg bg-white dark:bg-gray-800 p-6 shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {project.name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {project.repoFullName}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {project.branches.length} branch{project.branches.length !== 1 ? 'es' : ''}
              </span>
              <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {project.yoctoVersion}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

