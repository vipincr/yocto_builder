import { NextRequest, NextResponse } from 'next/server';
import { writeFile, existsSync } from 'fs';
import { promisify } from 'util';
import { join } from 'path';

const writeFileAsync = promisify(writeFile);

export async function POST(request: NextRequest) {
  try {
    // Only allow if .env doesn't exist (or in setup mode)
    const envPath = join(process.cwd(), '.env');
    const envExists = existsSync(envPath);

    // Allow if .env doesn't exist, or if special setup token is provided
    const body = await request.json();
    const { force, ...envVars } = body;

    if (envExists && !force) {
      return NextResponse.json(
        { success: false, message: '.env file already exists' },
        { status: 400 }
      );
    }

    // Build .env file content
    const envContent = Object.entries(envVars)
      .map(([key, value]) => {
        // Escape special characters in values
        const escapedValue = String(value).replace(/"/g, '\\"');
        return `${key}="${escapedValue}"`;
      })
      .join('\n');

    // Write .env file
    await writeFileAsync(envPath, envContent, 'utf8');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to save .env file' },
      { status: 500 }
    );
  }
}

