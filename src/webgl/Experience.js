import { Vector3 } from 'three';
import gsap from 'gsap';
import { createRenderer, AdaptiveResolution } from './Renderer.js';
import { createCamera, applyPose, fitAspect } from './Camera.js';
import { REF_ASPECT } from './framing.js';
import { createScene } from './Scene.js';
import { AssetManager } from './AssetManager.js';
import { PanelWall } from './objects/PanelWall.js';
import { Monolith } from './objects/Monolith.js';
import { Markers } from './objects/Markers.js';
import { buildKeyframes, createState, STUDY_JOINT, HERO_JOINT } from './states.js';
import { buildIntro, focusDetail } from '../animation/timelines.js';
import { buildScroll, onApproach } from '../animation/scroll.js';
import { details } from '../data/content.js';

const NEUTRAL_FOCUS = { x: 0, y: 0, z: 0 };
const RENDER_TAIL_MS = 400;

/** Viewport aspect, clamped to sane bounds; a hidden / zero-size viewport falls back to the layout's reference. */
function viewportAspect(layout) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (!(w > 0 && h > 0)) return REF_ASPECT[layout];
  return Math.min(4, Math.max(0.3, w / h));
}

export async function createExperience(options) {
  const experience = new Experience(options);
  await experience.init();
  return experience;
}

/**
 * One canvas, one renderer, one scene, one master loop (gsap.ticker).
 * Renders on demand: whenever state changed recently, the view resized or the
 * page scrolled. Idle, hidden or fully occluded, it renders nothing.
 */
class Experience {
  constructor({ canvas, ui, reduceMotion }) {
    this.canvas = canvas;
    this.ui = ui;
    this.reduceMotion = reduceMotion;
    this.mobileQuery = window.matchMedia('(max-width: 900px)');
    this.mobile = this.mobileQuery.matches;
    this.layout = this.mobile ? 'mobile' : 'desktop';
    this.aspect = viewportAspect(this.layout);
    this.kf = buildKeyframes(this.layout, this.aspect);
    this.state = createState(this.kf);
    this.reframeTimer = 0;

    this.hero = document.getElementById('hero');
    this.datumText = this.hero.querySelector('.hero__datum-text');
    this.heroDot = this.hero.querySelector('.hero__dot');
    this.heroLeader = this.hero.querySelector('.hero__leader');

    this.ready = false;
    this.paused = document.hidden;
    this.occluded = false;
    this.contextLost = false;
    this.dirtyUntil = 0;
    this.lastFrame = 0;
    this.intro = null;
    this.scroll = null;
    this.disposed = false;

    this.tick = this.tick.bind(this);
    this.invalidate = this.invalidate.bind(this);
    this.resize = this.resize.bind(this);
    this.joint = new Vector3();
  }

  /* ------------------------------------------------------------------ init */

  async init() {
    // Stage 1 - hero critical: renderer, camera, environment, the panel module
    this.renderer = createRenderer(this.canvas);
    this.resolution = new AdaptiveResolution(this.renderer, { mobile: this.mobile });
    this.camera = createCamera(this.aspect, this.layout);
    this.environment = createScene(this.renderer);
    this.scene = this.environment.scene;
    this.assets = new AssetManager(this.renderer);

    const gltf = await this.assets.loadModel('panel');
    let panel = null;
    gltf.scene.traverse((o) => { if (!panel && o.isMesh) panel = o; });
    if (!panel) throw new Error('panel.glb contains no mesh');

    this.wall = new PanelWall(panel.geometry, { mobile: this.mobile, detail: this.mobile ? 0.6 : 1 });
    this.monolith = new Monolith();
    this.monolith.setSize(this.wall.width, this.wall.height);
    this.markers = new Markers();
    this.scene.add(this.wall.mesh, this.monolith.mesh, this.markers.group);

    this.resize();
    this.applyState();

    // Stage 2 - prewarm: compile every program while the objects are still hidden
    const warm = [this.monolith.mesh, this.markers.vertical, this.markers.horizontal, this.markers.dot];
    warm.forEach((m) => { m.visible = true; });
    await this.renderer.compileAsync(this.scene, this.camera);
    this.applyState(); // restores real visibility
    this.renderer.render(this.scene, this.camera); // first frame: GPU uploads happen here, off-screen

    if (this.disposed) return;
    this.bindEvents();
    gsap.ticker.add(this.tick);
    if (import.meta.env.DEV) window.__gsap = gsap;
    this.ready = true;
    this.canvas.classList.add('is-ready');
    this.invalidate();

    if (this.reduceMotion) {
      Object.assign(this.state, this.kf.hero);
      this.revealHero();
      this.startScroll();
    } else {
      this.playIntro();
    }

    // Stage 3 - near-future: finish textures (if any are registered) when Detail approaches
    onApproach('detail', () => {
      if (this.assets.hasTextures('materials')) this.assets.preloadGroup('materials');
    });
    this.bindDetail();
  }

