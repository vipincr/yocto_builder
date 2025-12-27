'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LinkGitHubPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLinkGitHub = async () => {
    setLoading(true);
    // Redirect to GitHub OAuth
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/github/callback`;
    const scope = 'repo,read:org';
    const state = crypto.randomUUID();

    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="w-full max-w-md rounded-lg bg-white/10 p-8 backdrop-blur-md shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Link GitHub Account</h1>
          <p className="text-gray-300">Connect your GitHub account to access repositories</p>
        </div>

        <div className="mb-6 space-y-3 text-sm text-gray-300">
          <p className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Access your repositories
          </p>
          <p className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Set up automatic builds on push
          </p>
          <p className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Manage webhooks for your projects
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleLinkGitHub}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-lg bg-gray-800 px-4 py-3 text-white font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            {loading ? 'Connecting...' : 'Connect GitHub Account'}
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full rounded-lg border border-gray-600 px-4 py-3 text-gray-300 font-medium hover:bg-gray-800 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

