/**
 * Raster pipeline: assets-src/images/*.{jpg,jpeg,png,tif,tiff,webp}
 *              ->  public/assets/images/<name>-<width>.webp
 *              ->  src/data/images.manifest.json  (name -> widths + intrinsic size)
 *
 * Run:  npm run assets:images
 *
 * Project photography is referenced by *name* in src/data/projects.js; the
 * manifest tells the DOM which widths exist and the real aspect ratio so the
 * layout never crops or shifts. Nothing is generated for names that have no
 * source file - those slots render the development placeholder.
 */
import { readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../assets-src/images');
const outDir = resolve(here, '../public/assets/images');
const manifestPath = resolve(here, '../src/data/images.manifest.json');
const WIDTHS = [800, 1400, 2000];
const QUALITY = 82;

mkdirSync(outDir, { recursive: true });
const files = existsSync(srcDir)
  ? readdirSync(srcDir).filter((f) => /\.(jpe?g|png|tiff?|webp)$/i.test(f))
  : [];

const manifest = {};
for (const file of files) {
  const { name } = parse(file);
  const input = sharp(resolve(srcDir, file)).rotate();
  const meta = await input.metadata();
  // the standard widths that fit, plus the intrinsic width so a hero can use the full source
  const widths = WIDTHS.filter((w) => w < meta.width);
  widths.push(meta.width);
  for (const w of widths) {
    await input.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: QUALITY, effort: 5 })
      .toFile(resolve(outDir, `${name}-${w}.webp`));
  }
  manifest[name] = { widths, width: meta.width, height: meta.height };
  console.log(`${file} -> ${widths.map((w) => `${name}-${w}.webp`).join(', ')}`);
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`${files.length} image(s). Manifest -> ${manifestPath}`);
