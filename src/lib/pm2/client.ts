import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PM2_APP_NAME = 'yocto-builder';

/**
 * Restart PM2 application
 */
export async function restartApp(name: string = PM2_APP_NAME): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const { stdout, stderr } = await execAsync(`pm2 restart ${name}`, {
      timeout: 30000,
    });

    if (stderr && !stderr.includes('PM2')) {
      return {
        success: false,
        message: stderr,
      };
    }

    return {
      success: true,
      message: stdout || 'Application restarted successfully',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to restart application',
    };
  }
}

/**
 * Get PM2 application status
 */
export async function getStatus(name: string = PM2_APP_NAME): Promise<{
  success: boolean;
  status?: string;
  message?: string;
}> {
  try {
    const { stdout } = await execAsync(`pm2 describe ${name}`, {
      timeout: 10000,
    });

    // Parse status from output
    const statusMatch = stdout.match(/status\s*:\s*(\w+)/i);
    const status = statusMatch ? statusMatch[1] : 'unknown';

    return {
      success: true,
      status,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to get status',
    };
  }
}

/**
 * List all PM2 applications
 */
export async function listApps(): Promise<{
  success: boolean;
  apps?: Array<{ name: string; status: string }>;
  message?: string;
}> {
  try {
    const { stdout } = await execAsync('pm2 list --no-color', {
      timeout: 10000,
    });

    // Parse apps from output
    const lines = stdout.split('\n');
    const apps: Array<{ name: string; status: string }> = [];

    for (const line of lines) {
      const match = line.match(/(\w+)\s+\w+\s+(\w+)/);
      if (match) {
        apps.push({
          name: match[1],
          status: match[2],
        });
      }
    }

    return {
      success: true,
      apps,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to list apps',
    };
  }
}

