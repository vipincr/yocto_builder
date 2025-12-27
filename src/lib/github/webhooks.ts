import crypto from 'crypto';

export function verifyGitHubWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

export interface GitHubWebhookPayload {
  ref: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
    default_branch: string;
  };
  commits: Array<{
    id: string;
    message: string;
    timestamp: string;
  }>;
  head_commit?: {
    id: string;
    message: string;
    timestamp: string;
  };
}

