import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma';

// Verify prisma client is extended (for debugging)
if (process.env.NODE_ENV === 'development') {
  console.log('Prisma client type:', typeof prisma);
  console.log('Has session.findFirst:', typeof (prisma as any).session?.findFirst);
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
  },
  secret: process.env.BETTER_AUTH_SECRET || 'fallback-secret-change-in-production',
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
  basePath: '/api/auth',
});

export type Session = typeof auth.$Infer.Session;
