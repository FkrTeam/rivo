/**
 * Project cards (homepage "Selected work" and the project list page).
 * Each card follows the RIVO drawing title block: a figure on top, cropped to
 * one shared proportion so the cards align, and a block of labelled fields
 * below. The whole card links to the project's detail page.
 */
import { projects, featuredProjects, projectUrl } from '../data/projects.js';
import { resolveImage, sources } from '../data/images.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dash = (v) => (v && String(v).trim() ? esc(v) : '—');
const pad = (n) => String(n).padStart(2, '0');

function figure(project) {
  const img = resolveImage(project.cover);
  if (!img) {
    return `<figure class="sheet__figure"><div class="sheet__plate"><span class="spec">Photography pending</span></div></figure>`;
  }
  const { src, srcset } = sources(img);
  return `<figure class="sheet__figure">
    <img src="${src}" srcset="${srcset}" sizes="(max-width: 720px) 100vw, 50vw"
         width="${img.width}" height="${img.height}" style="object-position: ${esc(project.focus || '50% 50%')}"
         loading="lazy" decoding="async" alt="${esc(project.title)}${project.location ? ', ' + esc(project.location) : ''}">
  </figure>`;
}

export function card(project, i) {
  return `<li class="sheet" data-project="${esc(project.slug)}">
    <a class="sheet__link" href="${projectUrl(project)}" aria-label="${esc(project.title)}: open project">
      ${figure(project)}
      <div class="sheet__block">
        <div class="sheet__cell sheet__cell--wide">
          <span class="spec">Project <b class="num">${pad(i + 1)}</b></span>
          <h3>${esc(project.title)}</h3>
        </div>
        <div class="sheet__cell"><span class="spec">Location</span><span class="value">${dash(project.location)}</span></div>
        <div class="sheet__cell"><span class="spec">Sector</span><span class="value">${dash(project.sector)}</span></div>
        <div class="sheet__cell sheet__cell--wide"><span class="spec">Scope</span><span class="value">${dash(project.scope)}</span></div>
      </div>
    </a>
  </li>`;
}

/** @param {'featured'|'all'} set */
export function renderProjects(container, set = 'featured') {
  if (!container) return;
  const list = set === 'all' ? projects : featuredProjects();
  container.innerHTML = list.map(card).join('');
}
