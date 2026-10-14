import type { MeResponse } from '@living-stage/shared';
import { Router } from 'express';
import { requireSession } from '../auth/require-session.ts';

export const meRouter = Router();

meRouter.get('/me', requireSession, (_req, res) => {
  const { id, name, email, image } = res.locals.auth.user;
  res.json({ user: { id, name, email, image: image ?? null } } satisfies MeResponse);
});
