/**
 * Image lookup against the generated manifest (src/data/images.manifest.json).
 * Browser side only: Node code (scripts/build-pages.mjs) reads the manifest
 * itself. Returns null for names that have not been produced yet.
 */
import manifest from './images.manifest.json';
import { ASSETS } from './assets.js';

export function resolveImage(image) {
  const name = typeof image === 'string' ? image : image?.name;
  if (!name) return null;
  const entry = manifest[name];
  if (!entry) return null;
  return { ...entry, name, alt: (typeof image === 'object' && image?.alt) || '' };
}

/** src + srcset for a resolved image */
export function sources(img) {
  const srcset = img.widths.map((w) => `${ASSETS.images.dir}/${img.name}-${w}.webp ${w}w`).join(', ');
  const largest = img.widths[img.widths.length - 1];
  return { src: `${ASSETS.images.dir}/${img.name}-${largest}.webp`, srcset };
}
