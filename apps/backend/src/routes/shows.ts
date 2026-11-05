import {
  dancePreview,
  parseActDanceInput,
  parseActUpdate,
  parseShowInput,
  parseShowUpdate,
  type Act,
  type ActDanceResponse,
  type ActResponse,
  type ListShowsResponse,
  type Show,
  type ShowDetail,
  type ShowDance,
  type ShowDetailResponse,
  type ShowResponse,
  type ShowSummary,
  type ShowUpdate,
} from '@living-stage/shared';
import { Router } from 'express';
import { prisma } from '../db.ts';
import { Prisma } from '../generated/prisma/client.ts';
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

schoolShowsRouter.post('/shows/:showId/acts', async (req, res) => {
  const act = await addAct(req.params.showId, res.locals.schoolId);
  if (!act) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.status(201).json({ act: toAct(act) } satisfies ActResponse);
});

schoolShowsRouter.patch('/shows/:showId/acts/:actId', async (req, res) => {
  const update = parseActUpdate(req.body);
  if (!update) {
    res.status(400).json({ error: 'invalid_act' });
    return;
  }

  const where = actOfSchool(req.params, res.locals.schoolId);
  const { count } = await prisma.act.updateMany({ where, data: update });
  if (count === 0) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const act = await prisma.act.findUniqueOrThrow({
    where: { id: req.params.actId },
    include: detailActs.include,
  });
  res.json({ act: toAct(act) } satisfies ActResponse);
});

schoolShowsRouter.delete('/shows/:showId/acts/:actId', async (req, res) => {
  const result = await deleteAct(req.params, res.locals.schoolId);
  if (result === 'not_found') {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (result === 'last_act') {
    res.status(409).json({ error: 'last_act' });
    return;
  }
  res.status(204).end();
});

schoolShowsRouter.post('/shows/:showId/acts/:actId/dances', async (req, res) => {
  const input = parseActDanceInput(req.body);
  if (!input) {
    res.status(400).json({ error: 'invalid_act_dance' });
    return;
  }

  let result;
  try {
    result = await addDance(req.params, { schoolId: res.locals.schoolId, ...input });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      throw error;
    }
    res.status(409).json({ error: 'already_in_show' });
    return;
  }
  if (result === 'not_found') {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (result === 'unknown_dance') {
    res.status(400).json({ error: 'invalid_act_dance' });
    return;
  }
  res.status(201).json({ dance: toShowDance(result) } satisfies ActDanceResponse);
});

schoolShowsRouter.delete('/shows/:showId/acts/:actId/dances/:itemId', async (req, res) => {
  const removed = await removeDance(req.params, res.locals.schoolId);
  if (!removed) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.status(204).end();
});

type ActParams = { showId: string; actId: string };

function actOfSchool({ showId, actId }: ActParams, schoolId: string) {
  return { id: actId, showId, show: { schoolId } };
}

function addAct(showId: string, schoolId: string) {
  return prisma.$transaction(async (tx) => {
    const show = await tx.show.findFirst({ where: { id: showId, schoolId }, select: { id: true } });
    if (!show) return null;
    const { _max } = await tx.act.aggregate({ where: { showId }, _max: { order: true } });
    return tx.act.create({
      data: { showId, order: (_max.order ?? -1) + 1 },
      include: detailActs.include,
    });
  });
}

type DanceToAdd = { schoolId: string; danceId: string };

// The unique (showId, danceId) refuses a dance already in the show.
function addDance(params: ActParams, { schoolId, danceId }: DanceToAdd) {
  return prisma.$transaction(async (tx) => {
    const act = await tx.act.findFirst({ where: actOfSchool(params, schoolId) });
    if (!act) return 'not_found' as const;
    const dance = await tx.dance.findFirst({
      where: { id: danceId, schoolId },
      select: { id: true },
    });
    if (!dance) return 'unknown_dance' as const;
    const { _max } = await tx.actItem.aggregate({
      where: { actId: act.id },
      _max: { order: true },
    });
    return tx.actItem.create({
      data: { showId: act.showId, actId: act.id, danceId, order: (_max.order ?? -1) + 1 },
      include: detailActs.include.items.include,
    });
  });
}

type ItemParams = ActParams & { itemId: string };

// The dances after it close the gap, moving past every current order first.
function removeDance({ itemId, ...params }: ItemParams, schoolId: string) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.actItem.findFirst({
      where: { id: itemId, actId: params.actId, act: actOfSchool(params, schoolId) },
    });
    if (!item) return false;
    await tx.actItem.delete({ where: { id: item.id } });
    const rest = await tx.actItem.findMany({
      where: { actId: item.actId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    await tx.actItem.updateMany({
      where: { actId: item.actId },
      data: { order: { increment: rest.length + 1 } },
    });
    for (const [order, { id }] of rest.entries()) {
      await tx.actItem.update({ where: { id }, data: { order } });
    }
    return true;
  });
}

type DeleteActResult = 'deleted' | 'not_found' | 'last_act';

// A show keeps at least one act. The acts after it close the gap: they first move past
// every current order, so no new order collides with one not yet rewritten.
function deleteAct(params: ActParams, schoolId: string): Promise<DeleteActResult> {
  return prisma.$transaction(async (tx) => {
    const act = await tx.act.findFirst({ where: actOfSchool(params, schoolId) });
    if (!act) return 'not_found';
    const acts = await tx.act.findMany({
      where: { showId: params.showId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    if (acts.length === 1) return 'last_act';

    await tx.act.delete({ where: { id: act.id } });
    const rest = acts.filter(({ id }) => id !== act.id);
    await tx.act.updateMany({
      where: { showId: params.showId },
      data: { order: { increment: acts.length } },
    });
    for (const [order, { id }] of rest.entries()) {
      await tx.act.update({ where: { id }, data: { order } });
    }
    return 'deleted';
  });
}

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

type ItemRow = DetailRow['acts'][number]['items'][number];

function toShowDance({ id, danceId, dance }: ItemRow): ShowDance {
  return { id, danceId, title: dance.title, castCount: dance._count.cast };
}

function toAct({ id, order, name, items }: DetailRow['acts'][number]): Act {
  return { id, order, name, dances: items.map(toShowDance) };
}

function toShowDetail({ acts, ...show }: DetailRow): ShowDetail {
  return { ...toShow(show), acts: acts.map(toAct) };
}
