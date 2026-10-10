import { PrismaPg } from '@prisma/adapter-pg';
// PrismaClient import is lazy to avoid hard failure when generated client not yet present (e.g. in tests without DB)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PrismaClient: any;
let prismaClientLoadError: unknown;
try {
  // Prisma v7 generates TypeScript into generated/prisma. The production build
  // compiles that tree next to dist/src so this resolves to dist/generated.
  PrismaClient = require('../../generated/prisma/client').PrismaClient;
} catch (clientEntryError) {
  try {
    PrismaClient = require('../../generated/prisma').PrismaClient;
  } catch (directoryEntryError) {
    prismaClientLoadError = directoryEntryError ?? clientEntryError;
    PrismaClient = null;
  }
}

let prismaInstance: any | null = null;
let adapterInstance: PrismaPg | null = null;

function createAdapter(): PrismaPg {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Configure a PostgreSQL connection string in the backend environment.'
    );
  }
  try {
    adapterInstance = new PrismaPg({ connectionString: url });
    return adapterInstance;
  } catch (err) {
    throw new Error(
      'Failed to initialize the PostgreSQL adapter. Check that DATABASE_URL is a valid PostgreSQL connection string.',
      { cause: err }
    );
  }
}

export function getPrisma(): any {
  if (prismaInstance) return prismaInstance;

  if (!PrismaClient) {
    throw new Error(
      'Prisma Client could not be loaded. Run `npm run prisma:generate` and `npm run build` in the backend directory. Check that generated/prisma/client.ts and its dependencies are present.',
      { cause: prismaClientLoadError }
    );
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set – Prisma client cannot be initialized. Configure DATABASE_URL in .env and ensure prisma.config.ts is correct.'
    );
  }

  const adapter = adapterInstance ?? createAdapter();
  try {
    prismaInstance = new PrismaClient({ adapter });
    return prismaInstance;
  } catch (err) {
    throw new Error(
      'Failed to initialize Prisma Client with the PostgreSQL adapter. Check DATABASE_URL and run `npm run prisma:generate`.',
      { cause: err }
    );
  }
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

// Legacy helper name retained for callers; initialization failures are propagated.
export function getPrismaOrNull(): any | null {
  return getPrisma();
}

export const prisma = {
  get client(): any {
    return getPrisma();
  },
};
