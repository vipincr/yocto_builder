'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface SetupFormData {
  // Database
  dbType: 'local' | 'remote';
  dbHost: string;
  dbPort: string;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbGenerated?: { username: string; password: string; database: string };
  
  // NextAuth
  nextauthUrl: string;
  nextauthSecret: string;
  
  // OAuth
  githubClientId: string;
  githubClientSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  
  // Application
  buildsDirectory: string;
  logsDirectory: string;
  buildContainerCpus: string;
  buildContainerMemory: string;
  
  // Admin
  adminUsername: string;
  adminPassword: string;
  adminPasswordConfirm: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  
  const [formData, setFormData] = useState<SetupFormData>({
    dbType: 'local',
    dbHost: 'localhost',
    dbPort: '5432',
    dbUser: '',
    dbPassword: '',
    dbName: 'yocto_builder',
    nextauthUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    nextauthSecret: '',
    githubClientId: '',
    githubClientSecret: '',
    googleClientId: '',
    googleClientSecret: '',
    buildsDirectory: '/data/builds',
    logsDirectory: '/var/log/yocto_builder',
    buildContainerCpus: '6',
    buildContainerMemory: '28g',
    adminUsername: '',
    adminPassword: '',
    adminPasswordConfirm: '',
  });

  useEffect(() => {
    // Generate NextAuth secret
    const generateSecret = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    setFormData(prev => ({ ...prev, nextauthSecret: generateSecret() }));
  }, []);

  const handleGenerateSecret = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, nextauthSecret: result }));
  };

  const handleSetupLocalPostgres = async () => {
    setTestingDb(true);
    setDbTestResult(null);
    try {
      const response = await fetch('/api/setup/setup-local-postgres', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          dbUser: data.username,
          dbPassword: data.password,
          dbName: data.database,
          dbGenerated: {
            username: data.username,
            password: data.password,
            database: data.database,
          },
        }));
        setDbTestResult({ success: true, message: 'Local database created successfully' });
      } else {
        setDbTestResult({ success: false, message: data.message || 'Failed to setup database' });
      }
    } catch (error: any) {
      setDbTestResult({ success: false, message: error.message || 'Failed to setup database' });
    } finally {
      setTestingDb(false);
    }
  };

  const handleTestDbConnection = async () => {
    if (formData.dbType !== 'remote') return;
    
    setTestingDb(true);
    setDbTestResult(null);
    try {
      const response = await fetch('/api/setup/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: formData.dbHost,
          port: formData.dbPort,
          username: formData.dbUser,
          password: formData.dbPassword,
          database: formData.dbName,
        }),
      });
      const data = await response.json();
      setDbTestResult(data);
    } catch (error: any) {
      setDbTestResult({ success: false, message: error.message || 'Connection test failed' });
    } finally {
      setTestingDb(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
    if (formData.dbType === 'remote' && !dbTestResult?.success) {
      setError('Please test database connection first');
      setLoading(false);
      return;
    }

    if (!formData.adminUsername || !formData.adminPassword) {
      setError('Admin username and password are required');
      setLoading(false);
      return;
    }

    if (formData.adminPassword !== formData.adminPasswordConfirm) {
      setError('Admin passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Build DATABASE_URL
      const databaseUrl = formData.dbType === 'local'
        ? `postgresql://${formData.dbUser}:${formData.dbPassword}@${formData.dbHost}:${formData.dbPort}/${formData.dbName}`
        : `postgresql://${formData.dbUser}:${formData.dbPassword}@${formData.dbHost}:${formData.dbPort}/${formData.dbName}`;

      // Save .env file
      const envResponse = await fetch('/api/setup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          DATABASE_URL: databaseUrl,
          POSTGRESQL_HOST: formData.dbHost,
          POSTGRESQL_PORT: formData.dbPort,
          POSTGRESQL_USER: formData.dbUser,
          POSTGRESQL_PASSWORD: formData.dbPassword,
          POSTGRESQL_DB: formData.dbName,
          NEXTAUTH_URL: formData.nextauthUrl,
          NEXTAUTH_SECRET: formData.nextauthSecret,
          GITHUB_CLIENT_ID: formData.githubClientId,
          GITHUB_CLIENT_SECRET: formData.githubClientSecret,
          GOOGLE_CLIENT_ID: formData.googleClientId,
          GOOGLE_CLIENT_SECRET: formData.googleClientSecret,
          BUILDS_DIRECTORY: formData.buildsDirectory,
          LOGS_DIRECTORY: formData.logsDirectory,
          BUILD_CONTAINER_CPUS: formData.buildContainerCpus,
          BUILD_CONTAINER_MEMORY: formData.buildContainerMemory,
          DOCKER_HOST: 'unix:///var/run/docker.sock',
          POKY_IMAGE_KIRKSTONE: 'yocto-builder/poky-kirkstone:4.0',
          POKY_IMAGE_SCARTHGAP: 'yocto-builder/poky-scarthgap:5.0',
        }),
      });

      if (!envResponse.ok) {
        const envData = await envResponse.json();
        throw new Error(envData.message || 'Failed to save configuration');
      }

      // Create admin user
      const adminResponse = await fetch('/api/setup/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.adminUsername,
          password: formData.adminPassword,
        }),
      });

      if (!adminResponse.ok) {
        const adminData = await adminResponse.json();
        throw new Error(adminData.message || 'Failed to create admin user');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20 max-w-md w-full">
          <div className="text-center">
            <div className="text-green-400 text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-white mb-4">Setup Complete!</h2>
            <p className="text-gray-300 mb-6">Redirecting to login page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-red-600/20 border-2 border-red-500 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-red-400 mb-4">⚠️ Security Warning</h2>
          <p className="text-white mb-2">
            <strong>Complete this setup immediately!</strong> Until configuration is complete, 
            your installation is vulnerable and can be hijacked by unauthorized users.
          </p>
          <p className="text-gray-300 text-sm">
            Do not leave this page until setup is complete. Once finished, you will be able to 
            manage settings securely through the admin panel.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20">
          <div className="mb-6">
            <Link href="/" className="text-blue-400 hover:text-blue-300">
              ← Back to Home
            </Link>
          </div>
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Initial Setup</h1>
            <p className="text-gray-400 text-sm">
              <span className="font-semibold">YoctoBuilder</span> by{' '}
              <a
                href="https://gramini.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Gramini Labs
              </a>
            </p>
          </div>

          {error && (
            <div className="bg-red-600/20 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Database Configuration */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Database Configuration</h2>
              
              <div className="mb-4">
                <label className="block text-white mb-2">Database Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="local"
                      checked={formData.dbType === 'local'}
                      onChange={(e) => setFormData(prev => ({ ...prev, dbType: e.target.value as 'local' | 'remote' }))}
                      className="mr-2"
                    />
                    <span className="text-gray-300">Local PostgreSQL</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="remote"
                      checked={formData.dbType === 'remote'}
                      onChange={(e) => setFormData(prev => ({ ...prev, dbType: e.target.value as 'local' | 'remote' }))}
                      className="mr-2"
                    />
                    <span className="text-gray-300">Remote PostgreSQL</span>
                  </label>
                </div>
              </div>

              {formData.dbType === 'local' ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleSetupLocalPostgres}
                    disabled={testingDb}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
                  >
                    {testingDb ? 'Setting up...' : 'Setup Local PostgreSQL'}
                  </button>
                  
                  {formData.dbGenerated && (
                    <div className="bg-green-600/20 border border-green-500 rounded-lg p-4">
                      <p className="text-green-400 mb-2">Database created successfully!</p>
                      <p className="text-gray-300 text-sm">Username: <code className="bg-gray-800 px-2 py-1 rounded">{formData.dbGenerated.username}</code></p>
                      <p className="text-gray-300 text-sm">Password: <code className="bg-gray-800 px-2 py-1 rounded">{formData.dbGenerated.password}</code></p>
                      <p className="text-gray-300 text-sm">Database: <code className="bg-gray-800 px-2 py-1 rounded">{formData.dbGenerated.database}</code></p>
                      <p className="text-yellow-400 text-xs mt-2">⚠️ Save these credentials securely!</p>
                    </div>
                  )}
                  
                  {dbTestResult && !dbTestResult.success && (
                    <div className="bg-red-600/20 border border-red-500 rounded-lg p-4">
                      <p className="text-red-400">{dbTestResult.message}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-white mb-2">Host</label>
                    <input
                      type="text"
                      value={formData.dbHost}
                      onChange={(e) => setFormData(prev => ({ ...prev, dbHost: e.target.value }))}
                      className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white mb-2">Port</label>
                    <input
                      type="number"
                      value={formData.dbPort}
                      onChange={(e) => setFormData(prev => ({ ...prev, dbPort: e.target.value }))}
                      className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white mb-2">Username</label>
                    <input
                      type="text"
                      value={formData.dbUser}
                      onChange={(e) => setFormData(prev => ({ ...prev, dbUser: e.target.value }))}
                      className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white mb-2">Password</label>
                    <input
                      type="password"
                      value={formData.dbPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, dbPassword: e.target.value }))}
                      className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white mb-2">Database Name</label>
                    <input
                      type="text"
                      value={formData.dbName}
                      onChange={(e) => setFormData(prev => ({ ...prev, dbName: e.target.value }))}
                      className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                      required
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleTestDbConnection}
                    disabled={testingDb}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
                  >
                    {testingDb ? 'Testing...' : 'Test Connection'}
                  </button>
                  
                  {dbTestResult && (
                    <div className={`border rounded-lg p-4 ${dbTestResult.success ? 'bg-green-600/20 border-green-500' : 'bg-red-600/20 border-red-500'}`}>
                      <p className={dbTestResult.success ? 'text-green-400' : 'text-red-400'}>
                        {dbTestResult.success ? '✓ Connection successful' : `✗ ${dbTestResult.message}`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* NextAuth Configuration */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">NextAuth Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white mb-2">NextAuth URL</label>
                  <input
                    type="url"
                    value={formData.nextauthUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, nextauthUrl: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2">NextAuth Secret</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.nextauthSecret}
                      readOnly
                      className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateSecret}
                      className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* OAuth Providers */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">OAuth Providers (Optional)</h2>
              <p className="text-gray-400 text-sm mb-4">You can configure these later in settings</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white mb-2">GitHub Client ID</label>
                  <input
                    type="text"
                    value={formData.githubClientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, githubClientId: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2">GitHub Client Secret</label>
                  <input
                    type="password"
                    value={formData.githubClientSecret}
                    onChange={(e) => setFormData(prev => ({ ...prev, githubClientSecret: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2">Google Client ID</label>
                  <input
                    type="text"
                    value={formData.googleClientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, googleClientId: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2">Google Client Secret</label>
                  <input
                    type="password"
                    value={formData.googleClientSecret}
                    onChange={(e) => setFormData(prev => ({ ...prev, googleClientSecret: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                  />
                </div>
              </div>
            </section>

            {/* Application Settings */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Application Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white mb-2">Builds Directory</label>
                  <input
                    type="text"
                    value={formData.buildsDirectory}
                    onChange={(e) => setFormData(prev => ({ ...prev, buildsDirectory: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2">Logs Directory</label>
                  <input
                    type="text"
                    value={formData.logsDirectory}
                    onChange={(e) => setFormData(prev => ({ ...prev, logsDirectory: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2">Build Container CPUs</label>
                  <input
                    type="number"
                    value={formData.buildContainerCpus}
                    onChange={(e) => setFormData(prev => ({ ...prev, buildContainerCpus: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2">Build Container Memory</label>
                  <input
                    type="text"
                    value={formData.buildContainerMemory}
                    onChange={(e) => setFormData(prev => ({ ...prev, buildContainerMemory: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                    placeholder="28g"
                    required
                  />
                </div>
              </div>
            </section>

            {/* Admin Account */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Admin Account</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white mb-2">Username</label>
                  <input
                    type="text"
                    value={formData.adminUsername}
                    onChange={(e) => setFormData(prev => ({ ...prev, adminUsername: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2">Password</label>
                  <input
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                    required
                    minLength={8}
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={formData.adminPasswordConfirm}
                    onChange={(e) => setFormData(prev => ({ ...prev, adminPasswordConfirm: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                    required
                    minLength={8}
                  />
                </div>
              </div>
            </section>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

