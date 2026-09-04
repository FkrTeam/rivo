/**
 * The hero datum on the V-cut.
 *
 * The background (styles/base.css, `.bg`) is a fixed V-cut: a line through
 * (--cut-foot, viewport bottom) leaning --cut degrees off vertical, laths to
 * its right, plain ink to its left. The hero's secondary line ("Precision
 * should feel effortless.") is a leader that runs from the copy to that cut,
 * and the red dot marks the point where it lands.
 *
 * Everything is measured from the live CSS tokens, so the dot stays on the
 * cut at every viewport. The hero starts at the top of the document, so hero
 * coordinates equal viewport coordinates while it is in view.
 */
export function initDatum() {
  const hero = document.getElementById('hero');
  if (!hero) return;
  const datumText = hero.querySelector('.hero__datum-text');
  const nav = document.getElementById('nav');
  const mobile = window.matchMedia('(max-width: 900px)');
  const root = document.documentElement;

  // the tokens are clamp()/calc() expressions: resolve them through a probe element
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;top:0;left:0;visibility:hidden;pointer-events:none;box-sizing:content-box;width:var(--cut-foot);padding-left:var(--inset);';
  document.body.appendChild(probe);
  function px(name) {
    const cs = getComputedStyle(probe);
    if (name === '--cut-foot') return parseFloat(cs.width) || 0;
    if (name === '--inset') return parseFloat(cs.paddingLeft) || 0;
    return parseFloat(getComputedStyle(root).getPropertyValue(name)) || 0;
  }
  function cutTan() {
    const deg = parseFloat(getComputedStyle(root).getPropertyValue('--cut')) || 19;
    return Math.tan((deg * Math.PI) / 180);
  }

  function place() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    if (!(W > 0 && H > 0)) return;
    const foot = px('--cut-foot');
    const tan = cutTan();

    // datum height: just under the upper third, clear of the navigation and the title
    const navBottom = nav ? nav.getBoundingClientRect().bottom : 80;
    const y = Math.max(navBottom + H * 0.08, H * (mobile.matches ? 0.36 : 0.42));

    // where the cut crosses that height
    const x = foot + (H - y) * tan;

    const style = hero.style;
    style.setProperty('--hero-h', `${hero.offsetHeight}px`); // the slider's clip follows the cut
    style.setProperty('--anchor-x', `${x.toFixed(1)}px`);
    style.setProperty('--anchor-y', `${y.toFixed(1)}px`);
    style.setProperty('--datum-y', `${y.toFixed(1)}px`);

    if (datumText) {
      const text = datumText.getBoundingClientRect();
      const heroLeft = hero.getBoundingClientRect().left;
      const leaderX = text.right - heroLeft + 18;
      const leaderW = Math.max(0, x - leaderX - 16);
      style.setProperty('--leader-x', `${leaderX.toFixed(1)}px`);
      style.setProperty('--leader-w', `${leaderW.toFixed(1)}px`);
    }
  }

  place();
  window.addEventListener('resize', place, { passive: true });
  document.fonts?.ready.then(place);
  mobile.addEventListener('change', place);

  // reveal once the type is in place
  requestAnimationFrame(() => setTimeout(() => hero.classList.add('is-revealed'), 300));
  setTimeout(() => hero.classList.add('is-revealed'), 1500); // background tabs: rAF may never fire
  return { place };
}
