import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Provider from '../models/Provider.js';
import ProviderLogo from '../models/ProviderLogo.js';
import { photoBytes } from '../models/WorkerPhoto.js';
import { publicLogoUrl } from './providersPublic.controller.js';

/**
 * A provider looking after their own public listing: what it currently
 * looks like, why it might not be showing, and their logo. Everything else
 * about the business is edited in onboarding, as before.
 */

const MAX_LOGO_BYTES = 300 * 1024;

async function myProvider(req: AuthedRequest) {
  if (req.user?.role !== 'provider') return null;
  return Provider.findOne({ userId: req.user.id });
}

function shape(p: any) {
  const groups = p.registrationGroups ?? [];
  const suburbs = p.serviceSuburbs ?? [];
  // Plain reasons the public page isn't visible, so a provider isn't left guessing.
  const issues: string[] = [];
  if (p.accountStatus !== 'active') issues.push('Your account is suspended.');
  if (!p.slug) issues.push('Add your business name in onboarding to get a public page.');
  if (p.listingPaused) issues.push('Your listing is paused because your weekly capacity check wasn’t confirmed. Use the link in the latest capacity email to bring it back.');
  if (p.slug && groups.length === 0) issues.push('Add the supports you offer in onboarding — a page with none isn’t shown to search engines.');
  return {
    name: p.tradingName || p.legalEntityName || '',
    slug: p.slug ?? null,
    live: p.accountStatus === 'active' && !p.listingPaused && !!p.slug,
    issues,
    supportCount: groups.length,
    areaCount: suburbs.length,
    intakeStatus: p.intakeStatus,
    hasLogo: !!(p.logoUrl || p.hasLogoUpload),
    hasUploadedLogo: !!p.hasLogoUpload,
    logoManagedElsewhere: !!p.logoUrl, // set by the WordPress media library; it takes priority over an upload
    logoUrl: publicLogoUrl(p),
  };
}

export async function getMyListing(req: AuthedRequest, res: Response) {
  const p = await myProvider(req);
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  res.json(shape(p));
}

// PUT /api/providers/me/logo — body is the raw JPEG (Content-Type: image/jpeg)
export async function putMyLogo(req: AuthedRequest, res: Response) {
  const p = await myProvider(req);
  if (!p) return res.status(404).json({ error: 'Provider not found.' });

  const data = req.body as Buffer;
  if (!Buffer.isBuffer(data) || data.length < 200) return res.status(400).json({ error: 'Please choose an image.' });
  if (data.length > MAX_LOGO_BYTES) return res.status(413).json({ error: 'That image is too large.' });
  if (!(data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)) return res.status(415).json({ error: 'Logo must be a JPEG image.' });

  await ProviderLogo.findOneAndUpdate({ providerId: p._id }, { $set: { data, contentType: 'image/jpeg' } }, { upsert: true });
  p.hasLogoUpload = true;
  await p.save();
  res.json(shape(p));
}

export async function deleteMyLogo(req: AuthedRequest, res: Response) {
  const p = await myProvider(req);
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  await ProviderLogo.deleteOne({ providerId: p._id });
  p.hasLogoUpload = false;
  await p.save();
  res.json(shape(p));
}

// GET /api/providers/me/logo — the owner's own upload, for previewing before the page is live.
export async function getMyLogo(req: AuthedRequest, res: Response) {
  const p = await myProvider(req);
  const logo = p ? await ProviderLogo.findOne({ providerId: p._id }).lean() : null;
  if (!logo) return res.status(404).end();
  res.setHeader('Content-Type', 'image/jpeg');
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' });
  res.send(photoBytes(logo.data));
}
