import { PrismaPg } from '@prisma/adapter-pg';
import { logger } from '../config/logger';
// PrismaClient import is lazy to avoid hard failure when generated client not yet present (e.g. in tests without DB)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PrismaClient: any;
try {
  // Prisma v7 generates to ../generated/prisma – import is relative to src/lib
  // After `prisma generate`, client is at generated/prisma/client.ts (and compiled to .js via tsc)
  PrismaClient = require('../../generated/prisma/client').PrismaClient;
} catch {
  try {
    PrismaClient = require('../../generated/prisma').PrismaClient;
  } catch {
    // Fallback for type-checking / when `prisma generate` hasn't run yet
    // This will be resolved at runtime after generation; `getPrisma` will throw a clear error if missing
    PrismaClient = null;
  }
}

let prismaInstance: any | null = null;
let adapterInstance: PrismaPg | null = null;

function createAdapter(): PrismaPg | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    adapterInstance = new PrismaPg({ connectionString: url });
    return adapterInstance;
  } catch (err) {
    logger.error({ err }, 'Failed to create PrismaPg adapter');
    return null;
  }
}

export function getPrisma(): any {
  if (prismaInstance) return prismaInstance;

  if (!PrismaClient) {
    throw new Error(
      'PrismaClient not generated – run `npm run prisma:generate` after `npm install`. Expected output at generated/prisma.'
    );
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set – Prisma client cannot be initialized. Configure DATABASE_URL in .env and ensure prisma.config.ts is correct.'
    );
  }

  const adapter = adapterInstance ?? createAdapter();
  if (!adapter) {
    throw new Error('Failed to create Prisma Postgres adapter');
  }

  prismaInstance = new PrismaClient({ adapter });
  return prismaInstance;
}

export function isPrismaConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// For testing / graceful shutdown
export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
    adapterInstance = null;
  }
}

// Lazy getter for convenience – returns instance or null without throwing if not configured
export function getPrismaOrNull(): any | null {
  try {
    return getPrisma();
  } catch {
    return null;
  }
}

export const prisma = {
  get client(): any {
    return getPrisma();
  },
};
