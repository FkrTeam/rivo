/**
 * Hero slider.
 *
 * The frames live inside the V-cut (styles/components.css, `.hero__slider` is
 * clipped to the region right of the cut). A new frame is not faded in but cut
 * in: a wipe parallel to the cut sweeps it across from the cut edge, then the
 * frame settles from a slight enlargement to rest. One gesture, deterministic,
 * repeated at a fixed interval.
 *
 * Autoplay pauses while the tab is hidden or the hero has scrolled out of view,
 * and is off entirely under prefers-reduced-motion (the first frame stays).
 */
import { heroSlides, HERO_INTERVAL, HERO_WIPE } from '../data/hero.js';
import { resolveImage, sources } from '../data/images.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');

function frame(slide, i) {
  const img = resolveImage(slide.image);
  if (!img) return '';
  const { src, srcset } = sources(img);
  const first = i === 0;
  return `<li class="slide${first ? ' is-current is-settled' : ''}" data-slide="${esc(slide.id)}" aria-hidden="${first ? 'false' : 'true'}">
    <img src="${src}" srcset="${srcset}"
         sizes="(max-width: 900px) 100vw, 64vw" width="${img.width}" height="${img.height}"
         style="object-position: ${esc(slide.focus || '50% 50%')}"
         loading="eager" decoding="${first ? 'sync' : 'async'}" ${first ? 'fetchpriority="high"' : ''} alt="${esc(img.alt)}">
  </li>`;
}

export function initSlider(root) {
  if (!root) return null;
  const slides = heroSlides.filter((s) => resolveImage(s.image));
  if (slides.length === 0) { root.hidden = true; return null; }

  root.innerHTML = `
    <ul class="slides">${slides.map(frame).join('')}</ul>
    <div class="slider__caption" aria-live="polite">
      <span class="spec slider__index" data-index>${pad(1)} / ${pad(slides.length)}</span>
      <span class="slider__title" data-title>${esc(slides[0].title)}</span>
      <span class="spec slider__place" data-place>${esc(slides[0].place)}</span>
      <span class="slider__bar" aria-hidden="true"><i data-bar></i></span>
    </div>`;
  root.hidden = false;
  root.style.setProperty('--interval', `${HERO_INTERVAL}ms`);
  root.style.setProperty('--wipe', `${HERO_WIPE}ms`);

  const items = [...root.querySelectorAll('.slide')];
  const index = root.querySelector('[data-index]');
  const title = root.querySelector('[data-title]');
  const place = root.querySelector('[data-place]');
  const bar = root.querySelector('[data-bar]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let current = 0;
  let timer = 0;
  let inView = true;
  let stopped = false;

  function restartBar() {
    if (!bar) return;
    bar.classList.remove('is-running');
    void bar.offsetWidth; // restart the fill animation
    bar.classList.add('is-running');
  }

  async function show(next) {
    const prev = items[current];
    const el = items[next];
    if (el === prev || el.classList.contains('is-current')) return;
    // never wipe in a frame that is not decoded yet (decode() can hang in a hidden tab: cap the wait)
    const img = el.querySelector('img');
    if (img) await Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 700))]);
    if (items[current] !== prev) return; // superseded while decoding
    prev.classList.remove('is-current', 'is-settled');
    prev.classList.add('is-prev');
    prev.setAttribute('aria-hidden', 'true');
    el.classList.add('is-current');
    el.setAttribute('aria-hidden', 'false');
    current = next;
    if (index) index.textContent = `${pad(next + 1)} / ${pad(items.length)}`;
    if (title) title.textContent = slides[next].title;
    if (place) place.textContent = slides[next].place;
    restartBar();
    setTimeout(() => {
      prev.classList.remove('is-prev');
      el.classList.add('is-settled');
    }, HERO_WIPE + 100);
  }

  const advance = () => show((current + 1) % items.length);

  function schedule() {
    clearTimeout(timer);
    if (stopped || reduced.matches || document.hidden || !inView || items.length < 2) return;
    timer = setTimeout(() => { advance(); schedule(); }, HERO_INTERVAL);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(timer);
    else { restartBar(); schedule(); }
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      inView = entries.some((e) => e.isIntersecting);
      if (inView) { restartBar(); schedule(); } else clearTimeout(timer);
    }, { threshold: 0.05 });
    io.observe(root);
  }
  reduced.addEventListener('change', schedule);

  function stop() { stopped = true; clearTimeout(timer); }
  function start() { stopped = false; restartBar(); schedule(); }

  if (!reduced.matches) restartBar();
  schedule();

  return { show, advance, stop, start, get current() { return current; } };
}
