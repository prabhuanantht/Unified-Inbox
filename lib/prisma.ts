import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

// For Next.js hot reload
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  
  // Always extend with Accelerate - no conditional logic
  return client.$extends(withAccelerate()) as any;
}

// Always create extended client for Accelerate
// Force create a new one if global doesn't exist or isn't extended
const existingPrisma = globalForPrisma.prisma;
const prisma = existingPrisma ?? createPrismaClient();

// Ensure we always use the extended client (overwrite if needed in dev)
if (process.env.NODE_ENV !== 'production') {
  // Force overwrite to ensure we always have the extended client
  globalForPrisma.prisma = prisma;
}

export { prisma };