/**
 * Shrinks the large banner photos in public/images so pages load fast (some were 5-10 MB).
 * Resizes anything wider than 1920px and re-encodes as a progressive JPEG. Safe to re-run: files
 * already under the size limit are left alone, and file names never change.
 *
 * Usage: npm run images:optimize -w apps/web
 */
import { readdir, stat, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/images');
const MAX_BYTES = 450 * 1024;

async function walk(d) {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.jpe?g$/i.test(e.name)) out.push(p);
  }
  return out;
}

for (const file of await walk(dir)) {
  const before = (await stat(file)).size;
  if (before <= MAX_BYTES) continue;
  const input = await readFile(file);
  const output = await sharp(input)
    .rotate()
    .resize({ width: 1920, withoutEnlargement: true })
    .jpeg({ quality: 78, progressive: true, mozjpeg: true })
    .toBuffer();
  if (output.length < before) {
    await writeFile(file, output);
    console.log(`${path.relative(dir, file)}: ${(before / 1024).toFixed(0)} KB -> ${(output.length / 1024).toFixed(0)} KB`);
  }
}
