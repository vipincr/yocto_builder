// For NextAuth v5, we use the auth() function
import { auth } from './auth';
import { isAdmin } from './admin';

export async function getServerSession() {
  try {
    const session = await auth();
    if (session?.user?.id) {
      // Add isAdmin to session
      const adminStatus = await isAdmin(session.user.id);
      return {
        ...session,
        user: {
          ...session.user,
          isAdmin: adminStatus,
        },
      };
    }
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

