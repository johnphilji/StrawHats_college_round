import { Router } from 'express';
import { isPrismaConfigured, getPrismaOrNull } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const checks: Record<string, { status: 'ok' | 'skipped' | 'error'; message?: string }> = {
    api: { status: 'ok' },
  };

  // Report DB connectivity separately – do not claim healthy when only Express is running
  if (!isPrismaConfigured()) {
    checks.database = { status: 'skipped', message: 'DATABASE_URL not configured' };
  } else {
    try {
      const prisma = getPrismaOrNull();
      if (prisma) {
        // Lightweight query – raw query avoids needing a model
        await prisma.$queryRaw`SELECT 1`;
        checks.database = { status: 'ok' };
      } else {
        checks.database = { status: 'error', message: 'Prisma client unavailable' };
      }
    } catch (err) {
      checks.database = {
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok' || c.status === 'skipped');
  const overall = allOk ? 'ok' : 'degraded';

  res.status(200).json({
    success: true,
    data: {
      status: overall,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
    },
  });
});

export default router;
