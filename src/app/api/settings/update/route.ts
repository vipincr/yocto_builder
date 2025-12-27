import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { requireAdmin } from '@/lib/auth/admin';
import { readFile, writeFile } from 'fs';
import { promisify } from 'util';
import { join } from 'path';
import { testConnection } from '@/lib/db/setup';

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireAdmin(session.user.id);

    const body = await request.json();
    const { env: updatedEnv } = body;

    if (!updatedEnv || typeof updatedEnv !== 'object') {
      return NextResponse.json(
        { error: 'Invalid environment variables' },
        { status: 400 }
      );
    }

    // Read existing .env file
    const envPath = join(process.cwd(), '.env');
    let existingEnv: Record<string, string> = {};

    try {
      const envContent = await readFileAsync(envPath, 'utf8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([^=]+)="?([^"]+)"?$/);
          if (match) {
            existingEnv[match[1].trim()] = match[2].trim();
          }
        }
      }
    } catch (error) {
      // .env doesn't exist, start fresh
    }

    // Merge with existing (preserve values marked as ***)
    const finalEnv: Record<string, string> = { ...existingEnv };
    for (const [key, value] of Object.entries(updatedEnv)) {
      if (value !== '***') {
        finalEnv[key] = value;
      }
    }

    // Check if database settings changed
    const dbKeys = ['DATABASE_URL', 'POSTGRESQL_HOST', 'POSTGRESQL_PORT', 'POSTGRESQL_USER', 'POSTGRESQL_PASSWORD', 'POSTGRESQL_DB'];
    const dbChanged = dbKeys.some(key => {
      const oldValue = existingEnv[key];
      const newValue = finalEnv[key];
      return oldValue !== newValue && newValue && newValue !== '***';
    });

    // Test database connection if changed
    if (dbChanged) {
      // Extract from DATABASE_URL or use individual fields
      let dbHost = 'localhost';
      let dbPort = 5432;
      let dbUser = 'yocto_admin';
      let dbPassword = '';
      let dbName = 'yocto_builder';

      if (finalEnv.DATABASE_URL && !finalEnv.DATABASE_URL.includes('***')) {
        try {
          const dbUrl = new URL(finalEnv.DATABASE_URL);
          dbHost = dbUrl.hostname;
          dbPort = parseInt(dbUrl.port || '5432', 10);
          dbUser = dbUrl.username;
          dbPassword = dbUrl.password;
          dbName = dbUrl.pathname.slice(1);
        } catch (e) {
          // Use individual fields if URL parsing fails
        }
      }

      if (!dbHost || !dbUser || !dbName) {
        dbHost = finalEnv.POSTGRESQL_HOST || dbHost;
        dbPort = parseInt(finalEnv.POSTGRESQL_PORT || String(dbPort), 10);
        dbUser = finalEnv.POSTGRESQL_USER || dbUser;
        dbPassword = finalEnv.POSTGRESQL_PASSWORD || dbPassword;
        dbName = finalEnv.POSTGRESQL_DB || dbName;
      }

      if (dbPassword && dbPassword !== '***') {
        const testResult = await testConnection(dbHost, dbPort, dbUser, dbPassword, dbName);
        if (!testResult.success) {
          return NextResponse.json(
            { error: `Database connection failed: ${testResult.message}` },
            { status: 400 }
          );
        }
      }
    }

    // Build .env file content
    const envContent = Object.entries(finalEnv)
      .map(([key, value]) => {
        const escapedValue = String(value).replace(/"/g, '\\"');
        return `${key}="${escapedValue}"`;
      })
      .join('\n');

    // Write .env file
    await writeFileAsync(envPath, envContent, 'utf8');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}

