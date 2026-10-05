/**
 * Downloads one free banner photo per NDIS topic into public/images/banners/<topic>.jpg, sized for a
 * full-width banner, and records which topics now have a photo in src/data/bannerManifest.json so
 * bannerFor() starts using them. Uses an official free photo API, whichever key you have:
 *
 *   Unsplash: create a free app at https://unsplash.com/oauth/applications, copy its Access Key, then
 *     UNSPLASH_ACCESS_KEY=xxxx npm run images:fetch-banners -w apps/web
 *   Pexels (new keys are paused at the moment): https://www.pexels.com/api/
 *     PEXELS_API_KEY=xxxx npm run images:fetch-banners -w apps/web
 *
 * Options:
 *   --topic=therapy     only this topic
 *   --pick=2            use the 2nd best match instead of the 1st (to swap a photo you don't like)
 *   --force             re-download topics that already have a photo
 *
 * Photo credits are written to public/images/banners/credits.json. Both services allow free commercial
 * use; Unsplash's API rules ask you to credit the photographer and Unsplash, so keep credits.json and show
 * a "Photos: Unsplash" credit where you can (e.g. the footer).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/images/banners');
const manifestPath = path.join(root, 'src/data/bannerManifest.json');
const creditsPath = path.join(outDir, 'credits.json');

// Queries describe respectful, everyday scenes: people with disability shown as active and in charge of their
// own lives, with support workers alongside, never as objects of pity.
const TOPICS = {
  'personal-care': ['caregiver helping person at home smiling', 'support worker assisting woman in kitchen'],
  community: ['friends with disability outdoors together', 'people in wheelchairs community event'],
  therapy: ['occupational therapist working with patient', 'physiotherapist helping patient exercise'],
  'support-coordination': ['woman talking with advisor at table planning', 'two people reviewing documents together office'],
  'plan-management': ['person reviewing paperwork laptop calculator desk', 'budget planning documents laptop'],
  transport: ['accessible van wheelchair ramp', 'woman wheelchair boarding bus'],
  housing: ['accessible modern home interior wheelchair', 'bright apartment living room person wheelchair'],
  employment: ['person with disability working at office desk', 'young man wheelchair workplace colleagues'],
  'mental-health': ['supportive conversation counselling room', 'calm woman talking with counsellor'],
  'autism-children': ['child playing with therapist toys', 'children learning together classroom smiling'],
  'assistive-technology': ['wheelchair user using laptop', 'person using assistive device technology'],
  'older-people': ['elderly woman with carer smiling', 'senior man walking with support worker'],
  multicultural: ['diverse group of people talking community', 'multicultural friends sitting together'],
  locations: ['Australian suburb street houses sunny', 'Brisbane city skyline river'],
  guides: ['woman reading guide notebook coffee', 'person writing notes planning at desk'],
  general: ['support worker and client talking warmly', 'carer and woman walking in park'],
};

const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
const pexelsKey = process.env.PEXELS_API_KEY;
if (!unsplashKey && !pexelsKey) {
  console.error('Set UNSPLASH_ACCESS_KEY (https://unsplash.com/oauth/applications) or PEXELS_API_KEY first. See the top of this file.');
  process.exit(1);
}
const provider = unsplashKey ? 'unsplash' : 'pexels';

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const only = arg('topic');
const pick = Math.max(1, Number(arg('pick') ?? 1)) - 1;
const force = process.argv.includes('--force');

const readJson = async (p, fallback) => (existsSync(p) ? JSON.parse(await readFile(p, 'utf8')) : fallback);
const manifest = await readJson(manifestPath, { available: [] });
const credits = await readJson(creditsPath, {});
await mkdir(outDir, { recursive: true });

const usedPhotoIds = new Set(Object.values(credits).map((c) => c.photoId));

// Each provider is mapped to the same shape: { id, width, height, imageUrl(width), pageUrl, photographer, photographerUrl, alt }.
async function search(query) {
  if (provider === 'unsplash') {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=30`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${unsplashKey}` } });
    if (res.status === 403 || res.status === 429) throw new RateLimited('Unsplash hourly limit reached (free apps get 50 requests an hour)');
    if (!res.ok) throw new Error(`Unsplash ${res.status} ${res.statusText} for "${query}"`);
    return ((await res.json()).results ?? []).map((p) => ({
      id: p.id, width: p.width, height: p.height,
      imageUrl: (w) => `${p.urls.raw}&w=${w}&q=75&fm=jpg&fit=max`,
      pageUrl: p.links.html, photographer: p.user.name, photographerUrl: p.user.links.html, alt: p.alt_description ?? '',
      // Unsplash's API rules ask apps to report each download.
      onDownload: () => fetch(p.links.download_location, { headers: { Authorization: `Client-ID ${unsplashKey}` } }).catch(() => {}),
    }));
  }
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=30`;
  const res = await fetch(url, { headers: { Authorization: pexelsKey } });
  if (res.status === 429) throw new RateLimited('Pexels rate limit reached');
  if (!res.ok) throw new Error(`Pexels ${res.status} ${res.statusText} for "${query}"`);
  return ((await res.json()).photos ?? []).map((p) => ({
    id: String(p.id), width: p.width, height: p.height,
    imageUrl: (w) => `${p.src.original}?auto=compress&cs=tinysrgb&w=${w}`,
    pageUrl: p.url, photographer: p.photographer, photographerUrl: p.photographer_url, alt: p.alt ?? '',
  }));
}

class RateLimited extends Error {}

// A banner is wide, so the photo must be large and clearly landscape; the subject should survive a crop.
const usable = (p) => p.width >= 2400 && p.width / p.height >= 1.45 && p.width / p.height <= 2.1 && !usedPhotoIds.has(p.id);

for (const [topic, queries] of Object.entries(TOPICS)) {
  if (only && topic !== only) continue;
  if (!force && !only && manifest.available.includes(topic)) {
    console.log(`${topic}: already have one (use --force to replace)`);
    continue;
  }

  let candidates = [];
  try {
    for (const q of queries) {
      candidates = candidates.concat((await search(q)).filter(usable));
      if (candidates.length > pick) break;
    }
  } catch (err) {
    if (!(err instanceof RateLimited)) throw err;
    console.warn(`
${err.message}. Progress is saved; run the same command again later to continue.`);
    break;
  }
  const photo = candidates[pick];
  if (!photo) {
    console.warn(`${topic}: no suitable photo found, skipped`);
    continue;
  }

  const imgRes = await fetch(photo.imageUrl(1920));
  if (!imgRes.ok) {
    console.warn(`${topic}: download failed (${imgRes.status}), skipped`);
    continue;
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  await writeFile(path.join(outDir, `${topic}.jpg`), buf);

  usedPhotoIds.add(photo.id);
  await photo.onDownload?.();
  credits[topic] = { provider, photoId: photo.id, photographer: photo.photographer, photographerUrl: photo.photographerUrl, pageUrl: photo.pageUrl, alt: photo.alt };
  if (!manifest.available.includes(topic)) manifest.available.push(topic);
  console.log(`${topic}: ${(buf.length / 1024).toFixed(0)} KB  ${photo.pageUrl}`);
}

manifest.available.sort();
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
await writeFile(creditsPath, JSON.stringify(credits, null, 2) + '\n');
console.log('\nDone. Review the images in public/images/banners, swap any with --topic=<name> --pick=2 --force, then commit.');
