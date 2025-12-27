import NextAuth from 'next-auth';
import { authOptions } from './config';

// Create the auth instance for use in getServerSession
export const { auth } = NextAuth(authOptions);

