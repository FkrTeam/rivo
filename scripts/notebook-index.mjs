/**
 * Index the NotebookLM "RIVO" notebook's photographs into assets-src/images/.
 *
 * The notebook names each photograph <FOLDER>-<n>, where <FOLDER> is the
 * project folder in RIVO-PROJECTS (without the "BİR - " ordinal prefix) and <n>
 * counts the photographs of that folder in ASCII order (uppercase before
 * lowercase, "10" before "4"). Where a folder has a website/ subfolder, the
 * notebook holds that subfolder and nothing else from the project.
 *
 * Every notebook photograph becomes assets-src/images/<slug>-<NN>.<ext> with
 * the same number, so 1404-WILLOW-HOBOKEN-6 is 1404-willow-hoboken-06. Files in
 * assets-src/images/ that are not in the notebook are listed, and removed with
 * --prune. The index is written to src/data/notebook-index.json; run
 * `npm run assets:images` after.
 *
 * Run:  npm run index:notebook [-- --prune] [-- <path to RIVO-PROJECTS>]
 *       default source: ~/Downloads/RIVO-PROJECTS/RIVO-PROJECTS
 */
import { readdirSync, readFileSync, writeFileSync, copyFileSync, unlinkSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const args = process.argv.slice(2);
const prune = args.includes('--prune');
const srcRoot = resolve(args.find((a) => !a.startsWith('--')) || join(homedir(), 'Downloads', 'RIVO-PROJECTS', 'RIVO-PROJECTS'));
const assetsDir = resolve(root, 'assets-src/images');
const outPath = resolve(root, 'src/data/notebook-index.json');

/** notebook folder -> project slug (src/data/projects.js). Folders not listed are reported and skipped. */
const SLUGS = {
  'FIAT HOUSE': 'fiat-house',
  '1404-WILLOW-HOBOKEN': '1404-willow-hoboken',
  '301-WASHINGTON-HOBOKEN': '301-washington-hoboken',
  '260-WASHINGTON-BELLEVILLE': '260-washington-belleville',
  'DOUBLE-TREE-HILTON-FORTLEE': 'double-tree-hilton-fort-lee',
  'HUDSON-CLIFF': 'hudson-cliff',
  'DALLAS-TOWNHOMES': 'dallas-townhomes',
  'CIBO-VITA-OFFICE': 'cibo-vita-office',
};

const IMAGE = /\.(jpe?g|png|tiff?|webp)$/i;
const ascii = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const pad = (n) => String(n).padStart(2, '0');
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');
const rel = (p) => p.slice(srcRoot.length + 1).replace(/\\/g, '/');

if (!existsSync(srcRoot)) {
  console.error(`source folder not found: ${srcRoot}`);
  process.exit(1);
}

// what assets-src holds now, by hash and by file
const before = new Map(); // hash -> name
const stale = new Set(); // file names still to account for
for (const f of readdirSync(assetsDir)) {
  if (!IMAGE.test(f)) continue;
  before.set(md5(resolve(assetsDir, f)), f.slice(0, -extname(f).length));
  stale.add(f);
}

const index = {};
const renamed = [];
for (const folder of readdirSync(srcRoot).sort(ascii)) {
  const dir = resolve(srcRoot, folder);
  if (!statSync(dir).isDirectory()) continue;
  const name = folder.replace(/^[^-]+ - /, ''); // "BİR - FIAT HOUSE" -> "FIAT HOUSE"
  const slug = SLUGS[name];
  if (!slug) { console.log(`skip ${folder} (no slug)`); continue; }
  const site = resolve(dir, 'website');
  const photoDir = existsSync(site) ? site : dir;
  const files = readdirSync(photoDir).filter((f) => IMAGE.test(f)).sort(ascii);
  files.forEach((file, i) => {
    const path = resolve(photoDir, file);
    const ext = extname(file).toLowerCase().replace('jpeg', 'jpg');
    const asset = `${slug}-${pad(i + 1)}`;
    const target = `${asset}${ext}`;
    const hash = md5(path);
    const was = before.get(hash) ?? null;
    if (!(existsSync(resolve(assetsDir, target)) && md5(resolve(assetsDir, target)) === hash)) {
      copyFileSync(path, resolve(assetsDir, target));
    }
    stale.delete(target);
    if (was && was !== asset) renamed.push([was, asset]);
    index[`${name}-${i + 1}`] = { source: rel(path), asset };
  });
}

for (const f of stale) {
  if (prune) unlinkSync(resolve(assetsDir, f));
  console.log(`${prune ? 'removed' : 'not in the notebook (remove with --prune):'} ${f}`);
}

writeFileSync(outPath, JSON.stringify(index, null, 2) + '\n');
for (const [k, v] of Object.entries(index)) console.log(`${k.padEnd(30)} ${v.asset.padEnd(30)} ${v.source}`);
if (renamed.length) {
  console.log('\nrenumbered (previous name -> notebook number):');
  for (const [a, b] of renamed) console.log(`  ${a} -> ${b}`);
}
console.log(`\n${Object.keys(index).length} photographs -> ${assetsDir}; index -> ${outPath}. Now run: npm run assets:images`);
