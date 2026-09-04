/**
 * Small DOM interactions the WebGL experience can subscribe to:
 *  - Detail terms (hover / focus / press) -> onDetail(id, reason)
 *  - Process phases entering view -> .is-active (dot on the rule)
 *  - Footer year
 */
export function initInteractions() {
  const listeners = new Set();
  const terms = [...document.querySelectorAll('[data-terms] .term')];
  let pressed = null;

  const emit = (id, reason) => listeners.forEach((fn) => fn(id, reason));

  function press(id) {
    if (pressed === id) return;
    pressed = id;
    terms.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.detail === id)));
    emit(id, 'press');
  }

  terms.forEach((t) => {
    const id = t.dataset.detail;
    t.addEventListener('click', () => { pressed = null; press(id); });
    t.addEventListener('pointerenter', () => emit(id, 'hover'));
    t.addEventListener('focus', () => emit(id, 'hover'));
    t.addEventListener('pointerleave', () => emit(pressed, 'leave'));
    t.addEventListener('blur', () => emit(pressed, 'leave'));
  });

  /* process phases: mark the one crossing the viewport centre */
  const phases = [...document.querySelectorAll('[data-phases] .phase')];
  if (phases.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) phases.forEach((p) => p.classList.toggle('is-active', p === e.target));
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    phases.forEach((p) => io.observe(p));
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  return {
    terms,
    press,
    get pressed() { return pressed; },
    onDetail(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
