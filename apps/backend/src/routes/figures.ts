import {
  parseFigureCopy,
  parseFigureOrder,
  parseFigureUpdate,
  parsePositionsUpdate,
  type Figure,
  type FigureCopy,
  type FigureOrder,
  type FigureResponse,
  type ListFiguresResponse,
  type PositionsUpdate,
} from '@living-stage/shared';
import { Router } from 'express';
import { prisma } from '../db.ts';
import type { Prisma } from '../generated/prisma/client.ts';

export const schoolFiguresRouter = Router();

const positionFields = { select: { castMemberId: true, x: true, y: true } } as const;

schoolFiguresRouter.get('/dances/:danceId/figures', async (req, res) => {
  const dance = await prisma.dance.findFirst({
    where: { id: req.params.danceId, schoolId: res.locals.schoolId },
    select: {
      figures: {
        orderBy: { order: 'asc' },
        include: { positions: positionFields },
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
    include: { positions: positionFields },
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

// The copy keeps every position but not the name, so it shows as "Figure N" until renamed.
function copyFigure(danceId: string, { copyOf, placement }: FigureCopy) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.figure.findFirst({
      where: { id: copyOf, danceId },
      include: { positions: positionFields },
    });
    if (!source) return null;

    const { _max } = await tx.figure.aggregate({ where: { danceId }, _max: { order: true } });
    const last = _max.order ?? source.order;
    const order = placement === 'end' ? last + 1 : source.order + 1;
    if (order <= last) await shiftOrders(tx, danceId, { from: order, last, by: 1 });

    return tx.figure.create({
      data: { danceId, order, positions: { create: source.positions } },
      include: { positions: positionFields },
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
      include: { positions: positionFields },
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
      include: { positions: positionFields },
    });
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

function toFigure({ id, order, name, positions }: Figure): Figure {
  return { id, order, name, positions };
}
