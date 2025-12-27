import NextAuth from 'next-auth';
import { authOptions } from './config';

// Create the auth instance for use in getServerSession and route handlers
const nextAuth = NextAuth(authOptions);
export const { auth, handlers } = nextAuth;

