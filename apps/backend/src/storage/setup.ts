import { storage } from './storage.ts';

const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

await storage.prepare(webOrigin);
console.log(`Bucket ${process.env.S3_BUCKET} is ready for uploads from ${webOrigin}`);
