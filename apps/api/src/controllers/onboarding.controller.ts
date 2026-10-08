import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Provider from '../models/Provider.js';
import DocumentAsset from '../models/DocumentAsset.js';
import { getStorageService, StorageNotConfiguredError } from '../services/s3.service.js';
import { logActivity } from '../models/AdminActivity.js';
import { geocodeAddress } from '../services/geocoding.service.js';
import { generateUniqueProviderSlug } from '../utils/slugify.js';
import { getActiveProviderForUser } from '../utils/getActiveProvider.js';
import { syncProviderToWordPress } from '../services/wordpressSync.service.js';

const STEP_KEYS = ['org', 'insurance', 'areas', 'team', 'policy', 'billing'];
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const POLICY_KIND = 'incident_policy';
const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function validatePolicyDocument(input: { kind: string; contentType: string; filename: string; size: number }) {
  if (input.kind !== POLICY_KIND) return 'Unsupported document kind';
  if (!ALLOWED_DOCUMENT_TYPES.has(input.contentType)) return 'Upload a PDF, DOC, or DOCX document';
  if (!input.filename || input.filename.length > 180) return 'Filename is required and must be under 180 characters';
  if (!Number.isInteger(input.size) || input.size < 1 || input.size > MAX_DOCUMENT_BYTES) {
    return 'Document must be no larger than 10 MB';
  }
  return null;
}

export async function getOnboarding(req: AuthedRequest, res: Response) {
  const provider = await getActiveProviderForUser(req.user!.id);
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
      lastCapacityConfirmedAt: provider.lastCapacityConfirmedAt ?? null,
      listingPaused: provider.listingPaused,
      smsNotifications: !!provider.smsNotifications,
    },
  });
}

export async function saveStep(req: AuthedRequest, res: Response) {
  const { stepKey } = req.params;
  const { data } = req.body as { data: Record<string, unknown> };
  if (!STEP_KEYS.includes(stepKey)) return res.status(400).json({ error: 'Unknown step' });

  const provider = await getActiveProviderForUser(req.user!.id);
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
    const hasPolicyDoc = await DocumentAsset.exists({ ownerId: provider._id, kind: POLICY_KIND, status: 'complete' });
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

    // Real structured address (spec item 15) — each part stored
    // separately so it's independently queryable (e.g. "providers in
    // NSW") rather than needing to parse a single free-text string.
    const addr = data.businessAddress as Record<string, string> | undefined;
    if (addr && typeof addr === 'object') {
      provider.businessAddress = {
        address: addr.address ? String(addr.address) : undefined,
        suburb: addr.suburb ? String(addr.suburb) : undefined,
        state: addr.state ? String(addr.state) : undefined,
        postcode: addr.postcode ? String(addr.postcode) : undefined,
        country: addr.country ? String(addr.country) : 'Australia',
      };

      // Geocode the real structured address — more precise than the
      // areas step's suburb-only fallback below. Never blocks saving
      // the step if it fails, same principle as every other
      // geocodeAddress call in this codebase.
      const fullAddress = [addr.address, addr.suburb, addr.state, addr.postcode, addr.country || 'Australia']
        .filter(Boolean)
        .join(', ');
      if (fullAddress) {
        const geo = await geocodeAddress(fullAddress);
        if (geo) provider.location = { type: 'Point', coordinates: [geo.lng, geo.lat] };
      }
    }

    // Generate the public slug once a real business name exists —
    // never regenerate it on subsequent edits, since that would
    // break any link/bookmark already pointing at the old slug.
    if (!provider.slug) {
      const name = provider.tradingName || provider.legalEntityName;
      if (name) provider.slug = await generateUniqueProviderSlug(name);
    }
  }
  if (stepKey === 'insurance' && Array.isArray(data.registrationGroups)) {
    provider.registrationGroups = data.registrationGroups as string[];
  }
  if (stepKey === 'areas') {
    if (Array.isArray(data.serviceSuburbs)) provider.serviceSuburbs = data.serviceSuburbs as string[];
    if (data.travelRadiusKm !== undefined) provider.travelRadiusKm = Number(data.travelRadiusKm);
    if (data.weeklyCapacityHours !== undefined) provider.weeklyCapacityHours = Number(data.weeklyCapacityHours);

    // Geocode the first listed suburb as a fallback ONLY if the org
    // step's real structured business address didn't already produce
    // a more precise geocode — never overwrite a precise address
    // geocode with a less precise suburb-only one. Failure here must
    // never block saving the step — geocodeAddress already returns
    // null rather than throwing.
    if (!provider.location?.coordinates?.length) {
      const firstSuburb = provider.serviceSuburbs?.[0];
      if (firstSuburb) {
        const geo = await geocodeAddress(`${firstSuburb}, Australia`);
        if (geo) provider.location = { type: 'Point', coordinates: [geo.lng, geo.lat] };
      }
    }
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

  // Fire-and-forget — a WordPress outage must never block saving an
  // onboarding step. Only worth attempting once the provider has a
  // real name (buildMetaPayload's own guard skips it otherwise).
  syncProviderToWordPress(String(provider._id)).catch(() => {});

  const name = provider.tradingName || provider.legalEntityName || 'A provider';
  const allDone = STEP_KEYS.every((k) => provider.onboarding.find((s) => s.key === k)?.complete);
  await logActivity(
    allDone ? 'onboarding_completed' : 'onboarding_step_completed',
    allDone ? `${name} completed onboarding` : `${name} completed the "${stepKey}" onboarding step`
  );

  res.json({ status: 'saved' });
}

