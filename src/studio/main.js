/**
 * Studio homepage shell. Stage 0: styles, navigation state, the scale rule.
 * Three.js and GSAP arrive with the `Stage` chunk after first paint.
 */
import './styles.css';

document.documentElement.classList.add('js');

const canvas = document.getElementById('gl');
const tick = document.getElementById('scale-tick');
const rule = tick?.parentElement;
const navLinks = [...document.querySelectorAll('.nav__menu a')];

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const devFlag = (name) => import.meta.env.DEV && new URLSearchParams(location.search).has(name);
const wantsReducedMotion = reduceMotion.matches || devFlag('reduced');

/** Scale tick follows the composition's progress (0 at the top, 1 when Contact arrives). */
function onProgress(p) {
  if (!tick || !rule) return;
  const h = rule.clientHeight || 160;
  tick.style.transform = `translateY(${(p * h).toFixed(1)}px)`;
}

/** Current-section state for the navigation. */
const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
if ('IntersectionObserver' in window && sections.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  sections.forEach((s) => io.observe(s));
}

function boot() {
  import('../blocks/Stage.js')
    .then(({ createStage }) => createStage({ canvas, theme: 'light', reduceMotion: wantsReducedMotion, endSelector: '#contact', occluderSelector: '#contact', onProgress }))
    .then((stage) => {
      if (import.meta.env.DEV) window.__studio = stage;
    })
    .catch((err) => {
      console.warn('[studio] WebGL composition unavailable; the page stays on the plain sheet.', err);
      canvas.remove();
    });
}

if (!window.WebGLRenderingContext || devFlag('nowebgl')) {
  canvas.remove();
} else {
  // Boot after the first frame paints; a timer covers background tabs where rAF does not fire.
  let booted = false;
  const once = () => { if (!booted) { booted = true; boot(); } };
  const fallback = setTimeout(once, 1200);
  requestAnimationFrame(() => { clearTimeout(fallback); setTimeout(once, 0); });
}
