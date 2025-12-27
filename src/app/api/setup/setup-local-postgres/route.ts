import { NextResponse } from 'next/server';
import { generateCredentials, createLocalDatabase } from '@/lib/db/setup';

export async function POST() {
  try {
    const { username, password } = generateCredentials();
    const database = 'yocto_builder';

    const result = await createLocalDatabase(username, password, database);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      username,
      password,
      database,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to setup database' },
      { status: 500 }
    );
  }
}

