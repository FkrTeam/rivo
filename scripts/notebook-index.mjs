/**
 * Index of the NotebookLM "RIVO" notebook's photograph names against the
 * files in assets-src/images/.
 *
 * The notebook names each photograph <FOLDER>-<n>, where <FOLDER> is the
 * project folder in RIVO-PROJECTS (without the "BİR - " ordinal prefix) and <n>
 * counts the photographs of that folder in ASCII order (uppercase before
 * lowercase, "10" before "4"). Where a folder has a website/ subfolder, the
 * notebook holds that subfolder and nothing else from the project.
 *
 * Files are matched to assets-src/images/ by content hash, so the index says
 * which local name a notebook name refers to (or that the photograph was never
 * imported). It is written to src/data/notebook-index.json.
 *
 * Run:  npm run index:notebook [-- <path to RIVO-PROJECTS>]
 *       default source: ~/Downloads/RIVO-PROJECTS/RIVO-PROJECTS
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const srcRoot = resolve(process.argv[2] || join(homedir(), 'Downloads', 'RIVO-PROJECTS', 'RIVO-PROJECTS'));
const assetsDir = resolve(root, 'assets-src/images');
const outPath = resolve(root, 'src/data/notebook-index.json');

const IMAGE = /\.(jpe?g|png|tiff?|webp|heic)$/i;
const ascii = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');
const rel = (p) => p.slice(srcRoot.length + 1).replace(/\\/g, '/');

if (!existsSync(srcRoot)) {
  console.error(`source folder not found: ${srcRoot}`);
  process.exit(1);
}

// local files by hash
const local = new Map();
for (const f of readdirSync(assetsDir)) {
  if (!IMAGE.test(f)) continue;
  local.set(md5(resolve(assetsDir, f)), f.slice(0, -extname(f).length));
}

const index = {};
for (const folder of readdirSync(srcRoot).sort(ascii)) {
  const dir = resolve(srcRoot, folder);
  if (!statSync(dir).isDirectory()) continue;
  const name = folder.replace(/^[^-]+ - /, ''); // "BİR - FIAT HOUSE" -> "FIAT HOUSE"
  const site = resolve(dir, 'website');
  const photoDir = existsSync(site) ? site : dir;
  const files = readdirSync(photoDir).filter((f) => IMAGE.test(f)).sort(ascii);
  files.forEach((file, i) => {
    const path = resolve(photoDir, file);
    index[`${name}-${i + 1}`] = { source: rel(path), asset: local.get(md5(path)) ?? null };
  });
}

writeFileSync(outPath, JSON.stringify(index, null, 2) + '\n');
const rows = Object.entries(index);
for (const [k, v] of rows) console.log(`${k.padEnd(30)} ${(v.asset ?? '(not imported)').padEnd(28)} ${v.source}`);
console.log(`${rows.length} notebook names, ${rows.filter(([, v]) => v.asset).length} imported -> ${outPath}`);
