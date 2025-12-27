import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';

export default async function Home() {
  try {
    const session = await getServerSession();
    
    if (session) {
      redirect('/dashboard');
    } else {
      redirect('/login');
    }
  } catch (error) {
    // If there's any error (e.g., database connection, NextAuth config), redirect to login
    console.error('Error in root page:', error);
    redirect('/login');
  }
}
