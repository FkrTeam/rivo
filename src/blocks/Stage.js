import {
  Color,
  DirectionalLight,
  Fog,
  Group,
  Mesh,
  MeshBasicMaterial,
  NoToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  VSMShadowMap,
  WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  THEMES, createMaterial, createContactMaterial, createPoolMaterial, contactGeometry, createEnvironment, disposeShared,
} from './materials.js';
import { BLOCKS, MARKER, ANCHOR, buildTimeline, REST_PROGRESS } from './choreography.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const BASE_FOV = 26;          // long lens: architectural, little distortion
const REF_ASPECT = 1.5;       // below this the horizontal field of view is held instead
const SCRUB = 0.8;            // seconds of catch-up: the structure has mass but never drifts on its own
const RENDER_TAIL_MS = 350;
const DEG = Math.PI / 180;

function effectiveFov(aspect) {
  if (aspect >= REF_ASPECT) return BASE_FOV;
  return (2 * Math.atan(Math.tan((BASE_FOV / 2) * DEG) * (REF_ASPECT / aspect))) / DEG;
}

function viewportAspect() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (!(w > 0 && h > 0)) return 16 / 9;
  return Math.min(4, Math.max(0.3, w / h));
}

export async function createStage(options) {
  const stage = new Stage(options);
  await stage.init();
  return stage;
}

/**
 * One renderer, one scene, one scroll-scrubbed timeline. Renders on demand:
 * only while the timeline is moving, after a resize, or when the page comes
 * back into view. Nothing loops.
 *
 * Options
 *   canvas            the <canvas>
 *   theme             'light' | 'dark' (see materials.js THEMES)
 *   reduceMotion      show the assembled structure, no scrubbing, no intro
 *   endSelector       element whose top reaching the viewport bottom ends the timeline
 *   occluderSelector  opaque section: rendering pauses while it fills the viewport
 *   intro             play a short camera settle on load (default true)
 *   marker            show the joint marker (default: dark theme only)
 *   offset            [x, y, distScale] landscape framing: target shift (x right, y down on screen) and a distance factor
 *   onProgress(p)     page progress 0..1
 *   onAnchor(x, y, onScreen)   projected viewport position of the datum anchor, every frame
 */
class Stage {
  constructor({
    canvas, theme = 'light', reduceMotion = false, endSelector = '#contact', occluderSelector = null,
    intro = true, marker, offset = [0, 0], onProgress, onAnchor,
  }) {
    this.canvas = canvas;
    this.themeName = theme;
    this.theme = THEMES[theme] || THEMES.light;
    this.reduceMotion = reduceMotion;
    this.endSelector = endSelector;
    this.occluderSelector = occluderSelector;
    this.wantsIntro = intro && !reduceMotion;
    this.wantsMarker = marker ?? theme === 'dark';
    this.onProgress = onProgress;
    this.onAnchor = onAnchor;
    /** page-level framing offset added to the camera target (x right, y down on screen), landscape only */
    this.offset = offset;
    this.mobile = window.matchMedia('(max-width: 900px)').matches;
    this.aspect = viewportAspect();
    this.cam = { yaw: 0, pitch: 0, dist: 20, tx: 0, ty: 0, tz: 0 };
    /** close-up modifier: point of interest + zoom, blended in by `fw` */
    this.focusState = { fx: 0, fy: 0, fz: 0, zoom: 1, fw: 0 };
    /** intro offsets, tweened to zero on load */
    this.introState = { dist: 0, pitch: 0 };
    this.markerState = { visible: 0 };
    this.objects = {};
    this.ready = false;
    this.paused = document.hidden;
    this.occluded = false;
    this.contextLost = false;
    this.dirtyUntil = 0;
    this.lastFrame = 0;
    this.disposed = false;
    this.tick = this.tick.bind(this);
    this.invalidate = this.invalidate.bind(this);
    this.resize = this.resize.bind(this);
    this.target = new Vector3();
    this.anchorPoint = new Vector3();
  }

