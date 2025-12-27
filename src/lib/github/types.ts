export interface GitHubUser {
  id: string;
  login: string;
  name?: string;
  email?: string;
  avatar_url: string;
}

export interface GitHubOAuthToken {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
  expires_in?: number;
}

