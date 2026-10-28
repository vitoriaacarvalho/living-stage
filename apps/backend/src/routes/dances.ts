import {
  parseDanceInput,
  parseDanceUpdate,
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

schoolDancesRouter.patch('/dances/:danceId', async (req, res) => {
  const update = parseDanceUpdate(req.body);
  if (!update) {
    res.status(400).json({ error: 'invalid_dance' });
    return;
  }

  const [dance] = await prisma.dance.updateManyAndReturn({
    where: { id: req.params.danceId, schoolId: res.locals.schoolId },
    data: update,
  });
  if (!dance) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.json({ dance: toDance(dance) } satisfies DanceResponse);
});

schoolDancesRouter.delete('/dances/:danceId', async (req, res) => {
  const { count } = await prisma.dance.deleteMany({
    where: { id: req.params.danceId, schoolId: res.locals.schoolId },
  });
  if (count === 0) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.status(204).end();
});

type DanceRow = { id: string; title: string; showGuides: boolean; createdAt: Date };

function toDance({ id, title, showGuides, createdAt }: DanceRow): Dance {
  return { id, title, showGuides, createdAt: createdAt.toISOString() };
}