  /* ------------------------------------------------------------------ init */

  async init() {
    const t = this.theme;
    const renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      stencil: false,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NoToneMapping; // linear light, no highlight compression: the page colour stays exact
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = VSMShadowMap;
    this.renderer = renderer;
    this.dprCap = this.mobile ? 1.5 : 1.75;
    this.quality = 1;
    this.applyDpr();

    this.camera = new PerspectiveCamera(effectiveFov(this.aspect), this.aspect, 0.5, 90);

    const scene = new Scene();
    scene.fog = new Fog(new Color(t.background), t.fog[0], t.fog[1]);
    this.environment = createEnvironment(renderer, t);
    scene.environment = this.environment.texture;
    scene.environmentIntensity = t.env.intensity;
    this.scene = scene;

    // Sun: high, left and slightly in front, so shadows fall to the right and back, away from the text.
    const sun = new DirectionalLight(t.sun.color, t.sun.intensity);
    sun.position.set(-9, 15, 8);
    sun.target.position.set(0, 1, 0);
    sun.castShadow = true;
    const sh = sun.shadow;
    sh.mapSize.set(this.mobile ? 1024 : 2048, this.mobile ? 1024 : 2048);
    sh.camera.left = -15; sh.camera.right = 15;
    sh.camera.top = 15; sh.camera.bottom = -15;
    sh.camera.near = 2; sh.camera.far = 50;
    sh.radius = this.mobile ? 4 : 6;
    sh.blurSamples = this.mobile ? 8 : 16;
    sh.bias = -0.0004;
    sh.normalBias = 0.02;
    scene.add(sun, sun.target);
    this.sun = sun;

    // Ground: invisible except for the shadows it receives; the page colour shows through the canvas.
    // The dark theme adds a pool of light on the table beneath it.
    const ground = new Mesh(new PlaneGeometry(120, 120), new ShadowMaterial({ color: 0x000000, opacity: t.shadow, transparent: true }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    this.ground = ground;
    if (t.pool) {
      const pool = new Mesh(contactGeometry, createPoolMaterial(t));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(0.5, -0.01, 0);
      pool.scale.set(64, 50, 1);
      pool.renderOrder = -2;
      scene.add(pool);
      this.pool = pool;
    }

    this.group = new Group();
    scene.add(this.group);
    const contactMaterial = createContactMaterial(t);
    for (const block of BLOCKS) {
      const [w, h, d] = block.size;
      const radius = Math.min(0.035, Math.min(w, h, d) * 0.3);
      const geometry = new RoundedBoxGeometry(w, h, d, 2, radius);
      const kind = t.materials[block.id] || block.material;
      const mesh = new Mesh(geometry, createMaterial(kind, block.size, t));
      mesh.castShadow = kind !== 'glass';
      mesh.receiveShadow = true;
      mesh.name = block.id;
      if (block.grounded) {
        const blob = new Mesh(contactGeometry, contactMaterial);
        blob.rotation.x = -Math.PI / 2;
        blob.position.y = -h / 2 + 0.006;
        blob.scale.set(w * 1.5 + 0.4, d * 1.5 + 0.4, 1);
        blob.renderOrder = -1;
        mesh.add(blob);
      }
      this.group.add(mesh);
      this.objects[block.id] = mesh;
    }

    if (this.wantsMarker && this.objects[MARKER.parent]) {
      // the marker is a small brand-red point that lands on one joint of the assembled structure
      this.marker = new Mesh(
        new SphereGeometry(0.07, 16, 12),
        new MeshBasicMaterial({ color: 0xd54c3f, transparent: true, opacity: 0, fog: false, depthTest: false }),
      );
      this.marker.position.fromArray(MARKER.local);
      this.marker.renderOrder = 10;
      this.objects[MARKER.parent].add(this.marker);
    }

    this.timeline = buildTimeline(this.objects, this.cam, this.marker ? this.markerState : null, { onUpdate: this.invalidate });
    this.resize();
    this.applyCamera();

    // Compile every program off-screen before the first visible frame.
    await renderer.compileAsync(scene, this.camera);
    renderer.render(scene, this.camera);
    if (this.disposed) return;

    this.bindEvents();
    gsap.ticker.add(this.tick);
    this.ready = true;
    this.canvas.classList.add('is-ready');

    if (this.reduceMotion) {
      this.timeline.progress(REST_PROGRESS);
      this.report(REST_PROGRESS);
      this.invalidate();
    } else {
      this.bindScroll();
      if (this.wantsIntro) this.playIntro();
    }
  }

  /** A short camera settle on load: from slightly further and higher into the hero pose. Independent of scroll. */
  playIntro() {
    this.introState.dist = 3.5;
    this.introState.pitch = 4;
    this.intro = gsap.to(this.introState, { dist: 0, pitch: 0, duration: 3.2, ease: 'power2.out', onUpdate: this.invalidate });
    const skip = () => {
      window.removeEventListener('scroll', skip);
      this.intro?.progress(1);
    };
    if (window.scrollY > 40) skip();
    else window.addEventListener('scroll', skip, { passive: true });
  }

  /* ---------------------------------------------------------------- scroll */

  bindScroll() {
    const page = document.getElementById('page') || document.querySelector('main') || document.body;
    const end = this.endSelector ? document.querySelector(this.endSelector) : null;
    this.trigger = ScrollTrigger.create({
      trigger: page,
      start: 'top top',
      endTrigger: end || page,
      end: end ? 'top bottom' : 'bottom bottom',
      scrub: SCRUB,
      animation: this.timeline,
      onUpdate: (self) => this.report(self.progress),
    });
    // While an opaque section fills the viewport there is nothing to draw.
    const occluder = this.occluderSelector ? document.querySelector(this.occluderSelector) : null;
    if (occluder) {
      this.occlusion = ScrollTrigger.create({
        trigger: occluder,
        start: 'top top',
        end: 'bottom bottom',
        onToggle: (self) => {
          this.occluded = self.isActive;
          if (!self.isActive) this.invalidate();
        },
      });
    }
  }

  report(progress) {
    if (this.onProgress) this.onProgress(progress);
  }

  /** QA / reduced-motion helper: jump the whole composition to a page progress and draw it now. */
  seek(progress) {
    this.timeline.progress(Math.max(0, Math.min(1, progress)));
    this.report(progress);
    this.render();
  }

  /* ----------------------------------------------------------------- focus */

  /**
   * Close-up on a point of interest (world units) with a distance factor; null
   * returns to the scroll pose. Blended, so it composes with the scrubbed camera.
   */
  focus(point, zoom = 1, { instant = false } = {}) {
    const f = this.focusState;
    gsap.killTweensOf(f);
    const to = point ? { fx: point[0], fy: point[1], fz: point[2], zoom, fw: 1 } : { fw: 0 };
    if (instant) {
      Object.assign(f, to);
      this.invalidate();
      return;
    }
    // when leaving, keep the last point so the blend eases back along the same path
    gsap.to(f, { ...to, duration: point ? 1.2 : 1.0, ease: 'power3.inOut', onUpdate: this.invalidate });
  }

  /* ---------------------------------------------------------------- events */

  bindEvents() {
    window.addEventListener('resize', this.resize, { passive: true });
    document.addEventListener('visibilitychange', () => {
      this.paused = document.hidden;
      if (!this.paused) this.invalidate();
    });
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.contextLost = true; });
    this.canvas.addEventListener('webglcontextrestored', () => { this.contextLost = false; this.invalidate(); });
  }

