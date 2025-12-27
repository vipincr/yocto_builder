import { Client } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Generate random credentials for PostgreSQL
 */
export function generateCredentials(): { username: string; password: string } {
  const randomString = (length: number) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  return {
    username: `yocto_${randomString(8)}`,
    password: randomString(24),
  };
}

/**
 * Test PostgreSQL connection
 */
export async function testConnection(
  host: string,
  port: number,
  username: string,
  password: string,
  database: string
): Promise<{ success: boolean; message?: string }> {
  const client = new Client({
    host,
    port,
    user: username,
    password,
    database,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Connection failed',
    };
  }
}

/**
 * Create local PostgreSQL database and user
 */
export async function createLocalDatabase(
  username: string,
  password: string,
  database: string = 'yocto_builder'
): Promise<{ success: boolean; message?: string }> {
  try {
    // Escape special characters in password for shell
    const escapedPassword = password.replace(/'/g, "\\'");
    
    // Create user
    try {
      await execAsync(
        `psql -U postgres -c "CREATE USER ${username} WITH PASSWORD '${escapedPassword}';"`,
        { timeout: 10000 }
      );
    } catch (error: any) {
      // User might already exist, try to alter password
      if (error.message.includes('already exists') || error.stderr?.includes('already exists')) {
        await execAsync(
          `psql -U postgres -c "ALTER USER ${username} WITH PASSWORD '${escapedPassword}';"`,
          { timeout: 10000 }
        );
      } else {
        throw error;
      }
    }

    // Grant privileges
    await execAsync(
      `psql -U postgres -c "ALTER USER ${username} CREATEDB;"`,
      { timeout: 10000 }
    );

    // Create database
    try {
      await execAsync(
        `psql -U postgres -c "CREATE DATABASE ${database} OWNER ${username};"`,
        { timeout: 10000 }
      );
    } catch (error: any) {
      // Database might already exist
      if (!error.message.includes('already exists') && !error.stderr?.includes('already exists')) {
        throw error;
      }
    }

    // Grant all privileges on database
    await execAsync(
      `psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${database} TO ${username};"`,
      { timeout: 10000 }
    );

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || error.stderr || 'Failed to create database',
    };
  }
}

