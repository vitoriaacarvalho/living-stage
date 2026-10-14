import { toNodeHandler } from 'better-auth/node';
import express from 'express';
import { auth } from './auth/auth.ts';
import { healthRouter } from './routes/health.ts';
import { meRouter } from './routes/me.ts';

export function createApp() {
  const app = express();
  // Before express.json(): Better Auth reads the raw request body itself.
  app.all('/api/auth/*splat', toNodeHandler(auth));
  app.use(express.json());
  app.use('/api', healthRouter);
  app.use('/api', meRouter);
  return app;
}