  applyDpr() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprCap) * this.quality);
  }

  resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    this.renderer.setSize(w, h, false);
    this.aspect = viewportAspect();
    this.camera.aspect = this.aspect;
    this.camera.fov = effectiveFov(this.aspect);
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  invalidate() {
    this.dirtyUntil = performance.now() + RENDER_TAIL_MS;
  }

  /* ----------------------------------------------------------------- frame */

  applyCamera() {
    const c = this.cam;
    const f = this.focusState;
    // Portrait: the composition sits in the upper half of the screen, the text below it.
    const portrait = this.aspect < 1;
    const lateral = portrait ? 0.1 : this.aspect < REF_ASPECT ? 0.55 : 1;
    const lift = portrait ? -3.4 : 0;
    this.target.set(c.tx * lateral + (portrait ? 0 : this.offset[0]), c.ty + lift + (portrait ? 0 : this.offset[1]), c.tz);
    let dist = c.dist * (portrait ? 0.92 : (this.offset[2] || 1)) + this.introState.dist;
    if (f.fw > 0) {
      // slide the target towards the point of interest, keeping the lateral offset so the close-up stays right of the text
      const zoom = 1 + (f.zoom - 1) * f.fw;
      this.target.x += (f.fx + c.tx * lateral * zoom - this.target.x) * f.fw;
      this.target.y += (f.fy + lift * zoom - this.target.y) * f.fw;
      this.target.z += (f.fz - this.target.z) * f.fw;
      dist *= zoom;
    }
    const yaw = c.yaw * DEG;
    const pitch = (c.pitch + this.introState.pitch) * DEG;
    this.camera.position.set(
      this.target.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      this.target.y + Math.sin(pitch) * dist,
      this.target.z + Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    this.camera.lookAt(this.target);
  }

  render() {
    this.applyCamera();
    if (this.marker) this.marker.material.opacity = this.markerState.visible;
    this.renderer.render(this.scene, this.camera);
    this.projectAnchor();
  }

  /** Report where the datum anchor (a corner of the back wall) lands on screen. */
  projectAnchor() {
    if (!this.onAnchor) return;
    const block = this.objects[ANCHOR.block];
    if (!block) return;
    const p = this.anchorPoint.fromArray(ANCHOR.local);
    block.localToWorld(p).project(this.camera);
    const onScreen = p.z < 1 && Math.abs(p.x) < 0.96 && Math.abs(p.y) < 0.96;
    this.onAnchor((p.x * 0.5 + 0.5) * window.innerWidth, (-p.y * 0.5 + 0.5) * window.innerHeight, onScreen);
  }

  tick() {
    if (!this.ready || this.paused || this.contextLost || this.occluded) return;
    const now = performance.now();
    if (now > this.dirtyUntil) return;
    this.render();
    // Adaptive resolution: step the pixel ratio down if frames stay over budget while scrubbing.
    if (this.lastFrame) {
      const dt = now - this.lastFrame;
      if (dt < 120) {
        this.samples = (this.samples || 0) + 1;
        this.sum = (this.sum || 0) + dt;
        if (this.samples >= 45) {
          const avg = this.sum / this.samples;
          this.samples = 0; this.sum = 0;
          if (avg > 21 && this.quality > 0.65) {
            this.quality = Math.max(0.65, this.quality - 0.15);
            this.applyDpr();
            this.resize();
          }
        }
      }
    }
    this.lastFrame = now;
  }

  /* --------------------------------------------------------------- dispose */

  dispose() {
    this.disposed = true;
    gsap.ticker.remove(this.tick);
    window.removeEventListener('resize', this.resize);
    this.intro?.kill();
    gsap.killTweensOf(this.focusState);
    this.trigger?.kill();
    this.occlusion?.kill();
    this.timeline?.kill();
    for (const mesh of Object.values(this.objects)) {
      mesh.geometry.dispose();
      mesh.material.map?.dispose();
      mesh.material.roughnessMap?.dispose();
      mesh.material.dispose();
    }
    this.marker?.geometry.dispose();
    this.marker?.material.dispose();
    this.pool?.material.dispose();
    this.ground?.geometry.dispose();
    this.ground?.material.dispose();
    this.environment?.dispose();
    disposeShared();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }
}
