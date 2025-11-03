import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

// For Next.js hot reload - prevent multiple instances
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createExtendedClient> | undefined;
};

function createExtendedClient() {
  // Create base client
  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  
  // Always extend with Accelerate BEFORE passing to Better Auth
  const extended = baseClient.$extends(withAccelerate()) as any;

  // Debug: verify extension presence
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasAccel = !!(extended as any)._extensions;
    console.log('Prisma extended with Accelerate:', hasAccel);
  }

  return extended;
}

// CRITICAL: Always create extended client - Better Auth needs this exact instance
// Don't allow hot reload to reuse an old unextended instance
const prisma = (globalForPrisma.prisma ?? createExtendedClient());

// Force overwrite global to ensure it's always the extended version
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { prisma };
