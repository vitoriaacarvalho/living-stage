import {
  dancePreview,
  parseShowInput,
  parseShowUpdate,
  type Act,
  type ListShowsResponse,
  type Show,
  type ShowDetail,
  type ShowDetailResponse,
  type ShowResponse,
  type ShowSummary,
  type ShowUpdate,
} from '@living-stage/shared';
import { Router } from 'express';
import { prisma } from '../db.ts';
import type { Prisma } from '../generated/prisma/client.ts';
import { toCastMember } from './cast.ts';

export const schoolShowsRouter = Router();

const previewDance = {
  include: {
    cast: { include: { dancer: true }, orderBy: { createdAt: 'asc' } },
    figures: {
      where: { order: 0 },
      select: { positions: { select: { castMemberId: true, x: true, y: true } } },
    },
  },
} satisfies Prisma.DanceDefaultArgs;

const summaryActs = {
  orderBy: { order: 'asc' },
  select: { items: { orderBy: { order: 'asc' }, select: { dance: previewDance } } },
} satisfies Prisma.Show$actsArgs;

const detailActs = {
  orderBy: { order: 'asc' },
  include: {
    items: {
      orderBy: { order: 'asc' },
      include: { dance: { select: { title: true, _count: { select: { cast: true } } } } },
    },
  },
} satisfies Prisma.Show$actsArgs;

schoolShowsRouter.get('/shows', async (_req, res) => {
  const shows = await prisma.show.findMany({
    where: { schoolId: res.locals.schoolId },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
    include: { acts: summaryActs },
  });

  res.json({ shows: shows.map(toShowSummary) } satisfies ListShowsResponse);
});

schoolShowsRouter.post('/shows', async (req, res) => {
  const input = parseShowInput(req.body);
  if (!input) {
    res.status(400).json({ error: 'invalid_show' });
    return;
  }

  const show = await prisma.show.create({
    data: {
      schoolId: res.locals.schoolId,
      ...input,
      date: toDbDate(input.date),
      acts: { create: { order: 0 } },
    },
  });

  res.status(201).json({ show: toShow(show) } satisfies ShowResponse);
});

schoolShowsRouter.get('/shows/:showId', async (req, res) => {
  const show = await prisma.show.findFirst({
    where: { id: req.params.showId, schoolId: res.locals.schoolId },
    include: { acts: detailActs },
  });
  if (!show) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.json({ show: toShowDetail(show) } satisfies ShowDetailResponse);
});

schoolShowsRouter.patch('/shows/:showId', async (req, res) => {
  const update = parseShowUpdate(req.body);
  if (!update) {
    res.status(400).json({ error: 'invalid_show' });
    return;
  }

  const [show] = await prisma.show.updateManyAndReturn({
    where: { id: req.params.showId, schoolId: res.locals.schoolId },
    data: toDbUpdate(update),
  });
  if (!show) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.json({ show: toShow(show) } satisfies ShowResponse);
});

schoolShowsRouter.delete('/shows/:showId', async (req, res) => {
  const { count } = await prisma.show.deleteMany({
    where: { id: req.params.showId, schoolId: res.locals.schoolId },
  });
  if (count === 0) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.status(204).end();
});

// Postgres keeps a DATE as a plain day; Prisma hands it over as midnight UTC.
function toDbDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toDbUpdate({ date, ...rest }: ShowUpdate) {
  return date === undefined ? rest : { ...rest, date: toDbDate(date) };
}

type ShowRow = Omit<Show, 'date' | 'createdAt'> & { date: Date; createdAt: Date };

function toShow({ id, title, date, time, venue, createdAt }: ShowRow): Show {
  return {
    id,
    title,
    date: date.toISOString().slice(0, 10),
    time,
    venue,
    createdAt: createdAt.toISOString(),
  };
}

type SummaryRow = ShowRow & Prisma.ShowGetPayload<{ include: { acts: typeof summaryActs } }>;

function toShowSummary({ acts, ...show }: SummaryRow): ShowSummary {
  const dances = acts.flatMap(({ items }) => items.map(({ dance }) => dance));
  const first = dances[0];
  const preview = first
    ? dancePreview(first.cast.map(toCastMember), first.figures[0]?.positions ?? [], first.colorMode)
    : [];
  return { ...toShow(show), actCount: acts.length, danceCount: dances.length, preview };
}

type DetailRow = ShowRow & Prisma.ShowGetPayload<{ include: { acts: typeof detailActs } }>;

function toAct({ id, order, name, items }: DetailRow['acts'][number]): Act {
  return {
    id,
    order,
    name,
    dances: items.map((item) => ({
      id: item.id,
      danceId: item.danceId,
      title: item.dance.title,
      castCount: item.dance._count.cast,
    })),
  };
}

function toShowDetail({ acts, ...show }: DetailRow): ShowDetail {
  return { ...toShow(show), acts: acts.map(toAct) };
}
