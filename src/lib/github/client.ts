import { GitHubRepository, GitHubBranch } from '@/types/project';

export class GitHubClient {
  private accessToken: string;
  private baseUrl = 'https://api.github.com';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Yocto-Builder',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `GitHub API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getRepositories(page: number = 1, perPage: number = 30, search?: string): Promise<{
    repositories: GitHubRepository[];
    total: number;
  }> {
    if (search) {
      const response = await this.request<{ items: any[]; total_count: number }>(
        `/search/repositories?q=${encodeURIComponent(search)}+user:@me&page=${page}&per_page=${perPage}`
      );
      return {
        repositories: response.items.map(this.mapRepository),
        total: response.total_count,
      };
    }

    const response = await this.request<any[]>(
      `/user/repos?page=${page}&per_page=${perPage}&sort=updated`
    );
    return {
      repositories: response.map(this.mapRepository),
      total: response.length,
    };
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const response = await this.request<any>(`/repos/${owner}/${repo}`);
    return this.mapRepository(response);
  }

  async getBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    const response = await this.request<any[]>(`/repos/${owner}/${repo}/branches`);
    return response.map((branch) => ({
      name: branch.name,
      sha: branch.commit.sha,
      protected: branch.protected,
    }));
  }

  async createWebhook(owner: string, repo: string, url: string, secret: string): Promise<{
    id: string;
    url: string;
  }> {
    const response = await this.request<{ id: number; url: string }>(
      `/repos/${owner}/${repo}/hooks`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'web',
          active: true,
          events: ['push'],
          config: {
            url,
            content_type: 'json',
            secret,
            insecure_ssl: '0',
          },
        }),
      }
    );
    return {
      id: String(response.id),
      url: response.url,
    };
  }

  async deleteWebhook(owner: string, repo: string, hookId: string): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/hooks/${hookId}`, {
      method: 'DELETE',
    });
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string | null> {
    try {
      const response = await this.request<{ content: string; encoding: string }>(
        `/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${ref}` : ''}`
      );
      if (response.encoding === 'base64') {
        return Buffer.from(response.content, 'base64').toString('utf-8');
      }
      return response.content;
    } catch (error: any) {
      if (error.message?.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  private mapRepository(repo: any): GitHubRepository {
    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
      private: repo.private,
      stars: repo.stargazers_count,
    };
  }
}

