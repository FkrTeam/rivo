import { WebGLRenderer, SRGBColorSpace, ACESFilmicToneMapping } from 'three';

/** The one WebGLRenderer for the whole site. Throws if a context cannot be created. */
export function createRenderer(canvas) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    stencil: false,
    depth: true,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
  });
  renderer.setClearColor(0x0b0b0b, 1);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = false;
  return renderer;
}

/**
 * Adaptive device-pixel-ratio. Starts from a clamped DPR and steps down when
 * measured frame intervals stay above budget. Never steps back up (no oscillation).
 */
export class AdaptiveResolution {
  constructor(renderer, { mobile }) {
    this.renderer = renderer;
    this.cap = mobile ? 1.5 : 1.75;
    this.quality = 1;
    this.min = mobile ? 0.6 : 0.65;
    this.samples = [];
    this.apply();
  }
  get dpr() {
    return Math.min(window.devicePixelRatio || 1, this.cap) * this.quality;
  }
  apply() {
    this.renderer.setPixelRatio(this.dpr);
  }
  /** Feed the interval (ms) between two consecutively rendered frames. Returns true when DPR changed. */
  sample(ms) {
    if (ms > 120) return false; // gap in rendering, not a performance signal
    this.samples.push(ms);
    if (this.samples.length < 45) return false;
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    this.samples.length = 0;
    if (avg > 21 && this.quality > this.min) {
      this.quality = Math.max(this.min, this.quality - 0.15);
      this.apply();
      return true;
    }
    return false;
  }
}
