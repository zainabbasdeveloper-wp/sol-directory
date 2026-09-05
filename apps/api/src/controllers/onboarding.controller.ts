import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Provider from '../models/Provider.js';
import DocumentAsset from '../models/DocumentAsset.js';
import { getStorageService } from '../services/s3.service.js';
import { logActivity } from '../models/AdminActivity.js';

const STEP_KEYS = ['org', 'insurance', 'areas', 'team', 'policy', 'billing'];

export async function getOnboarding(req: AuthedRequest, res: Response) {
  const provider = await Provider.findOne({ userId: req.user!.id });
  if (!provider) return res.status(403).json({ error: 'No provider profile for this account' });
  // Previously only returned the step-completion array — the
  // frontend had nothing to pre-fill actual field values with, so a
  // page refresh mid-onboarding looked like data loss even though
  // it was saved. Now returns the real top-level fields too.
  res.json({
    steps: provider.onboarding,
    provider: {
      legalEntityName: provider.legalEntityName,
      abn: provider.abn,
      tradingName: provider.tradingName,
      registrationGroups: provider.registrationGroups,
      serviceSuburbs: provider.serviceSuburbs,
      travelRadiusKm: provider.travelRadiusKm,
      weeklyCapacityHours: provider.weeklyCapacityHours,
      rosterSize: provider.rosterSize,
      afterHoursCover: provider.afterHoursCover,
      incidentPolicyEscalation: provider.incidentPolicyEscalation,
      plan: provider.plan,
    },
  });
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

  // Write real values onto the provider's actual top-level fields —
  // previously this only ever happened for nothing (data sat inside
  // onboarding[].data and nowhere else), so provider.abn and friends
  // stayed empty forever even after "completing" these steps.
  if (stepKey === 'org') {
    if (data.abn) provider.abn = String(data.abn);
    if (data.legalEntityName) provider.legalEntityName = String(data.legalEntityName);
    if (data.tradingName) provider.tradingName = String(data.tradingName);
  }
  if (stepKey === 'insurance' && Array.isArray(data.registrationGroups)) {
    provider.registrationGroups = data.registrationGroups as string[];
  }
  if (stepKey === 'areas') {
    if (Array.isArray(data.serviceSuburbs)) provider.serviceSuburbs = data.serviceSuburbs as string[];
    if (data.travelRadiusKm !== undefined) provider.travelRadiusKm = Number(data.travelRadiusKm);
    if (data.weeklyCapacityHours !== undefined) provider.weeklyCapacityHours = Number(data.weeklyCapacityHours);
  }
  if (stepKey === 'team') {
    if (data.rosterSize !== undefined) provider.rosterSize = Number(data.rosterSize);
    if (data.afterHoursCover) provider.afterHoursCover = String(data.afterHoursCover);
  }
  if (stepKey === 'policy' && data.incidentPolicyEscalation) {
    provider.incidentPolicyEscalation = String(data.incidentPolicyEscalation);
  }

  const existing = provider.onboarding.find((s) => s.key === stepKey);
  if (existing) {
    existing.complete = true;
    existing.data = data;
  } else {
    provider.onboarding.push({ key: stepKey as any, complete: true, data });
  }
  await provider.save();

  const name = provider.tradingName || provider.legalEntityName || 'A provider';
  const allDone = STEP_KEYS.every((k) => provider.onboarding.find((s) => s.key === k)?.complete);
  await logActivity(
    allDone ? 'onboarding_completed' : 'onboarding_step_completed',
    allDone ? `${name} completed onboarding` : `${name} completed the "${stepKey}" onboarding step`
  );

  res.json({ status: 'saved' });
}

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
