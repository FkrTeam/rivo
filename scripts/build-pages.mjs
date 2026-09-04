/**
 * Generates the project pages from src/data/projects.js:
 *   projects.html               the list of all projects
 *   projects/<slug>.html        one detail page per project
 *
 * Run:  npm run pages   (also runs before `dev` and `build`)
 *
 * The pages are plain HTML (content is in the markup, not rendered by JS) and
 * load src/page.js for the shared chrome. Images come from the manifest that
 * `npm run assets:images` writes; names without a manifest entry are skipped.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projects, projectUrl } from '../src/data/projects.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'src/data/images.manifest.json'), 'utf8'));
const IMG = '/assets/images';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dash = (v) => (v && String(v).trim() ? esc(v) : '—');
const pad = (n) => String(n).padStart(2, '0');

function img(name) {
  const e = manifest[name];
  if (!e) return null;
  const largest = e.widths[e.widths.length - 1];
  return {
    ...e,
    src: `${IMG}/${name}-${largest}.webp`,
    srcset: e.widths.map((w) => `${IMG}/${name}-${w}.webp ${w}w`).join(', '),
  };
}

/* ---------- shared chrome (mirrors index.html) ---------- */
const wordmark = readFileSync(resolve(root, 'index.html'), 'utf8').match(/<svg hidden[\s\S]*?<\/svg>/)[0];

const head = (title, description, path) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(title)} | RIVO</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#0B0B0B">
  <meta property="og:title" content="${esc(title)} | RIVO">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website">
  <link rel="canonical" href="https://rivowork.com${path}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/brand/fonts/inter-latin-opsz-normal.woff2" as="font" type="font/woff2" crossorigin>
  <!-- painted before any stylesheet arrives: ink, never a white flash -->
  <style>html{background:#0B0B0B;color:#F4F1EB}</style>
  <link rel="stylesheet" href="/src/styles/site.css">
  <script type="module" src="/src/page.js"></script>
</head>
<body class="subpage">
  ${wordmark}

  <a class="skip" href="#main">Skip to content</a>
  <div class="bg" aria-hidden="true"></div>
  <div class="frame" aria-hidden="true"></div>

  <header class="nav is-scrolled" id="nav">
    <a class="nav__brand" href="/" aria-label="RIVO, home">
      <svg class="wordmark" viewBox="0 0 567.19 244.91" role="img" aria-label="RIVO"><use href="#rivo-wordmark"/></svg>
    </a>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-menu">Menu</button>
    <nav id="nav-menu" class="nav__menu" aria-label="Primary" data-current="work">
      <ul class="nav__list">
        <li><a href="/projects.html" data-section="work">Work</a></li>
        <li><a href="/#capabilities" data-section="capabilities">Capabilities</a></li>
        <li><a href="/#process" data-section="process">Process</a></li>
        <li><a href="/#about" data-section="about">About</a></li>
        <li><a href="/#contact" data-section="contact">Contact</a></li>
      </ul>
      <span class="nav__dot" aria-hidden="true"></span>
    </nav>
  </header>

  <main id="main" class="page">
`;

const foot = `  </main>

  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__row">
        <a class="footer__brand" href="/" aria-label="RIVO, home">
          <svg class="footer__mark" viewBox="0 0 567.19 244.91" aria-hidden="true"><use href="#rivo-wordmark"/></svg>
        </a>
        <p class="footer__line">rhythm, built.</p>
        <a class="footer__top" href="#main">Back to top</a>
      </div>
      <div class="footer__bar">
        <a class="spec footer__link" href="mailto:hello@rivowork.com">hello@rivowork.com</a>
        <span class="spec footer__places">Miami / New York / Istanbul</span>
        <span class="spec">&copy; <span data-year>2026</span> RIVO WORK</span>
      </div>
    </div>
  </footer>
</body>
</html>
`;

/* ---------- cards (same markup as src/ui/projects.js) ---------- */
function card(p, i) {
  const c = img(p.cover);
  const fig = c
    ? `<figure class="sheet__figure"><img src="${c.src}" srcset="${c.srcset}" sizes="(max-width: 720px) 100vw, 50vw" width="${c.width}" height="${c.height}" style="object-position: ${esc(p.focus || '50% 50%')}" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async" alt="${esc(p.title)}${p.location ? ', ' + esc(p.location) : ''}"></figure>`
    : `<figure class="sheet__figure"><div class="sheet__plate"><span class="spec">Photography pending</span></div></figure>`;
  return `<li class="sheet" data-project="${esc(p.slug)}">
    <a class="sheet__link" href="${projectUrl(p)}" aria-label="${esc(p.title)}: open project">
      ${fig}
      <div class="sheet__block">
        <div class="sheet__cell sheet__cell--wide"><span class="spec">Project <b class="num">${pad(i + 1)}</b></span><h3>${esc(p.title)}</h3></div>
        <div class="sheet__cell"><span class="spec">Location</span><span class="value">${dash(p.location)}</span></div>
        <div class="sheet__cell"><span class="spec">Sector</span><span class="value">${dash(p.sector)}</span></div>
        <div class="sheet__cell sheet__cell--wide"><span class="spec">Scope</span><span class="value">${dash(p.scope)}</span></div>
      </div>
    </a>
  </li>`;
}

