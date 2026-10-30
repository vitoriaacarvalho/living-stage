import {
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
    const created = await castIntoFirstFigure(req.params.danceId, input);
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

function castIntoFirstFigure(danceId: string, input: CastMemberInput) {
  return prisma.$transaction(async (tx) => {
    const figure = await tx.figure.findUniqueOrThrow({
      where: { danceId_order: { danceId, order: 0 } },
      include: { positions: true },
    });
    const spot = nextWingSpot(figure.positions);
    const castMember = await tx.castMember.create({
      data: { danceId, ...input, positions: { create: { figureId: figure.id, ...spot } } },
      include: { dancer: true },
    });
    return {
      castMember: toCastMember(castMember),
      position: { castMemberId: castMember.id, ...spot },
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

function toCastMember({ id, role, dancer }: CastMemberRow): CastMember {
  return { id, role, dancer: dancer && toDancer(dancer) };
}
