import {
  parseSchoolName,
  type CreateSchoolResponse,
  type ListSchoolsResponse,
  type School,
} from '@living-stage/shared';
import { Router } from 'express';
import { requireSession } from '../auth/require-session.ts';
import { prisma } from '../db.ts';

export const schoolsRouter = Router();

schoolsRouter.get('/schools', requireSession, async (_req, res) => {
  const schools = await prisma.school.findMany({
    where: { teachers: { some: { id: res.locals.auth.user.id } } },
    orderBy: { name: 'asc' },
  });

  res.json({ schools: schools.map(toSchool) } satisfies ListSchoolsResponse);
});

schoolsRouter.post('/schools', requireSession, async (req, res) => {
  const name = parseSchoolName(req.body?.name);
  if (!name) {
    res.status(400).json({ error: 'invalid_name' });
    return;
  }

  const userId = res.locals.auth.user.id;
  const school = await prisma.school.create({
    data: { name, createdById: userId, teachers: { connect: { id: userId } } },
  });

  res.status(201).json({ school: toSchool(school) } satisfies CreateSchoolResponse);
});

function toSchool({ id, name, createdAt }: { id: string; name: string; createdAt: Date }): School {
  return { id, name, createdAt: createdAt.toISOString() };
}
