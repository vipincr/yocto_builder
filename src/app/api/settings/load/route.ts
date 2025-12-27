import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { requireAdmin } from '@/lib/auth/admin';
import { readFile } from 'fs';
import { promisify } from 'util';
import { join } from 'path';

const readFileAsync = promisify(readFile);

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireAdmin(session.user.id);

    const envPath = join(process.cwd(), '.env');
    const envContent = await readFileAsync(envPath, 'utf8');

    // Parse .env file
    const envVars: Record<string, string> = {};
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=]+)="?([^"]+)"?$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          // Sanitize: don't return passwords in full
          if (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
            envVars[key] = value.length > 0 ? '***' : '';
          } else {
            envVars[key] = value;
          }
        }
      }
    }

    return NextResponse.json({ env: envVars });
  } catch (error: any) {
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to load settings' },
      { status: 500 }
    );
  }
}