export async function getUploadUrl(req: AuthedRequest, res: Response) {
  const { kind, contentType, filename, size } = req.body as {
    kind: string; contentType: string; filename: string; size: number;
  };
  const provider = await getActiveProviderForUser(req.user!.id);
  if (!provider) return res.status(403).json({ error: 'No provider profile for this account' });

  const validationError = validatePolicyDocument({ kind, contentType, filename, size });
  if (validationError) return res.status(400).json({ error: validationError });

  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `providers/${provider._id}/${kind}/${Date.now()}-${safeFilename}`;
  try {
    const { uploadUrl } = await getStorageService().getUploadUrl(key, contentType);
    return res.json({ uploadUrl, key });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return res.status(503).json({ error: 'Document uploads are temporarily unavailable. Please contact support.' });
    }
    throw error;
  }
}

export async function completeUpload(req: AuthedRequest, res: Response) {
  const { kind, contentType, filename, size, key } = req.body as {
    kind: string; contentType: string; filename: string; size: number; key: string;
  };
  const provider = await getActiveProviderForUser(req.user!.id);
  if (!provider) return res.status(403).json({ error: 'No provider profile for this account' });

  const validationError = validatePolicyDocument({ kind, contentType, filename, size });
  if (validationError) return res.status(400).json({ error: validationError });

  const expectedPrefix = `providers/${provider._id}/${kind}/`;
  if (!key?.startsWith(expectedPrefix)) return res.status(400).json({ error: 'Invalid upload key' });

  try {
    const metadata = await getStorageService().getObjectMetadata(key);
    if (metadata.size !== size || metadata.size > MAX_DOCUMENT_BYTES || metadata.contentType !== contentType) {
      return res.status(400).json({ error: 'Uploaded document does not match the requested file' });
    }

    await DocumentAsset.findOneAndUpdate(
      { ownerId: provider._id, kind },
      {
        ownerId: provider._id,
        ownerType: 'Provider',
        kind,
        contentType,
        s3Key: key,
        originalFilename: filename,
        size,
        status: 'complete',
        uploadedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    return res.json({ status: 'complete' });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return res.status(503).json({ error: 'Document uploads are temporarily unavailable. Please contact support.' });
    }
    return res.status(400).json({ error: 'Upload could not be verified. Please try again.' });
  }
}
