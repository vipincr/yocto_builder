// For NextAuth v5, we use the auth() function
import { auth } from './auth';

export async function getServerSession() {
  try {
    return await auth();
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

