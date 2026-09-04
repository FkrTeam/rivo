import gsap from 'gsap';

/**
 * Hero intro: RAW VOLUME -> REVEAL -> ALIGNMENT, played once when the first
 * WebGL frame is ready. The camera settles at the same time: one weighted move.
 */
export function buildIntro(state, kf, { onUpdate, onComplete }) {
  const tl = gsap.timeline({ paused: true, onUpdate, onComplete, defaults: { ease: 'power3.inOut' } });
  const h = kf.hero;
  tl.to(state, { px: h.px, py: h.py, pz: h.pz, tx: h.tx, ty: h.ty, tz: h.tz, duration: 3.4, ease: 'power2.out' }, 0);
  tl.to(state, { reveal: 1, duration: 1.5 }, 0.45); // the cut
  tl.to(state, { align: 1, duration: 1.7 }, 1.55); // modules settle into rhythm
  return tl;
}

/**
 * Detail close-up. Hovering / pressing a term moves the point of interest and
 * the camera distance; leaving the section returns to neutral.
 */
export function focusDetail(state, focus, zoom, { onUpdate, instant = false }) {
  gsap.killTweensOf(state, 'fx,fy,fz,zoom');
  if (instant) {
    Object.assign(state, { fx: focus.x, fy: focus.y, fz: focus.z, zoom });
    onUpdate();
    return;
  }
  gsap.to(state, { fx: focus.x, fy: focus.y, fz: focus.z, zoom, duration: 1.1, ease: 'power3.inOut', onUpdate });
}
