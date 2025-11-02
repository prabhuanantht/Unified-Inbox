import { betterAuth } from 'better-auth';
import { prisma } from './prisma';

export const auth = betterAuth({
  database: prisma,
  emailAndPassword: {
    enabled: true,
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
  secret: process.env.BETTER_AUTH_SECRET || '',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
});

export type Session = typeof auth.$Infer.Session;
