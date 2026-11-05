import {
  dancePreview,
  parseDanceInput,
  parseDanceUpdate,
  type Dance,
  type DanceResponse,
  type DanceSummary,
  type ListDancesResponse,
} from '@living-stage/shared';
import { Router } from 'express';
import { prisma } from '../db.ts';
import { toCastMember } from './cast.ts';

export const schoolDancesRouter = Router();

schoolDancesRouter.get('/dances', async (_req, res) => {
  const dances = await prisma.dance.findMany({
    where: { schoolId: res.locals.schoolId },
    orderBy: { createdAt: 'desc' },
    include: {
      cast: { include: { dancer: true }, orderBy: { createdAt: 'asc' } },
      figures: {
        where: { order: 0 },
        select: { positions: { select: { castMemberId: true, x: true, y: true } } },
      },
      showItems: { select: { show: { select: { title: true } } } },
    },
  });

  res.json({ dances: dances.map(toDanceSummary) } satisfies ListDancesResponse);
});

schoolDancesRouter.post('/dances', async (req, res) => {
  const input = parseDanceInput(req.body);
  if (!input) {
    res.status(400).json({ error: 'invalid_dance' });
    return;
  }

  const dance = await prisma.dance.create({
    data: { schoolId: res.locals.schoolId, ...input, figures: { create: { order: 0 } } },
  });

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

type DanceRow = Omit<Dance, 'createdAt'> & { createdAt: Date };

type SummaryRow = DanceRow & {
  cast: Parameters<typeof toCastMember>[0][];
  figures: { positions: { castMemberId: string; x: number; y: number }[] }[];
  showItems: { show: { title: string } }[];
};

function toDanceSummary({ cast: rows, figures, showItems, ...dance }: SummaryRow): DanceSummary {
  const cast = rows.map(toCastMember);
  const positions = figures[0]?.positions ?? [];
  return {
    ...toDance(dance),
    castCount: cast.length,
    preview: dancePreview(cast, positions, dance.colorMode),
    showTitles: showItems.map(({ show }) => show.title),
  };
}

function toDance(dance: DanceRow): Dance {
  const { id, title, showGuides, labelMode, colorMode, createdAt } = dance;
  return { id, title, showGuides, labelMode, colorMode, createdAt: createdAt.toISOString() };
}
