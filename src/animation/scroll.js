import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const KEYS = ['reveal', 'align', 'material', 'dim', 'joint', 'dot', 'px', 'py', 'pz', 'tx', 'ty', 'tz'];
const pick = (o) => Object.fromEntries(KEYS.map((k) => [k, o[k]]));

/**
 * Scroll choreography. Native scrolling stays untouched; each section entry
 * scrubs one deterministic `fromTo` segment of the state, so scrolling back
 * plays the assembly in reverse and adjacent segments always share their edge
 * values. Sections with a `through` keyframe also progress while in view
 * (the material wipe in Detail, the assembly in Process).
 *
 * Reduced motion: no scrubbing, no camera travel; the camera cuts on section
 * entry and material / dim crossfade briefly.
 */
export function buildScroll(state, kf, { onUpdate, reduceMotion, onOcclusion }) {
  const triggers = [];
  let prev = pick(kf.hero);

  for (const step of kf.sequence) {
    const el = document.getElementById(step.section);
    if (!el) continue;
    const enter = pick(step.enter);
    const through = step.through ? pick(step.through) : null;

    if (reduceMotion) {
      const cut = (to) => {
        gsap.killTweensOf(state, KEYS.join(','));
        const { px, py, pz, tx, ty, tz, ...soft } = to;
        Object.assign(state, { px, py, pz, tx, ty, tz });
        gsap.to(state, { ...soft, duration: 0.5, ease: 'power1.out', onUpdate });
      };
      const back = prev;
      triggers.push(ScrollTrigger.create({ trigger: el, start: 'top 60%', onEnter: () => cut(enter), onLeaveBack: () => cut(back) }));
      if (through) {
        triggers.push(ScrollTrigger.create({ trigger: el, start: 'center 60%', onEnter: () => cut(through), onLeaveBack: () => cut(enter) }));
      }
    } else {
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 92%',
          end: 'top 22%',
          scrub: 0.9,
          animation: gsap.fromTo(state, { ...prev }, { ...enter, ease: 'none', immediateRender: false, onUpdate }),
        }),
      );
      if (through) {
        triggers.push(
          ScrollTrigger.create({
            trigger: el,
            start: 'top 22%',
            end: 'bottom 85%',
            scrub: 0.9,
            animation: gsap.fromTo(state, { ...enter }, { ...through, ease: 'none', immediateRender: false, onUpdate }),
          }),
        );
      }
    }
    prev = through ?? enter;
  }

  /* Selected Work is an opaque section: skip rendering while it fills the viewport. */
  const work = document.getElementById('work');
  if (work && onOcclusion) {
    triggers.push(
      ScrollTrigger.create({
        trigger: work,
        start: 'top top',
        end: 'bottom bottom',
        onToggle: (self) => onOcclusion(self.isActive),
      }),
    );
  }

  return {
    refresh: () => ScrollTrigger.refresh(),
    kill: () => triggers.forEach((t) => t.kill()),
  };
}

/** Section proximity hook for stage-3 preloading (fires once). */
export function onApproach(sectionId, callback, margin = '120%') {
  const el = document.getElementById(sectionId);
  if (!el) return;
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        callback();
      }
    },
    { rootMargin: `${margin} 0px` },
  );
  io.observe(el);
}
