import {
  parseDancerInput,
  type Dancer,
  type DancerResponse,
  type ListDancersResponse,
} from '@living-stage/shared';
import { Router } from 'express';
import { prisma } from '../db.ts';

export const schoolDancersRouter = Router();

schoolDancersRouter.get('/dancers', async (_req, res) => {
  const dancers = await prisma.dancer.findMany({
    where: { schoolId: res.locals.schoolId },
    orderBy: { name: 'asc' },
  });

  res.json({ dancers: dancers.map(toDancer) } satisfies ListDancersResponse);
});

schoolDancersRouter.post('/dancers', async (req, res) => {
  const input = parseDancerInput(req.body);
  if (!input) {
    res.status(400).json({ error: 'invalid_dancer' });
    return;
  }

  const dancer = await prisma.dancer.create({ data: { schoolId: res.locals.schoolId, ...input } });

  res.status(201).json({ dancer: toDancer(dancer) } satisfies DancerResponse);
});

schoolDancersRouter.put('/dancers/:dancerId', async (req, res) => {
  const input = parseDancerInput(req.body);
  if (!input) {
    res.status(400).json({ error: 'invalid_dancer' });
    return;
  }

  const [dancer] = await prisma.dancer.updateManyAndReturn({
    where: { id: req.params.dancerId, schoolId: res.locals.schoolId },
    data: input,
  });
  if (!dancer) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.json({ dancer: toDancer(dancer) } satisfies DancerResponse);
});

schoolDancersRouter.delete('/dancers/:dancerId', async (req, res) => {
  const { count } = await prisma.dancer.deleteMany({
    where: { id: req.params.dancerId, schoolId: res.locals.schoolId },
  });
  if (count === 0) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.status(204).end();
});

function toDancer({ id, name, color }: { id: string; name: string; color: number | null }): Dancer {
  return { id, name, color };
}
