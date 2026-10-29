import {
  parseCastMemberInput,
  type CastMember,
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
  const dancer = await prisma.dancer.findFirst({
    where: { id: input.dancerId, schoolId: res.locals.schoolId },
  });
  if (!dancer) {
    res.status(400).json({ error: 'invalid_cast_member' });
    return;
  }

  try {
    const castMember = await prisma.castMember.create({
      data: { danceId: req.params.danceId, ...input },
      include: { dancer: true },
    });
    res.status(201).json({ castMember: toCastMember(castMember) } satisfies CastMemberResponse);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    res.status(409).json({ error: 'already_cast' });
  }
});

function danceOfSchool(danceId: string, schoolId: string) {
  return prisma.dance.findFirst({ where: { id: danceId, schoolId }, select: { id: true } });
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