/* ---------- list page ---------- */
const listPage = head('Projects', 'Selected architectural millwork projects by RIVO: hospitality, residential and commercial interiors.', '/projects.html') +
`    <section id="projects" class="section work" aria-labelledby="projects-title">
      <div class="section__inner">
        <div class="section__head">
          <p class="index"><b>${pad(projects.length)}</b> / Projects</p>
          <h1 id="projects-title" class="h2">Selected work.</h1>
          <p class="section__note">Project photography and data are added as work is released. Locations are listed where they are on record.</p>
        </div>
        <ul class="sheets sheets--all">
          ${projects.map(card).join('\n          ')}
        </ul>
      </div>
    </section>
` + foot;
writeFileSync(resolve(root, 'projects.html'), listPage);

/* ---------- detail pages ---------- */
mkdirSync(resolve(root, 'projects'), { recursive: true });
projects.forEach((p, i) => {
  const prev = projects[(i - 1 + projects.length) % projects.length];
  const next = projects[(i + 1) % projects.length];
  const plates = p.gallery
    .map((g, k) => {
      const e = img(g.name);
      if (!e) return '';
      const portrait = e.height > e.width;
      return `<li class="plate ${portrait ? 'plate--portrait' : 'plate--landscape'}">
            <figure class="plate__figure" style="aspect-ratio: ${e.width} / ${e.height}">
              <img src="${e.src}" srcset="${e.srcset}" sizes="${portrait ? '(max-width: 720px) 100vw, 40vw' : '(max-width: 720px) 100vw, 58vw'}" width="${e.width}" height="${e.height}" loading="${k === 0 ? 'eager' : 'lazy'}" decoding="async" ${k === 0 ? 'fetchpriority="high"' : ''} alt="${esc(g.alt)}">
              <figcaption class="spec"><b class="num">${pad(k + 1)}</b> / ${esc(g.alt)}</figcaption>
            </figure>
          </li>`;
    })
    .filter(Boolean)
    .join('\n          ');
  const title = p.location ? `${p.title}, ${p.location}` : p.title;
  const page = head(title, p.summary, projectUrl(p)) +
`    <article id="project" class="section project" aria-labelledby="project-title">
      <div class="section__inner">
        <div class="section__head">
          <p class="index"><b>${pad(i + 1)}</b> / <a class="index__link" href="/projects.html">Projects</a></p>
          <h1 id="project-title" class="h2">${esc(p.title)}</h1>
        </div>
        <div class="grid project__intro">
          <div class="col-l">
            <p class="lede">${esc(p.summary)}</p>
          </div>
          <dl class="col-r defs">
            <div class="defs__row"><dt class="spec">Location</dt><dd>${dash(p.location)}</dd></div>
            <div class="defs__row"><dt class="spec">Sector</dt><dd>${dash(p.sector)}</dd></div>
            <div class="defs__row"><dt class="spec">Scope</dt><dd>${dash(p.scope)}</dd></div>
          </dl>
        </div>
        <ul class="plates">
          ${plates}
        </ul>
        <nav class="project__nav" aria-label="Other projects">
          <a class="project__nav-link" href="${projectUrl(prev)}" rel="prev"><span class="spec">Previous</span><span class="project__nav-title">${esc(prev.title)}</span></a>
          <a class="project__nav-link project__nav-link--all" href="/projects.html"><span class="spec">All projects</span><span class="project__nav-title">${pad(projects.length)} sheets</span></a>
          <a class="project__nav-link project__nav-link--next" href="${projectUrl(next)}" rel="next"><span class="spec">Next</span><span class="project__nav-title">${esc(next.title)}</span></a>
        </nav>
      </div>
    </article>
` + foot;
  writeFileSync(resolve(root, 'projects', `${p.slug}.html`), page);
});

/* ---------- homepage: featured cards prerendered into index.html ---------- */
const indexPath = resolve(root, 'index.html');
const indexHtml = readFileSync(indexPath, 'utf8');
const featured = projects.filter((p) => p.featured);
const cards = `<!-- projects:start (featured cards are written here by scripts/build-pages.mjs) -->
        <ul class="sheets" data-projects>
          ${featured.map(card).join('\n          ')}
        </ul>
        <!-- projects:end -->`;
const marked = indexHtml.replace(/<!-- projects:start[\s\S]*?<!-- projects:end -->/, cards);
if (marked !== indexHtml) writeFileSync(indexPath, marked);

console.log(`projects.html + ${projects.length} project pages -> ${resolve(root, 'projects')}; ${featured.length} cards -> index.html`);
