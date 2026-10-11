import type { HealthResponse } from '@living-stage/shared';
import { Router } from 'express';
import { prisma } from '../db.ts';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'ok' } satisfies HealthResponse);
  } catch {
    res.status(503).json({ status: 'error', database: 'unreachable' } satisfies HealthResponse);
  }
});
