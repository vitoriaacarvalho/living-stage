import type { RequestHandler } from 'express';
import { prisma } from '../db.ts';

declare module 'express-serve-static-core' {
  interface Locals {
    schoolId: string;
  }
}

// 404, not 403: another school's data must not even reveal that the school exists.
export const requireSchoolMember: RequestHandler<{ schoolId: string }> = async (req, res, next) => {
  const school = await prisma.school.findFirst({
    where: { id: req.params.schoolId, teachers: { some: { id: res.locals.auth.user.id } } },
    select: { id: true },
  });
  if (!school) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.locals.schoolId = school.id;
  next();
};
