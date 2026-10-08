import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageService {
  getUploadUrl(key: string, contentType: string): Promise<{ uploadUrl: string; key: string }>;
  getDownloadUrl(key: string): Promise<string>;
  getObjectMetadata(key: string): Promise<{ contentType?: string; size: number }>;
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super('Document storage is not configured');
    this.name = 'StorageNotConfiguredError';
  }
}

class UnconfiguredStorageService implements StorageService {
  async getUploadUrl(): Promise<never> {
    throw new StorageNotConfiguredError();
  }
  async getDownloadUrl(): Promise<never> {
    throw new StorageNotConfiguredError();
  }
  async getObjectMetadata(): Promise<never> {
    throw new StorageNotConfiguredError();
  }
}

class S3StorageService implements StorageService {
  private readonly client: S3Client;

  constructor(private readonly bucket: string, region: string) {
    this.client = new S3Client({
      region,
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    });
  }

  async getUploadUrl(key: string, contentType: string) {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    return { uploadUrl: await getSignedUrl(this.client, command, { expiresIn: 300 }), key };
  }

  async getDownloadUrl(key: string) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: 300 });
  }

  async getObjectMetadata(key: string) {
    const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    return { contentType: result.ContentType, size: result.ContentLength ?? 0 };
  }
}

let instance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!instance) {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION;
    instance = bucket && region ? new S3StorageService(bucket, region) : new UnconfiguredStorageService();
  }
  return instance;
}
