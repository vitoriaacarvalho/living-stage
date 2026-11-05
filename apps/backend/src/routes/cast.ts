import {
  CAST_MAX_SIZE,
  nextWingSpot,
  parseCastMemberInput,
  parseCastMemberUpdate,
  type CastMember,
  type CastMemberCreatedResponse,
  type CastMemberInput,
  type CastMemberResponse,
  type ListCastResponse,
} from '@living-stage/shared';
import { Router } from 'express';
import { prisma } from '../db.ts';
import { Prisma } from '../generated/prisma/client.ts';
import { toDancer } from './dancers.ts';

export const schoolCastRouter = Router();

schoolCastRouter.get('/dances/:danceId/cast', async (req, res) => {
  if (!(await danceOfSchool(req.params.danceId, res.locals.schoolId))) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const cast = await prisma.castMember.findMany({
    where: { danceId: req.params.danceId },
    include: { dancer: true },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ cast: cast.map(toCastMember) } satisfies ListCastResponse);
});

schoolCastRouter.post('/dances/:danceId/cast', async (req, res) => {
  const input = parseCastMemberInput(req.body);
  if (!input) {
    res.status(400).json({ error: 'invalid_cast_member' });
    return;
  }
  if (!(await danceOfSchool(req.params.danceId, res.locals.schoolId))) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (!(await dancerOfSchool(input.dancerId, res.locals.schoolId))) {
    res.status(400).json({ error: 'invalid_cast_member' });
    return;
  }

  try {
    const created = await castIntoEveryFigure(req.params.danceId, input);
    if (!created) {
      res.status(409).json({ error: 'cast_full' });
      return;
    }
    res.status(201).json(created satisfies CastMemberCreatedResponse);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    res.status(409).json({ error: 'already_cast' });
  }
});

schoolCastRouter.patch('/dances/:danceId/cast/:castMemberId', async (req, res) => {
  const update = parseCastMemberUpdate(req.body);
  if (!update) {
    res.status(400).json({ error: 'invalid_cast_member' });
    return;
  }

  if (update.dancerId && !(await dancerOfSchool(update.dancerId, res.locals.schoolId))) {
    res.status(400).json({ error: 'invalid_cast_member' });
    return;
  }

  let castMember;
  try {
    [castMember] = await prisma.castMember.updateManyAndReturn({
      where: castMemberOfSchool(req.params, res.locals.schoolId),
      data: update,
      include: { dancer: true },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    res.status(409).json({ error: 'already_cast' });
    return;
  }
  if (!castMember) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.json({ castMember: toCastMember(castMember) } satisfies CastMemberResponse);
});

schoolCastRouter.delete('/dances/:danceId/cast/:castMemberId', async (req, res) => {
  const { count } = await prisma.castMember.deleteMany({
    where: castMemberOfSchool(req.params, res.locals.schoolId),
  });
  if (count === 0) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.status(204).end();
});

// Gives null when the dance already holds CAST_MAX_SIZE dancers.
function castIntoEveryFigure(danceId: string, input: CastMemberInput) {
  return prisma.$transaction(async (tx) => {
    if ((await tx.castMember.count({ where: { danceId } })) >= CAST_MAX_SIZE) return null;
    const figures = await tx.figure.findMany({
      where: { danceId },
      orderBy: { order: 'asc' },
      include: { positions: true },
    });
    const spots = figures.map((figure) => ({
      figureId: figure.id,
      ...nextWingSpot(figure.positions),
    }));
    const castMember = await tx.castMember.create({
      data: { danceId, ...input, positions: { create: spots } },
      include: { dancer: true },
    });
    return {
      castMember: toCastMember(castMember),
      positions: spots.map((spot) => ({ castMemberId: castMember.id, ...spot })),
    };
  });
}

function danceOfSchool(danceId: string, schoolId: string) {
  return prisma.dance.findFirst({ where: { id: danceId, schoolId }, select: { id: true } });
}

function dancerOfSchool(dancerId: string, schoolId: string) {
  return prisma.dancer.findFirst({ where: { id: dancerId, schoolId }, select: { id: true } });
}

type CastMemberParams = { danceId: string; castMemberId: string };

function castMemberOfSchool({ danceId, castMemberId }: CastMemberParams, schoolId: string) {
  return { id: castMemberId, danceId, dance: { schoolId } };
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

type CastMemberRow = {
  id: string;
  role: string | null;
  dancer: { id: string; name: string; color: number | null } | null;
};

export function toCastMember({ id, role, dancer }: CastMemberRow): CastMember {
  return { id, role, dancer: dancer && toDancer(dancer) };
}
