'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface SettingsFormData {
  // Database
  dbType: 'local' | 'remote';
  dbHost: string;
  dbPort: string;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  
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
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  isAdmin: boolean;
  accounts: Array<{ provider: string }>;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  
  const [formData, setFormData] = useState<SettingsFormData>({
    dbType: 'remote',
    dbHost: 'localhost',
    dbPort: '5432',
    dbUser: '',
    dbPassword: '',
    dbName: 'yocto_builder',
    nextauthUrl: '',
    nextauthSecret: '',
    githubClientId: '',
    githubClientSecret: '',
    googleClientId: '',
    googleClientSecret: '',
    buildsDirectory: '/data/builds',
    logsDirectory: '/var/log/yocto_builder',
    buildContainerCpus: '6',
    buildContainerMemory: '28g',
  });

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      // Check if user is admin by trying to load settings
      const response = await fetch('/api/settings/load');
      if (response.status === 403) {
        setIsUserAdmin(false);
        setLoading(false);
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to check admin status');
      }
      setIsUserAdmin(true);
      const data = await response.json();
      await loadSettingsFromData(data);
      await loadUsers();
    } catch (error: any) {
      setError(error.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadSettingsFromData = (data: any) => {
    try {
      // Parse DATABASE_URL if present
      if (data.env.DATABASE_URL && !data.env.DATABASE_URL.includes('***')) {
        try {
          const dbUrl = new URL(data.env.DATABASE_URL);
          setFormData(prev => ({
            ...prev,
            dbHost: dbUrl.hostname,
            dbPort: dbUrl.port || '5432',
            dbUser: dbUrl.username,
            dbPassword: dbUrl.password,
            dbName: dbUrl.pathname.slice(1),
          }));
        } catch (e) {
          // If URL parsing fails, use individual fields
        }
      }
      
      // Use individual fields if DATABASE_URL not available or parsing failed
      if (!data.env.DATABASE_URL || data.env.DATABASE_URL.includes('***')) {
        // Use individual fields
        setFormData(prev => ({
          ...prev,
          dbHost: data.env.POSTGRESQL_HOST || prev.dbHost,
          dbPort: data.env.POSTGRESQL_PORT || prev.dbPort,
          dbUser: data.env.POSTGRESQL_USER || prev.dbUser,
          dbPassword: data.env.POSTGRESQL_PASSWORD === '***' ? '' : (data.env.POSTGRESQL_PASSWORD || ''),
          dbName: data.env.POSTGRESQL_DB || prev.dbName,
        }));
      }
      
      setFormData(prev => ({
        ...prev,
        nextauthUrl: data.env.NEXTAUTH_URL || prev.nextauthUrl,
        nextauthSecret: data.env.NEXTAUTH_SECRET === '***' ? '' : (data.env.NEXTAUTH_SECRET || ''),
        githubClientId: data.env.GITHUB_CLIENT_ID || '',
        githubClientSecret: data.env.GITHUB_CLIENT_SECRET === '***' ? '' : (data.env.GITHUB_CLIENT_SECRET || ''),
        googleClientId: data.env.GOOGLE_CLIENT_ID || '',
        googleClientSecret: data.env.GOOGLE_CLIENT_SECRET === '***' ? '' : (data.env.GOOGLE_CLIENT_SECRET || ''),
        buildsDirectory: data.env.BUILDS_DIRECTORY || prev.buildsDirectory,
        logsDirectory: data.env.LOGS_DIRECTORY || prev.logsDirectory,
        buildContainerCpus: data.env.BUILD_CONTAINER_CPUS || prev.buildContainerCpus,
        buildContainerMemory: data.env.BUILD_CONTAINER_MEMORY || prev.buildContainerMemory,
      }));
    } catch (error: any) {
      setError(error.message || 'Failed to load settings');
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleTestDbConnection = async () => {
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

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      // Build DATABASE_URL
      const databaseUrl = `postgresql://${formData.dbUser}:${formData.dbPassword}@${formData.dbHost}:${formData.dbPort}/${formData.dbName}`;

      const response = await fetch('/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          env: {
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
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess('Settings saved successfully');
      
      // Restart services
      setRestarting(true);
      const restartResponse = await fetch('/api/settings/restart', {
        method: 'POST',
      });
      
      if (restartResponse.ok) {
        setSuccess('Settings saved and services restarted');
      } else {
        setSuccess('Settings saved. Please restart services manually.');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
      setRestarting(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminUsername || !newAdminPassword) {
      setError('Username and password are required');
      return;
    }

    try {
      const response = await fetch('/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newAdminUsername,
          password: newAdminPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create admin');
      }

      setNewAdminUsername('');
      setNewAdminPassword('');
      setSuccess('Admin user created successfully');
      loadUsers();
    } catch (error: any) {
      setError(error.message || 'Failed to create admin user');
    }
  };

  const handlePromoteUser = async (userId: string, promote: boolean) => {
    try {
      const response = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          isAdmin: promote,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update user');
      }

      setSuccess(`User ${promote ? 'promoted to' : 'removed from'} admin`);
      loadUsers();
    } catch (error: any) {
      setError(error.message || 'Failed to update user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isUserAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-600/20 border border-red-500 rounded-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h2>
          <p className="text-white">You must be an administrator to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">
          Manage application configuration - <span className="font-semibold">YoctoBuilder</span> by{' '}
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
        <div className="bg-red-600/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-600/20 border border-green-500 rounded-lg p-4">
          <p className="text-green-400">{success}</p>
        </div>
      )}

      {/* Database Configuration */}
      <section className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
        <h2 className="text-2xl font-semibold text-white mb-4">Database Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-white mb-2">Host</label>
            <input
              type="text"
              value={formData.dbHost}
              onChange={(e) => setFormData(prev => ({ ...prev, dbHost: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
            />
          </div>
          
          <div>
            <label className="block text-white mb-2">Port</label>
            <input
              type="number"
              value={formData.dbPort}
              onChange={(e) => setFormData(prev => ({ ...prev, dbPort: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
            />
          </div>
          
          <div>
            <label className="block text-white mb-2">Username</label>
            <input
              type="text"
              value={formData.dbUser}
              onChange={(e) => setFormData(prev => ({ ...prev, dbUser: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
            />
          </div>
          
          <div>
            <label className="block text-white mb-2">Password</label>
            <input
              type="password"
              value={formData.dbPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, dbPassword: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
              placeholder="Leave empty to keep current"
            />
          </div>
          
          <div>
            <label className="block text-white mb-2">Database Name</label>
            <input
              type="text"
              value={formData.dbName}
              onChange={(e) => setFormData(prev => ({ ...prev, dbName: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
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
      </section>

      {/* NextAuth Configuration */}
      <section className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
        <h2 className="text-2xl font-semibold text-white mb-4">NextAuth Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-white mb-2">NextAuth URL</label>
            <input
              type="url"
              value={formData.nextauthUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, nextauthUrl: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
            />
          </div>
          
          <div>
            <label className="block text-white mb-2">NextAuth Secret</label>
            <input
              type="text"
              value={formData.nextauthSecret}
              onChange={(e) => setFormData(prev => ({ ...prev, nextauthSecret: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
              placeholder="Leave empty to keep current"
            />
          </div>
        </div>
      </section>

      {/* OAuth Providers */}
      <section className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
        <h2 className="text-2xl font-semibold text-white mb-4">OAuth Providers</h2>
        
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
              placeholder="Leave empty to keep current"
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
              placeholder="Leave empty to keep current"
            />
          </div>
        </div>
      </section>

      {/* Application Settings */}
      <section className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
        <h2 className="text-2xl font-semibold text-white mb-4">Application Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-white mb-2">Builds Directory</label>
            <input
              type="text"
              value={formData.buildsDirectory}
              onChange={(e) => setFormData(prev => ({ ...prev, buildsDirectory: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
            />
          </div>
          
          <div>
            <label className="block text-white mb-2">Logs Directory</label>
            <input
              type="text"
              value={formData.logsDirectory}
              onChange={(e) => setFormData(prev => ({ ...prev, logsDirectory: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
            />
          </div>
          
          <div>
            <label className="block text-white mb-2">Build Container CPUs</label>
            <input
              type="number"
              value={formData.buildContainerCpus}
              onChange={(e) => setFormData(prev => ({ ...prev, buildContainerCpus: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
            />
          </div>
          
          <div>
            <label className="block text-white mb-2">Build Container Memory</label>
            <input
              type="text"
              value={formData.buildContainerMemory}
              onChange={(e) => setFormData(prev => ({ ...prev, buildContainerMemory: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
            />
          </div>
        </div>
      </section>

      {/* Admin Management */}
      <section className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
        <h2 className="text-2xl font-semibold text-white mb-4">Admin Management</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Create New Admin</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Username"
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
              />
              <input
                type="password"
                placeholder="Password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
              />
              <button
                type="button"
                onClick={handleCreateAdmin}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                Create Admin
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Existing Users</h3>
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
                  <div>
                    <p className="text-white font-medium">
                      {user.name || user.email || user.username || 'Unknown'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {user.email && `Email: ${user.email}`}
                      {user.username && `Username: ${user.username}`}
                      {user.accounts.length > 0 && ` (${user.accounts.map(a => a.provider).join(', ')})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${user.isAdmin ? 'bg-green-600/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                      {user.isAdmin ? 'Admin' : 'User'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePromoteUser(user.id, !user.isAdmin)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        user.isAdmin
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {user.isAdmin ? 'Remove Admin' : 'Promote to Admin'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || restarting}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50"
        >
          {restarting ? 'Restarting...' : saving ? 'Saving...' : 'Save & Restart Services'}
        </button>
      </div>
    </div>
  );
}

