import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  NotFound,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Long enough to send 30 MB on a slow connection.
export const UPLOAD_LINK_SECONDS = 10 * 60;
// A rehearsal can keep one song open for hours; the player reads it in ranges as it plays.
export const READ_LINK_SECONDS = 6 * 60 * 60;

export type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export function createStorage(config: StorageConfig) {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    // Bucket in the path (host/bucket/key): what SeaweedFS needs, and R2 accepts.
    forcePathStyle: true,
    // The SDK's default checksums end up in signed links, and a browser upload can't send them.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  const object = { Bucket: config.bucket };

  return {
    // The browser must send the same Content-Type, since it is part of the signature.
    uploadUrl: (key: string, contentType: string) =>
      getSignedUrl(
        client,
        new PutObjectCommand({ ...object, Key: key, ContentType: contentType }),
        {
          expiresIn: UPLOAD_LINK_SECONDS,
          signableHeaders: new Set(['content-type']),
        },
      ),

    readUrl: (key: string) =>
      getSignedUrl(client, new GetObjectCommand({ ...object, Key: key }), {
        expiresIn: READ_LINK_SECONDS,
      }),

    // Creates the bucket if needed and lets the web app upload and play from it.
    async prepare(webOrigin: string) {
      try {
        await client.send(new HeadBucketCommand(object));
      } catch (error) {
        if (!(error instanceof NotFound)) throw error;
        await client.send(new CreateBucketCommand(object));
      }
      await client.send(
        new PutBucketCorsCommand({
          ...object,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: [webOrigin],
                AllowedMethods: ['GET', 'HEAD', 'PUT'],
                AllowedHeaders: ['*'],
                ExposeHeaders: ['Content-Length', 'Content-Range', 'ETag'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );
    },

    remove: async (key: string) => {
      await client.send(new DeleteObjectCommand({ ...object, Key: key }));
    },

    // The stored size in bytes, or null when nothing was uploaded under the key.
    async size(key: string): Promise<number | null> {
      try {
        const head = await client.send(new HeadObjectCommand({ ...object, Key: key }));
        return head.ContentLength ?? null;
      } catch (error) {
        if (error instanceof NotFound) return null;
        throw error;
      }
    },
  };
}

export type Storage = ReturnType<typeof createStorage>;

export const storage = createStorage({
  endpoint: process.env.S3_ENDPOINT ?? '',
  region: process.env.S3_REGION ?? 'auto',
  bucket: process.env.S3_BUCKET ?? '',
  accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
});
