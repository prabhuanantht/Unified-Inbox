import { PrismaClient } from '@prisma/client';

// Dedicated Prisma client for Better Auth (must NOT use Accelerate)
// Set AUTH_DATABASE_URL in .env to your direct Postgres connection string
// Falls back to DATABASE_URL if it looks like a direct URL (not prisma+...)

function resolveAuthDatabaseUrl(): string {
  const authUrl = process.env.AUTH_DATABASE_URL;
  if (authUrl && !authUrl.startsWith('prisma+')) return authUrl;

  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) {
    throw new Error('AUTH_DATABASE_URL not set and DATABASE_URL is missing. Set AUTH_DATABASE_URL to a direct Postgres URL (not Accelerate).');
  }

  if (dbUrl.startsWith('prisma+')) {
    throw new Error('AUTH_DATABASE_URL is required for Better Auth. Provide a direct Postgres URL (not Accelerate).');
  }

  return dbUrl;
}

const directUrl = resolveAuthDatabaseUrl();

// Create a plain PrismaClient WITHOUT Accelerate for Better Auth
export const authPrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: { url: directUrl },
  },
});
