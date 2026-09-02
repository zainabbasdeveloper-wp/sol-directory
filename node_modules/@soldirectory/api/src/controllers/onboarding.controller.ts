import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Provider from '../models/Provider.js';
import DocumentAsset from '../models/DocumentAsset.js';
import { getStorageService } from '../services/s3.service.js';

const STEP_KEYS = ['org', 'insurance', 'areas', 'team', 'policy', 'billing'];

export async function getOnboarding(req: AuthedRequest, res: Response) {
  const provider = await Provider.findOne({ userId: req.user!.id });
  if (!provider) return res.status(403).json({ error: 'No provider profile for this account' });
  res.json(provider.onboarding);
}

export async function saveStep(req: AuthedRequest, res: Response) {
  const { stepKey } = req.params;
  const { data } = req.body as { data: Record<string, unknown> };
  if (!STEP_KEYS.includes(stepKey)) return res.status(400).json({ error: 'Unknown step' });

  const provider = await Provider.findOne({ userId: req.user!.id });
  if (!provider) return res.status(403).json({ error: 'No provider profile for this account' });

  if (stepKey === 'org' && data?.abn) {
    const digits = String(data.abn).replace(/\D/g, '');
    if (digits.length !== 11) {
      return res.status(400).json({
        error: `That ABN has ${digits.length} digits. Enter all eleven so we can match your entity on the Commission register.`,
      });
    }
  }
  if (stepKey === 'policy') {
    const hasPolicyDoc = await DocumentAsset.exists({ ownerId: provider._id, kind: 'incident_policy' });
    if (!hasPolicyDoc) {
      return res.status(400).json({ error: 'Upload the incident and complaints policy before marking this step complete.' });
    }
  }

  const existing = provider.onboarding.find((s) => s.key === stepKey);
  if (existing) {
    existing.complete = true;
    existing.data = data;
  } else {
    provider.onboarding.push({ key: stepKey as any, complete: true, data });
  }
  await provider.save();

  res.json({ status: 'saved' });
}

/**
 * Documents never touch this server's memory or MongoDB as file
 * bytes — the client uploads directly to object storage using this
 * signed URL, and we only persist the resulting metadata.
 */
export async function getUploadUrl(req: AuthedRequest, res: Response) {
  const { kind, contentType, filename } = req.body as { kind: string; contentType: string; filename: string };
  const provider = await Provider.findOne({ userId: req.user!.id });
  if (!provider) return res.status(403).json({ error: 'No provider profile for this account' });

  const key = `providers/${provider._id}/${kind}/${Date.now()}-${filename}`;
  const storage = getStorageService();
  const { uploadUrl } = await storage.getUploadUrl(key, contentType);

  await DocumentAsset.create({
    ownerId: provider._id,
    ownerType: 'Provider',
    kind,
    contentType,
    s3Key: key,
    originalFilename: filename,
  });

  res.json({ uploadUrl, key });
}
