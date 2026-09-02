/**
 * Verification documents are sensitive personal information and must
 * never be stored as raw bytes in MongoDB — only metadata (see
 * DocumentAsset model). This service is the only place that talks to
 * object storage.
 *
 * Ships with a stub implementation so the app runs without AWS
 * credentials configured. Swap `createStorageService()`'s body for a
 * real `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
 * implementation once S3_* env vars are set — the interface below is
 * what the rest of the app codes against, so nothing else changes.
 */
export interface StorageService {
  /** Returns a short-lived signed PUT URL the client uploads directly to. */
  getUploadUrl(key: string, contentType: string): Promise<{ uploadUrl: string; key: string }>;
  /** Returns a short-lived signed GET URL for an admin/owner to view a document. */
  getDownloadUrl(key: string): Promise<string>;
}

class StubStorageService implements StorageService {
  async getUploadUrl(key: string, contentType: string) {
    console.warn(
      '[storage] S3 is not configured — returning a stub upload URL. Set S3_* env vars and swap in a real implementation before handling real documents.'
    );
    return { uploadUrl: `https://stub-storage.local/upload/${key}?contentType=${contentType}`, key };
  }

  async getDownloadUrl(key: string) {
    console.warn('[storage] S3 is not configured — returning a stub download URL.');
    return `https://stub-storage.local/download/${key}`;
  }
}

let instance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!instance) {
    // TODO: if (process.env.S3_ACCESS_KEY_ID) instance = new S3StorageService(); else ...
    instance = new StubStorageService();
  }
  return instance;
}
