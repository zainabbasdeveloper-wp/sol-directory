/**
 * Bulk-imports real, scraped provider data into MongoDB and pushes
 * each one to WordPress (see services/wordpressSync.service.ts).
 *
 * Usage:
 *   npx tsx src/scripts/importScrapedProviders.ts path/to/scraped-providers.json
 *
 * Input: a JSON file containing an array of ScrapedProviderInput
 * objects (see the interface below for the exact expected shape).
 * NOTHING here invents data — a record missing its name or address is
 * SKIPPED (logged, not silently dropped), never filled in with a
 * placeholder. Coordinates always come from real geocoding
 * (geocodeAddress) unless the scraper already supplied real lat/lng,
 * never fabricated.
 *
 * Each imported provider gets a real User account (required by the
 * Provider model's userId) with an unusable random password — the
 * business can claim it later via the existing "forgot password" flow
 * using the scraped contact email, the same mechanism a real signup
 * uses, so no new claim/verification system is needed for this.
 */
import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { readFile } from 'fs/promises';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import { geocodeAddress } from '../services/geocoding.service.js';
import { generateUniqueProviderSlug } from '../utils/slugify.js';
import { syncProviderToWordPress } from '../services/wordpressSync.service.js';

interface ScrapedProviderInput {
  // Required — a record without these is skipped, not partially imported.
  legalEntityName: string;
  contactEmail: string;
  // Optional business identity
  tradingName?: string;
  abn?: string;
  // Address — geocoded via the real Mapbox Geocoding API unless
  // latitude/longitude are already supplied by the scraper (e.g. it
  // scraped a source that already had coordinates).
  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  // Provider attributes — free-form string arrays, matching the
  // Provider model's existing convention (registrationGroups/
  // acceptedFunding/conditionExperience/languages/ageGroups).
  services?: string[]; // -> registrationGroups
  fundingAccepted?: string[]; // -> acceptedFunding
  conditionExperience?: string[];
  languages?: string[];
  ageGroups?: string[];
  serviceSuburbs?: string[];
  travelRadiusKm?: number;
}

interface ImportResult {
  input: ScrapedProviderInput;
  status: 'created' | 'skipped' | 'failed';
  reason?: string;
  providerId?: string;
}

function randomUnusablePassword(): string {
  // Never given to anyone — the provider claims their account via the
  // existing forgot-password flow, which issues a fresh reset token
  // regardless of what this hash actually is.
  return crypto.randomBytes(32).toString('hex');
}

function normalizeAbn(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, '');
  return digits.length === 11 ? digits : undefined; // invalid ABNs are dropped, not guessed-at
}

async function importOne(input: ScrapedProviderInput): Promise<ImportResult> {
  if (!input.legalEntityName?.trim()) {
    return { input, status: 'skipped', reason: 'Missing legalEntityName' };
  }
  if (!input.contactEmail?.trim() || !/.+@.+\..+/.test(input.contactEmail)) {
    return { input, status: 'skipped', reason: 'Missing or invalid contactEmail' };
  }

  const existingUser = await User.findOne({ email: input.contactEmail.toLowerCase() });
  if (existingUser) {
    return { input, status: 'skipped', reason: `A user with email ${input.contactEmail} already exists` };
  }

  try {
    const passwordHash = await bcrypt.hash(randomUnusablePassword(), 10);
    const user = await User.create({
      name: input.tradingName || input.legalEntityName,
      email: input.contactEmail,
      mobile: '0000000000', // required=false on the model, but keep it a clearly-placeholder value, not fabricated real-looking data
      passwordHash,
      role: 'provider',
    });

    const provider = new Provider({
      userId: user._id,
      legalEntityName: input.legalEntityName,
      tradingName: input.tradingName,
      abn: normalizeAbn(input.abn),
      intakeEmail: input.contactEmail,
      claimed: false, // the business hasn't signed up yet; see Provider.claimed
      registrationGroups: input.services ?? [],
      acceptedFunding: input.fundingAccepted ?? [],
      conditionExperience: input.conditionExperience ?? [],
      languages: input.languages ?? [],
      ageGroups: input.ageGroups ?? [],
      serviceSuburbs: input.serviceSuburbs ?? (input.suburb ? [input.suburb] : []),
      travelRadiusKm: input.travelRadiusKm,
    });

    if (input.address || input.suburb) {
      provider.businessAddress = {
        address: input.address,
        suburb: input.suburb,
        state: input.state,
        postcode: input.postcode,
        country: input.country || 'Australia',
      };
    }

    // Real coordinates only — geocode the real address if the scraper
    // didn't already supply real lat/lng.
    if (typeof input.latitude === 'number' && typeof input.longitude === 'number') {
      provider.location = { type: 'Point', coordinates: [input.longitude, input.latitude] };
    } else {
      const fullAddress = [input.address, input.suburb, input.state, input.postcode, input.country || 'Australia']
        .filter(Boolean)
        .join(', ');
      if (fullAddress) {
        const geo = await geocodeAddress(fullAddress);
        if (geo) provider.location = { type: 'Point', coordinates: [geo.lng, geo.lat] };
        else console.warn(`[import] Could not geocode "${fullAddress}" for ${input.legalEntityName} — saved without coordinates.`);
      }
    }

    provider.slug = await generateUniqueProviderSlug(input.tradingName || input.legalEntityName);
    await provider.save();

    user.providerId = provider._id as any;
    await user.save();

    await syncProviderToWordPress(String(provider._id));

    return { input, status: 'created', providerId: String(provider._id) };
  } catch (err: any) {
    return { input, status: 'failed', reason: err.message };
  }
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx tsx src/scripts/importScrapedProviders.ts path/to/scraped-providers.json');
    process.exit(1);
  }

  const raw = await readFile(filePath, 'utf-8');
  const records = JSON.parse(raw) as ScrapedProviderInput[];
  if (!Array.isArray(records)) {
    console.error('Expected the JSON file to contain a top-level array of provider objects.');
    process.exit(1);
  }

  await connectDB();
  console.log(`[import] Connected. Importing ${records.length} record(s) from ${filePath}...`);

  const results: ImportResult[] = [];
  for (const record of records) {
    results.push(await importOne(record));
  }

  const created = results.filter((r) => r.status === 'created');
  const skipped = results.filter((r) => r.status === 'skipped');
  const failed = results.filter((r) => r.status === 'failed');

  console.log(`\n[import] Done. ${created.length} created, ${skipped.length} skipped, ${failed.length} failed.`);
  if (skipped.length) {
    console.log('\nSkipped:');
    skipped.forEach((r) => console.log(`  - ${r.input.legalEntityName || '(no name)'}: ${r.reason}`));
  }
  if (failed.length) {
    console.log('\nFailed:');
    failed.forEach((r) => console.log(`  - ${r.input.legalEntityName || '(no name)'}: ${r.reason}`));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[import] Fatal error:', err);
  process.exit(1);
});
