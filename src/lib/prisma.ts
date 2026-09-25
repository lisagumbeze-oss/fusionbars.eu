import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrls } from '@/config/database-url';

resolveDatabaseUrls();

// Global reference declaration to prevent multiple client instances during HMR / serverless warm invocations
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Authoritative Prisma client singleton for Vercel Serverless & Node.js runtimes.
 * Ensures connection pooling reuse across lambda executions.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    errorFormat: 'minimal',
  });

// Always retain global singleton across invocations (both dev and production warm lambdas)
globalForPrisma.prisma = prisma;

export default prisma;
