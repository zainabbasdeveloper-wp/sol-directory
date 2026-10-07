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
 *   --variants=3        keep up to 3 different photos per topic (the site picks one per page); default 1
 *   --force             with --topic: replace that topic's first photo
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
  community: ['friends laughing together outdoors park', 'group of friends including wheelchair user at a picnic', 'community garden group volunteers smiling'],
  therapy: ['physiotherapist smiling helping patient exercise', 'occupational therapist and client smiling', 'speech therapist with child'],
  'support-coordination': ['support worker and woman reviewing plan at kitchen table', 'two women talking over notebook at home', 'advisor helping client with paperwork home'],
  'plan-management': ['person reviewing paperwork laptop calculator desk', 'budget planning documents laptop'],
  transport: ['accessible van wheelchair ramp', 'woman wheelchair boarding bus'],
  housing: ['accessible modern home interior wheelchair', 'bright apartment living room person wheelchair'],
  employment: ['woman in wheelchair working at office desk smiling', 'person with disability at workplace with colleagues', 'young man with down syndrome working cafe'],
  'mental-health': ['supportive conversation counselling room', 'calm woman talking with counsellor'],
  'autism-children': ['child playing with therapist toys', 'children learning together classroom smiling'],
  'assistive-technology': ['wheelchair user using laptop', 'person using assistive device technology'],
  'older-people': ['elderly woman with carer smiling', 'senior man walking with support worker'],
  multicultural: ['diverse friends talking and laughing together', 'multicultural family at home smiling', 'women of different backgrounds chatting cafe'],
  'locations-qld': ['Brisbane city skyline river'],
  'locations-nsw': ['Sydney harbour skyline Australia', 'Sydney opera house harbour bridge'],
  'locations-vic': ['Melbourne city skyline Australia', 'Melbourne Yarra river skyline'],
  'locations-wa': ['Perth city skyline Australia', 'Perth Swan River skyline'],
  'locations-sa': ['Adelaide city skyline Australia', 'Adelaide Torrens river city'],
  'locations-tas': ['Hobart Tasmania waterfront', 'Hobart Mount Wellington city'],
  'locations-act': ['Canberra Lake Burley Griffin parliament', 'Canberra city Australia'],
  'locations-nt': ['Darwin Australia waterfront', 'Darwin Northern Territory city'],
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
const variants = Math.max(1, Number(arg('variants') ?? 1));

const readJson = async (p, fallback) => (existsSync(p) ? JSON.parse(await readFile(p, 'utf8')) : fallback);
const manifest = await readJson(manifestPath, { available: [] });
const credits = await readJson(creditsPath, {});
await mkdir(outDir, { recursive: true });

const usedPhotoIds = new Set(Object.values(credits).map((c) => c.photoId));
// Photos reviewed and turned down are listed here so a later run never downloads them again.
const rejected = await readJson(path.join(outDir, 'rejected.json'), []);
rejected.forEach((id) => usedPhotoIds.add(id));

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

// A topic can have several photos: the first is <topic>.jpg, then <topic>-2.jpg, <topic>-3.jpg … The site picks one per
// page from the page's own title, so pages in the same topic show different pictures.
const variantKey = (topic, n) => (n === 1 ? topic : `${topic}-${n}`);
manifest.variants ??= {};

let rateLimited = false;
for (const [topic, queries] of Object.entries(TOPICS)) {
  if (rateLimited) break;
  if (only && topic !== only) continue;

  const have = manifest.variants[topic] ?? (manifest.available.includes(topic) ? 1 : 0);
  // --force replaces the first photo only; otherwise only the missing variants are fetched.
  const wanted = [];
  if (force && only) wanted.push(1);
  for (let n = have + 1; n <= variants; n++) wanted.push(n);
  if (wanted.length === 0) {
    console.log(`${topic}: already has ${have} photo${have === 1 ? '' : 's'}`);
    continue;
  }

  let candidates = [];
  try {
    for (const q of queries) {
      candidates = candidates.concat((await search(q)).filter(usable));
      if (candidates.length >= wanted.length + pick) break;
    }
  } catch (err) {
    if (!(err instanceof RateLimited)) throw err;
    console.warn(`\n${err.message}. Progress is saved; run the same command again in an hour to continue.`);
    break;
  }

  for (const [i, n] of wanted.entries()) {
    const photo = candidates[pick + i];
    if (!photo) {
      console.warn(`${variantKey(topic, n)}: no more suitable photos found, skipped`);
      continue;
    }
    const imgRes = await fetch(photo.imageUrl(1920));
    if (!imgRes.ok) {
      console.warn(`${variantKey(topic, n)}: download failed (${imgRes.status}), skipped`);
      continue;
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const key = variantKey(topic, n);
    await writeFile(path.join(outDir, `${key}.jpg`), buf);

    usedPhotoIds.add(photo.id);
    await photo.onDownload?.();
    credits[key] = { provider, photoId: photo.id, photographer: photo.photographer, photographerUrl: photo.photographerUrl, pageUrl: photo.pageUrl, alt: photo.alt };
    if (!manifest.available.includes(topic)) manifest.available.push(topic);
    manifest.variants[topic] = Math.max(manifest.variants[topic] ?? 0, n);
    console.log(`${key}: ${(buf.length / 1024).toFixed(0)} KB  ${photo.pageUrl}`);
  }
}

manifest.available.sort();
manifest.variants = Object.fromEntries(Object.entries(manifest.variants).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
await writeFile(creditsPath, JSON.stringify(credits, null, 2) + '\n');
console.log('\nDone. Review the images in public/images/banners, swap any with --topic=<name> --pick=2 --force, then commit.');
