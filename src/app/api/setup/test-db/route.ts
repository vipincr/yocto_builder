import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/db/setup';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port, username, password, database } = body;

    if (!host || !port || !username || !password || !database) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await testConnection(
      host,
      parseInt(port, 10),
      username,
      password,
      database
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Connection test failed' },
      { status: 500 }
    );
  }
}

