import { parseSchoolName, type CreateSchoolResponse } from '@living-stage/shared';
import { Router } from 'express';
import { requireSession } from '../auth/require-session.ts';
import { prisma } from '../db.ts';

export const schoolsRouter = Router();

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

  res.status(201).json({
    school: { id: school.id, name: school.name, createdAt: school.createdAt.toISOString() },
  } satisfies CreateSchoolResponse);
});
