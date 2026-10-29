import type { Figure, ListFiguresResponse } from '@living-stage/shared';
import { Router } from 'express';
import { prisma } from '../db.ts';

export const schoolFiguresRouter = Router();

schoolFiguresRouter.get('/dances/:danceId/figures', async (req, res) => {
  const dance = await prisma.dance.findFirst({
    where: { id: req.params.danceId, schoolId: res.locals.schoolId },
    select: {
      figures: {
        orderBy: { order: 'asc' },
        include: { positions: { select: { castMemberId: true, x: true, y: true } } },
      },
    },
  });
  if (!dance) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.json({ figures: dance.figures.map(toFigure) } satisfies ListFiguresResponse);
});

function toFigure({ id, order, name, positions }: Figure): Figure {
  return { id, order, name, positions };
}