  playIntro() {
    this.intro = buildIntro(this.state, this.kf, {
      onUpdate: this.invalidate,
      onComplete: () => {
        this.intro = null;
        this.startScroll();
      },
    });
    this.intro.call(() => this.revealHero(), null, 2.1);

    // A visitor who is already scrolling should not wait for the sequence.
    const skip = () => {
      window.removeEventListener('scroll', skip);
      if (this.intro) this.intro.progress(1);
    };
    if (window.scrollY > 40) skip();
    else {
      window.addEventListener('scroll', skip, { passive: true });
      this.intro.play();
    }
  }

  startScroll() {
    if (this.scroll || this.disposed) return;
    this.scroll = buildScroll(this.state, this.kf, {
      onUpdate: this.invalidate,
      reduceMotion: this.reduceMotion,
      onOcclusion: (hidden) => {
        this.occluded = hidden;
        if (!hidden) this.invalidate();
      },
    });
  }

  /* ---------------------------------------------------------- detail focus */

  bindDetail() {
    const section = document.getElementById('detail');
    if (!section) return;
    let inside = false;
    const neutral = () => focusDetail(this.state, NEUTRAL_FOCUS, 1, { onUpdate: this.invalidate, instant: this.reduceMotion });
    const focus = (id) => {
      const d = id ? details[id] : null;
      if (!d) return neutral();
      focusDetail(this.state, d.focus, d.zoom, { onUpdate: this.invalidate, instant: this.reduceMotion });
    };

    const io = new IntersectionObserver(([e]) => {
      inside = e.isIntersecting;
      if (inside) focus(this.ui.pressed);
      else neutral();
    }, { threshold: 0.02 });
    io.observe(section);

    this.ui.onDetail((id) => { if (inside) focus(id); });

    // The term nearest the viewport centre becomes the pressed one while scrolling.
    const tio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) this.ui.press(e.target.dataset.detail); });
    }, { rootMargin: '-42% 0px -42% 0px' });
    this.ui.terms.forEach((t) => tio.observe(t));
    this.observers = [io, tio];
  }

  /* --------------------------------------------------------------- events */

  bindEvents() {
    window.addEventListener('resize', this.resize, { passive: true });
    window.addEventListener('scroll', this.invalidate, { passive: true });
    document.addEventListener('visibilitychange', () => {
      this.paused = document.hidden;
      if (!this.paused) this.invalidate();
    });
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.contextLost = true;
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.contextLost = false;
      this.invalidate();
    });
    this.mobileQuery.addEventListener('change', () => this.setLayout(this.mobileQuery.matches));
    this.watchDpr();
  }

  /** Re-arm a media query for the current DPR so zoom / monitor changes re-apply resolution. */
  watchDpr() {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onChange = () => {
      mq.removeEventListener('change', onChange);
      this.resolution.apply();
      this.resize();
      this.watchDpr();
    };
    mq.addEventListener('change', onChange);
  }

  setLayout(mobile) {
    if (mobile === this.mobile) return;
    this.mobile = mobile;
    this.layout = mobile ? 'mobile' : 'desktop';
    this.wall.setLayout(mobile);
    this.wall.material.userData.uniforms.uDetail.value = mobile ? 0.6 : 1;
    this.monolith.setSize(this.wall.width, this.wall.height);
    fitAspect(this.camera, this.layout, this.aspect);
    this.reframe();
  }

  /**
   * Keyframes are solved for the current aspect ratio (framing.js), so a new
   * aspect means new camera poses: rebuild them and re-arm the choreography at
   * the current scroll position. A running intro is cut to its end.
   */
  reframe() {
    clearTimeout(this.reframeTimer);
    this.reframeTimer = 0;
    if (this.disposed) return;
    this.kf = buildKeyframes(this.layout, this.aspect);
    if (this.intro) {
      this.intro.kill();
      this.intro = null;
      Object.assign(this.state, this.kf.hero);
      this.revealHero();
      this.startScroll();
    } else if (this.scroll) {
      this.scroll.kill();
      this.scroll = null;
      Object.assign(this.state, this.kf.hero);
      this.startScroll();
      this.scroll.refresh();
    } else {
      Object.assign(this.state, this.kf.hero);
    }
    this.invalidate();
  }

  resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    this.renderer.setSize(w, h, false);
    const aspect = viewportAspect(this.layout);
    const changed = Math.abs(aspect - this.aspect) > this.aspect * 0.01;
    this.aspect = aspect;
    fitAspect(this.camera, this.layout, aspect);
    this.invalidate();
    // Re-solve the poses once the viewport settles (a drag-resize fires continuously).
    if (changed && this.ready && !this.reframeTimer) this.reframeTimer = setTimeout(() => this.reframe(), 160);
  }

  invalidate() {
    this.dirtyUntil = performance.now() + RENDER_TAIL_MS;
  }

  /* ---------------------------------------------------------------- frame */

  applyState() {
    const s = this.state;
    this.wall.update(s);
    this.monolith.update(s);
    this.markers.update(s, this.wall, STUDY_JOINT[this.layout], HERO_JOINT[this.layout]);
    applyPose(this.camera, s);
  }

  tick() {
    if (!this.ready || this.paused || this.contextLost || this.occluded) return;
    const now = performance.now();
    if (now > this.dirtyUntil) return;
    this.applyState();
    this.renderer.render(this.scene, this.camera);
    this.updateDatum();
    if (this.lastFrame && this.resolution.sample(now - this.lastFrame)) this.resize();
    this.lastFrame = now;
  }

  /* -------------------------------------------------------- hero datum */

  revealHero() {
    this.updateDatum(true);
    this.hero.classList.add('is-revealed');
  }

  /** Pin the DOM datum (text, leader, dot) to the projected position of the hero joint. */
  updateDatum(force = false) {
    if (!force && (!this.hero.classList.contains('is-revealed') || window.scrollY > window.innerHeight)) return;
    const hj = HERO_JOINT[this.layout];
    this.wall.jointPosition(hj.col, hj.row, this.state, this.joint).project(this.camera);
    const onScreen = this.joint.z < 1 && Math.abs(this.joint.x) < 0.98 && Math.abs(this.joint.y) < 0.98;
    this.heroDot.classList.toggle('is-hidden', !onScreen);
    this.heroLeader.classList.toggle('is-hidden', !onScreen);
    if (!onScreen) return;

    const x = (this.joint.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-this.joint.y * 0.5 + 0.5) * window.innerHeight + window.scrollY; // hero starts at page top
    const style = this.hero.style;
    style.setProperty('--anchor-x', `${x.toFixed(1)}px`);
    style.setProperty('--anchor-y', `${y.toFixed(1)}px`);
    style.setProperty('--datum-y', `${y.toFixed(1)}px`);
    const text = this.datumText.getBoundingClientRect();
    const heroLeft = this.hero.getBoundingClientRect().left;
    const leaderX = text.right - heroLeft + 18;
    const leaderW = Math.max(0, x - leaderX - 16);
    style.setProperty('--leader-x', `${leaderX.toFixed(1)}px`);
    style.setProperty('--leader-w', `${leaderW.toFixed(1)}px`);
  }

  /* -------------------------------------------------------------- dispose */

  async dispose() {
    this.disposed = true;
    clearTimeout(this.reframeTimer);
    gsap.ticker.remove(this.tick);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('scroll', this.invalidate);
    this.observers?.forEach((o) => o.disconnect());
    this.intro?.kill();
    this.scroll?.kill();
    this.wall?.dispose();
    this.monolith?.dispose();
    this.markers?.dispose();
    this.environment?.dispose();
    await this.assets?.dispose();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }
}
