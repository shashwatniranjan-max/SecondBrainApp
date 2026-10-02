import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const getClient = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing Cloudflare R2 environment variables');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

export const r2Service = {
  uploadPdf: async (buffer: Buffer, objectKey: string, mimeType: string): Promise<void> => {
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) throw new Error('Missing R2_BUCKET_NAME');

    const client = getClient();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: mimeType,
    });

    await client.send(command);
  },

  getPresignedPdfUrl: async (objectKey: string): Promise<string> => {
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) throw new Error('Missing R2_BUCKET_NAME');

    const client = getClient();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    });

    // Generate a presigned URL valid for 1 hour
    return await getSignedUrl(client, command, { expiresIn: 3600 });
  },

  deletePdf: async (objectKey: string): Promise<void> => {
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) throw new Error('Missing R2_BUCKET_NAME');

    const client = getClient();
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    });

    await client.send(command);
  },
};
