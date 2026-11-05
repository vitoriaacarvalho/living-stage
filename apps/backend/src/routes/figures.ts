import {
  parseFigureCopy,
  parseFigureOrder,
  parseFigureUpdate,
  parsePathUpdate,
  parsePositionsUpdate,
  type Figure,
  type FigureCopy,
  type FigureOrder,
  type FigureResponse,
  type ListFiguresResponse,
  type PathPoint,
  type PathResponse,
  type PathUpdate,
  type PositionsUpdate,
} from '@living-stage/shared';
import { Router } from 'express';
import { prisma } from '../db.ts';
import type { Prisma } from '../generated/prisma/client.ts';

export const schoolFiguresRouter = Router();

const figureFields = {
  positions: { select: { castMemberId: true, x: true, y: true } },
  paths: { select: { castMemberId: true, points: true } },
} as const;

schoolFiguresRouter.get('/dances/:danceId/figures', async (req, res) => {
  const dance = await prisma.dance.findFirst({
    where: { id: req.params.danceId, schoolId: res.locals.schoolId },
    select: {
      figures: {
        orderBy: { order: 'asc' },
        include: figureFields,
      },
    },
  });
  if (!dance) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.json({ figures: dance.figures.map(toFigure) } satisfies ListFiguresResponse);
});

schoolFiguresRouter.post('/dances/:danceId/figures', async (req, res) => {
  const copy = parseFigureCopy(req.body);
  if (!copy) {
    res.status(400).json({ error: 'invalid_figure' });
    return;
  }
  if (!(await danceOfSchool(req.params.danceId, res.locals.schoolId))) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const figure = await copyFigure(req.params.danceId, copy);
  if (!figure) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.status(201).json({ figure: toFigure(figure) } satisfies FigureResponse);
});

schoolFiguresRouter.put('/dances/:danceId/figures/order', async (req, res) => {
  const order = parseFigureOrder(req.body);
  if (!order) {
    res.status(400).json({ error: 'invalid_figure_order' });
    return;
  }
  if (!(await danceOfSchool(req.params.danceId, res.locals.schoolId))) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const figures = await reorderFigures(req.params.danceId, order);
  if (!figures) {
    res.status(400).json({ error: 'invalid_figure_order' });
    return;
  }
  res.json({ figures: figures.map(toFigure) } satisfies ListFiguresResponse);
});

schoolFiguresRouter.patch('/dances/:danceId/figures/:figureId', async (req, res) => {
  const update = parseFigureUpdate(req.body);
  if (!update) {
    res.status(400).json({ error: 'invalid_figure' });
    return;
  }

  const { count } = await prisma.figure.updateMany({
    where: {
      id: req.params.figureId,
      danceId: req.params.danceId,
      dance: { schoolId: res.locals.schoolId },
    },
    data: update,
  });
  if (count === 0) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const figure = await prisma.figure.findUniqueOrThrow({
    where: { id: req.params.figureId },
    include: figureFields,
  });
  res.json({ figure: toFigure(figure) } satisfies FigureResponse);
});

schoolFiguresRouter.put('/dances/:danceId/figures/:figureId/positions', async (req, res) => {
  const update = parsePositionsUpdate(req.body);
  if (!update) {
    res.status(400).json({ error: 'invalid_positions' });
    return;
  }
  if (!(await danceOfSchool(req.params.danceId, res.locals.schoolId))) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const result = await movePositions(req.params.danceId, req.params.figureId, update);
  if (result === 'not_found') {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (result === 'unknown_cast') {
    res.status(400).json({ error: 'invalid_positions' });
    return;
  }
  res.json({ figure: toFigure(result) } satisfies FigureResponse);
});

schoolFiguresRouter.put(
  '/dances/:danceId/figures/:figureId/paths/:castMemberId',
  async (req, res) => {
    const update = parsePathUpdate(req.body);
    if (!update) {
      res.status(400).json({ error: 'invalid_path' });
      return;
    }
    if (!(await danceOfSchool(req.params.danceId, res.locals.schoolId))) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const { danceId, figureId, castMemberId } = req.params;
    const result = await bendPath({ danceId, figureId, castMemberId }, update);
    if (result === 'not_found') {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    if (result === 'first_figure') {
      res.status(400).json({ error: 'first_figure' });
      return;
    }
    res.json({ path: { castMemberId, points: update.points } } satisfies PathResponse);
  },
);

// A path that isn't there is already straight, so this answers 204 either way.
schoolFiguresRouter.delete(
  '/dances/:danceId/figures/:figureId/paths/:castMemberId',
  async (req, res) => {
    if (!(await danceOfSchool(req.params.danceId, res.locals.schoolId))) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const { danceId, figureId, castMemberId } = req.params;
    await prisma.path.deleteMany({ where: { figureId, castMemberId, figure: { danceId } } });
    res.status(204).end();
  },
);

schoolFiguresRouter.delete('/dances/:danceId/figures/:figureId', async (req, res) => {
  if (!(await danceOfSchool(req.params.danceId, res.locals.schoolId))) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const result = await deleteFigure(req.params.danceId, req.params.figureId);
  if (result === 'not_found') {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (result === 'last_figure') {
    res.status(409).json({ error: 'last_figure' });
    return;
  }
  res.status(204).end();
});

// The copy keeps every position and the time to arrive but not the name, so it shows as
// "Figure N" until renamed.
function copyFigure(danceId: string, { copyOf, placement }: FigureCopy) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.figure.findFirst({
      where: { id: copyOf, danceId },
      include: figureFields,
    });
    if (!source) return null;

    const { _max } = await tx.figure.aggregate({ where: { danceId }, _max: { order: true } });
    const last = _max.order ?? source.order;
    const order = placement === 'end' ? last + 1 : source.order + 1;
    if (order <= last) await shiftOrders(tx, danceId, { from: order, last, by: 1 });

    return tx.figure.create({
      data: {
        danceId,
        order,
        transitionMs: source.transitionMs,
        positions: { create: source.positions },
      },
      include: figureFields,
    });
  });
}

