/**
 * Fixed navigation: active-section dot, mobile menu, scrolled state.
 * Pure DOM + IntersectionObserver; no animation library involved.
 */
export function initNavigation() {
  const nav = document.getElementById('nav');
  const menu = document.getElementById('nav-menu');
  const toggle = nav.querySelector('.nav__toggle');
  const links = [...menu.querySelectorAll('a[data-section]')];
  const mobile = window.matchMedia('(max-width: 900px)');

  /* ---- active section -> dot position ---- */
  const byId = new Map(links.map((a) => [a.dataset.section, a]));
  let current = null;

  function placeDot() {
    const a = current ? byId.get(current) : null;
    if (!a || mobile.matches) {
      menu.style.setProperty('--dot-o', '0');
      return;
    }
    const x = a.offsetLeft + a.offsetWidth / 2;
    menu.style.setProperty('--dot-x', `${x}px`);
    menu.style.setProperty('--dot-o', '1');
  }

  function setActive(id) {
    if (current === id) return;
    current = id;
    links.forEach((a) => {
      if (a.dataset.section === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    placeDot();
  }

  const sections = [...document.querySelectorAll('main > section[id]')];
  const ratios = new Map();
  // generated pages name their nav entry (data-current="work") instead of tracking sections
  const forced = menu.dataset.current;
  if (forced) { setActive(forced); sections.length = 0; }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => ratios.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
      let best = null;
      let bestRatio = 0.05;
      ratios.forEach((r, id) => {
        if (r > bestRatio) { best = id; bestRatio = r; }
      });
      // sections without a nav entry clear the dot
      setActive(best && byId.has(best) ? best : null);
    },
    { rootMargin: '-35% 0px -45% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
  );
  sections.forEach((s) => io.observe(s));
  window.addEventListener('resize', placeDot, { passive: true });
  document.fonts?.ready.then(placeDot);

  /* ---- scrolled state ---- */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      nav.classList.toggle('is-scrolled', window.scrollY > 24);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- mobile menu ---- */
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'nav__close';
  close.textContent = 'Close';
  close.hidden = true;
  menu.appendChild(close);

  function setOpen(open) {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    close.hidden = !open;
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) links[0].focus();
    else if (document.activeElement && menu.contains(document.activeElement)) toggle.focus();
  }
  toggle.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
  close.addEventListener('click', () => setOpen(false));
  links.forEach((a) => a.addEventListener('click', () => { if (mobile.matches) setOpen(false); }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) setOpen(false);
  });
  mobile.addEventListener('change', () => { if (!mobile.matches) setOpen(false); placeDot(); });

  return { setActive };
}
