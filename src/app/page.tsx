import Link from 'next/link';
import { existsSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

async function checkEnvExists() {
  try {
    const envPath = join(process.cwd(), '.env');
    return existsSync(envPath);
  } catch {
    return true; // Assume exists if we can't check
  }
}

export default async function Home() {
  const envExists = await checkEnvExists();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="text-2xl font-bold text-white">YoctoBuilder</div>
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Build Yocto Linux
          <span className="block text-blue-400">Like Never Before</span>
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Self-hosted CI/CD platform for Yocto Linux builds. Automate your builds, 
          monitor progress in real-time, and deploy with confidence.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-8 py-4 text-white font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-gray-700 px-8 py-4 text-white font-semibold text-lg hover:bg-gray-600 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Powerful Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <div className="text-blue-400 text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-white mb-2">Real-time Build Monitoring</h3>
            <p className="text-gray-300">
              Watch your builds progress in real-time with live console output. 
              Get instant notifications when builds complete or fail.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <div className="text-blue-400 text-4xl mb-4">🔄</div>
            <h3 className="text-xl font-semibold text-white mb-2">Automated Builds</h3>
            <p className="text-gray-300">
              Automatically trigger builds on every push to your repository. 
              Skip builds with .nobuild file when needed.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <div className="text-blue-400 text-4xl mb-4">🐳</div>
            <h3 className="text-xl font-semibold text-white mb-2">Docker-Powered</h3>
            <p className="text-gray-300">
              Isolated build environments using Docker. Support for multiple 
              Yocto versions (Kirkstone, Scarthgap, Styhead).
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <div className="text-blue-400 text-4xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-white mb-2">Persistent Artifacts</h3>
            <p className="text-gray-300">
              Build artifacts are never cleared automatically. Keep your build 
              history and artifacts safe until you decide to clean them.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <div className="text-blue-400 text-4xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold text-white mb-2">GitHub Integration</h3>
            <p className="text-gray-300">
              Seamlessly connect your GitHub repositories. Manage branches, 
              webhooks, and builds all in one place.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <div className="text-blue-400 text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-white mb-2">Self-Hosted</h3>
            <p className="text-gray-300">
              Full control over your infrastructure. Deploy on AWS, GCP, 
              or your own servers with our Ansible playbooks.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-12 border border-white/20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Build?
          </h2>
          <p className="text-gray-300 mb-8 text-lg">
            Start building your Yocto Linux images with ease. Connect your repository 
            and let us handle the rest.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-blue-600 px-8 py-4 text-white font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            Sign Up Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-white/10">
        <div className="text-center text-gray-400">
          <p>
            &copy; 2025 <span className="font-semibold">YoctoBuilder</span> by{' '}
            <a
              href="https://gramini.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Gramini Labs
            </a>
            . Self-hosted CI/CD for Yocto Linux.
          </p>
          {!envExists && (
            <p className="mt-2 text-xs">
              <Link href="/setup" className="text-gray-500 hover:text-gray-400 underline">
                Initial Setup
              </Link>
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