// Every figure first moves past the current orders, so no new order can collide with
// one not yet rewritten.
function reorderFigures(danceId: string, { figureIds }: FigureOrder) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.figure.findMany({ where: { danceId }, select: { id: true } });
    const known = new Set(current.map(({ id }) => id));
    if (figureIds.length !== known.size || !figureIds.every((id) => known.has(id))) return null;

    await tx.figure.updateMany({ where: { danceId }, data: { order: { increment: known.size } } });
    for (const [order, id] of figureIds.entries()) {
      await tx.figure.update({ where: { id }, data: { order } });
    }
    return tx.figure.findMany({
      where: { danceId },
      orderBy: { order: 'asc' },
      include: figureFields,
    });
  });
}

// Every cast member has a spot in every figure, so each listed one is an update.
function movePositions(danceId: string, figureId: string, { positions }: PositionsUpdate) {
  return prisma.$transaction(async (tx) => {
    const figure = await tx.figure.findFirst({ where: { id: figureId, danceId } });
    if (!figure) return 'not_found';
    const castMemberIds = positions.map(({ castMemberId }) => castMemberId);
    const cast = await tx.castMember.count({ where: { danceId, id: { in: castMemberIds } } });
    if (cast !== castMemberIds.length) return 'unknown_cast';

    for (const { castMemberId, x, y } of positions) {
      await tx.position.update({
        where: { figureId_castMemberId: { figureId, castMemberId } },
        data: { x, y },
      });
    }
    return tx.figure.findUniqueOrThrow({
      where: { id: figureId },
      include: figureFields,
    });
  });
}

type PathKey = { danceId: string; figureId: string; castMemberId: string };

// Nothing arrives into the first figure, so it holds no paths.
function bendPath({ danceId, figureId, castMemberId }: PathKey, { points }: PathUpdate) {
  return prisma.$transaction(async (tx) => {
    const figure = await tx.figure.findFirst({ where: { id: figureId, danceId } });
    const cast = await tx.castMember.count({ where: { id: castMemberId, danceId } });
    if (!figure || cast === 0) return 'not_found';
    if (figure.order === 0) return 'first_figure';

    await tx.path.upsert({
      where: { figureId_castMemberId: { figureId, castMemberId } },
      create: { figureId, castMemberId, points },
      update: { points },
    });
    return 'bent';
  });
}

type DeleteResult = 'deleted' | 'not_found' | 'last_figure';

// A dance always keeps at least one figure; the later figures close the gap.
function deleteFigure(danceId: string, figureId: string): Promise<DeleteResult> {
  return prisma.$transaction(async (tx) => {
    const figure = await tx.figure.findFirst({ where: { id: figureId, danceId } });
    if (!figure) return 'not_found';
    const { _count, _max } = await tx.figure.aggregate({
      where: { danceId },
      _count: true,
      _max: { order: true },
    });
    if (_count === 1) return 'last_figure';

    await tx.figure.delete({ where: { id: figureId } });
    const last = _max.order ?? figure.order;
    if (figure.order < last) {
      await shiftOrders(tx, danceId, { from: figure.order + 1, last, by: -1 });
    }
    return 'deleted';
  });
}

type Shift = { from: number; last: number; by: 1 | -1 };

// Postgres checks the unique (danceId, order) row by row, so shifting by one in a
// single update would collide. The figures from `from` on first move past the last
// order, then come back to one place later (by 1) or earlier (by -1) than they were.
async function shiftOrders(
  tx: Prisma.TransactionClient,
  danceId: string,
  { from, last, by }: Shift,
) {
  const away = last + 1;
  await tx.figure.updateMany({
    where: { danceId, order: { gte: from } },
    data: { order: { increment: away } },
  });
  await tx.figure.updateMany({
    where: { danceId, order: { gte: from + away } },
    data: { order: { decrement: away - by } },
  });
}

function danceOfSchool(danceId: string, schoolId: string) {
  return prisma.dance.findFirst({ where: { id: danceId, schoolId }, select: { id: true } });
}

type FigureRow = Omit<Figure, 'paths'> & {
  paths: { castMemberId: string; points: Prisma.JsonValue }[];
};

// points is JSON in the database and only ever written after parsePathPoints.
function toFigure({ id, order, name, transitionMs, positions, paths }: FigureRow): Figure {
  const bent = paths.map(({ castMemberId, points }) => ({
    castMemberId,
    points: points as PathPoint[],
  }));
  return { id, order, name, transitionMs, positions, paths: bent };
}
