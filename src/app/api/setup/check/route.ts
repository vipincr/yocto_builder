import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const envPath = join(process.cwd(), '.env');
    const exists = existsSync(envPath);

    return NextResponse.json({ exists });
  } catch (error: any) {
    return NextResponse.json(
      { exists: false, error: error.message },
      { status: 500 }
    );
  }
}

