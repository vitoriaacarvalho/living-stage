import {
  parseDanceInput,
  type Dance,
  type DanceResponse,
  type ListDancesResponse,
} from '@living-stage/shared';
import { Router } from 'express';
import { prisma } from '../db.ts';

export const schoolDancesRouter = Router();

schoolDancesRouter.get('/dances', async (_req, res) => {
  const dances = await prisma.dance.findMany({
    where: { schoolId: res.locals.schoolId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ dances: dances.map(toDance) } satisfies ListDancesResponse);
});

schoolDancesRouter.post('/dances', async (req, res) => {
  const input = parseDanceInput(req.body);
  if (!input) {
    res.status(400).json({ error: 'invalid_dance' });
    return;
  }

  const dance = await prisma.dance.create({ data: { schoolId: res.locals.schoolId, ...input } });

  res.status(201).json({ dance: toDance(dance) } satisfies DanceResponse);
});

function toDance({ id, title, createdAt }: { id: string; title: string; createdAt: Date }): Dance {
  return { id, title, createdAt: createdAt.toISOString() };
}
