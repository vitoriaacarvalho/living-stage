import { toNodeHandler } from 'better-auth/node';
import express from 'express';
import { auth } from './auth/auth.ts';
import { requireSchoolMember } from './auth/require-school-member.ts';
import { requireSession } from './auth/require-session.ts';
import { healthRouter } from './routes/health.ts';
import { invitesRouter, schoolInviteRouter } from './routes/invites.ts';
import { meRouter } from './routes/me.ts';
import { schoolsRouter } from './routes/schools.ts';

export function createApp() {
  const app = express();
  // Before express.json(): Better Auth reads the raw request body itself.
  app.all('/api/auth/*splat', toNodeHandler(auth));
  app.use(express.json());
  app.use('/api', healthRouter);
  app.use('/api', meRouter);
  app.use('/api', schoolsRouter);
  app.use('/api', invitesRouter);
  // Every route under a school passes the membership check here, so none can forget it.
  app.use('/api/schools/:schoolId', requireSession, requireSchoolMember, schoolInviteRouter);
  return app;
}
