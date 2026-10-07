import { APP_NAME } from '@living-stage/shared';
import { createApp } from './app.ts';

const port = Number(process.env.PORT ?? 3000);

createApp().listen(port, () => {
  console.log(`${APP_NAME} API on http://localhost:${port}`);
});
