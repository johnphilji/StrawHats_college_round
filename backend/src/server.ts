import { createApp } from './app';
import { validateEnv } from './config/env';
import { logger } from './config/logger';
import { disconnectPrisma } from './lib/prisma';

async function main(): Promise<void> {
  let env;
  try {
    env = validateEnv();
  } catch (err) {
    // Use console.error because logger may not be initialized
    console.error('Environment validation failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const app = createApp();

  const port = env.PORT;

  const server = app.listen(port, () => {
    logger.info({ port, env: env.NODE_ENV }, `PATCHWORK backend listening on port ${port}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully');
    server.close(async () => {
      try {
        await disconnectPrisma();
        logger.info('Prisma disconnected');
      } catch (err) {
        logger.error({ err }, 'Error disconnecting Prisma');
      }
      process.exit(0);
    });

    // Force close after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught Exception');
    void shutdown('uncaughtException');
  });
}

export { main };

// Only run if executed directly (not imported in tests). Compatible with both tsx and compiled JS.
const isMain =
  typeof require !== 'undefined' &&
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require.main === module);

if (isMain) {
  void main();
}
