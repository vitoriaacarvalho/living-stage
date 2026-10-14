import { fromNodeHeaders } from 'better-auth/node';
import type { RequestHandler } from 'express';
import { auth } from './auth.ts';

declare module 'express-serve-static-core' {
  interface Locals {
    auth: typeof auth.$Infer.Session;
  }
}

export const requireSession: RequestHandler = async (req, res, next) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  res.locals.auth = session;
  next();
};
