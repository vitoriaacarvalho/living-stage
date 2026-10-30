import {
  parseFigureCopy,
  parseFigureUpdate,
  type Figure,
  type FigureCopy,
  type FigureResponse,
  type ListFiguresResponse,
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
    if (order <= last) await makeRoom(tx, danceId, { from: order, last });

    return tx.figure.create({
      data: { danceId, order, positions: { create: source.positions } },
      include: { positions: positionFields },
    });
  });
}

// Postgres checks the unique (danceId, order) row by row, so shifting by one in a
// single update would collide. The figures from `from` on first move past the last
// order, then come back down to one place later than they were.
async function makeRoom(
  tx: Prisma.TransactionClient,
  danceId: string,
  { from, last }: { from: number; last: number },
) {
  const away = last + 1;
  await tx.figure.updateMany({
    where: { danceId, order: { gte: from } },
    data: { order: { increment: away } },
  });
  await tx.figure.updateMany({
    where: { danceId, order: { gte: from + away } },
    data: { order: { decrement: away - 1 } },
  });
}

function danceOfSchool(danceId: string, schoolId: string) {
  return prisma.dance.findFirst({ where: { id: danceId, schoolId }, select: { id: true } });
}

function toFigure({ id, order, name, positions }: Figure): Figure {
  return { id, order, name, positions };
}
