import {
  dancePreview,
  parseDanceInput,
  parseDanceUpdate,
  type Dance,
  type DanceResponse,
  type DanceSummary,
  type DanceSummaryResponse,
  type ListDancesResponse,
} from '@living-stage/shared';
import { Router } from 'express';
import { danceCopy } from '../dances/copy-dance.ts';
import { prisma } from '../db.ts';
import { toCastMember } from './cast.ts';

export const schoolDancesRouter = Router();

const summaryFields = {
  cast: { include: { dancer: true }, orderBy: { createdAt: 'asc' } },
  figures: {
    where: { order: 0 },
    select: { positions: { select: { castMemberId: true, x: true, y: true } } },
  },
  showItems: { select: { show: { select: { title: true } } } },
} as const;

schoolDancesRouter.get('/dances', async (_req, res) => {
  const dances = await prisma.dance.findMany({
    where: { schoolId: res.locals.schoolId },
    orderBy: { createdAt: 'desc' },
    include: summaryFields,
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

schoolDancesRouter.post('/dances/:danceId/copies', async (req, res) => {
  const copy = await copyDance(req.params.danceId, res.locals.schoolId);
  if (!copy) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.status(201).json({ dance: toDanceSummary(copy) } satisfies DanceSummaryResponse);
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

function copyDance(danceId: string, schoolId: string) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.dance.findFirst({
      where: { id: danceId, schoolId },
      include: {
        cast: { orderBy: { createdAt: 'asc' } },
        figures: { orderBy: { order: 'asc' }, include: { positions: true } },
      },
    });
    if (!source) return null;

    const { dance, cast, figures, positions } = danceCopy(source);
    await tx.dance.create({ data: dance });
    await tx.castMember.createMany({ data: cast });
    await tx.figure.createMany({ data: figures });
    await tx.position.createMany({ data: positions });
    return tx.dance.findUniqueOrThrow({ where: { id: dance.id }, include: summaryFields });
  });
}

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
