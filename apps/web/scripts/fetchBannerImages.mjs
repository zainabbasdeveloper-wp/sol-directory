/**
 * Downloads one free banner photo per NDIS topic from Pexels (official API, free key) into
 * public/images/banners/<topic>.jpg, sized for a full-width banner, and records which topics now have
 * a photo in src/data/bannerManifest.json so bannerFor() starts using them.
 *
 * Get a free key at https://www.pexels.com/api/ (instant, no card), then:
 *   PEXELS_API_KEY=xxxx npm run images:fetch-banners -w apps/web
 *
 * Options:
 *   --topic=therapy     only this topic
 *   --pick=2            use the 2nd best match instead of the 1st (to swap a photo you don't like)
 *   --force             re-download topics that already have a photo
 *
 * Photo credits are written to public/images/banners/credits.json. Pexels photos are free for commercial
 * use without attribution, but credits are kept so a photographer can be named if you choose to.
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

const key = process.env.PEXELS_API_KEY;
if (!key) {
  console.error('Set PEXELS_API_KEY first. Free key: https://www.pexels.com/api/');
  process.exit(1);
}

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const only = arg('topic');
const pick = Math.max(1, Number(arg('pick') ?? 1)) - 1;
const force = process.argv.includes('--force');

const readJson = async (p, fallback) => (existsSync(p) ? JSON.parse(await readFile(p, 'utf8')) : fallback);
const manifest = await readJson(manifestPath, { available: [] });
const credits = await readJson(creditsPath, {});
await mkdir(outDir, { recursive: true });

const usedPhotoIds = new Set(Object.values(credits).map((c) => c.photoId));

async function search(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=30`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Pexels ${res.status} ${res.statusText} for "${query}"`);
  return (await res.json()).photos ?? [];
}

// A banner is wide, so the photo must be large and clearly landscape; the subject should survive a crop.
const usable = (p) => p.width >= 2400 && p.width / p.height >= 1.45 && p.width / p.height <= 2.1 && !usedPhotoIds.has(p.id);

for (const [topic, queries] of Object.entries(TOPICS)) {
  if (only && topic !== only) continue;
  if (!force && !only && manifest.available.includes(topic)) {
    console.log(`${topic}: already have one (use --force to replace)`);
    continue;
  }

  let candidates = [];
  for (const q of queries) {
    candidates = candidates.concat((await search(q)).filter(usable));
    if (candidates.length > pick) break;
  }
  const photo = candidates[pick];
  if (!photo) {
    console.warn(`${topic}: no suitable photo found, skipped`);
    continue;
  }

  const imgRes = await fetch(`${photo.src.original}?auto=compress&cs=tinysrgb&w=1920`);
  if (!imgRes.ok) {
    console.warn(`${topic}: download failed (${imgRes.status}), skipped`);
    continue;
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  await writeFile(path.join(outDir, `${topic}.jpg`), buf);

  usedPhotoIds.add(photo.id);
  credits[topic] = { photoId: photo.id, photographer: photo.photographer, photographerUrl: photo.photographer_url, pageUrl: photo.url, alt: photo.alt ?? '' };
  if (!manifest.available.includes(topic)) manifest.available.push(topic);
  console.log(`${topic}: ${(buf.length / 1024).toFixed(0)} KB  ${photo.url}`);
}

manifest.available.sort();
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
await writeFile(creditsPath, JSON.stringify(credits, null, 2) + '\n');
console.log('\nDone. Review the images in public/images/banners, swap any with --topic=<name> --pick=2 --force, then commit.');
