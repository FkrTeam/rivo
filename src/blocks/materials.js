import {
  CanvasTexture,
  Color,
  BackSide,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  PlaneGeometry,
  PMREMGenerator,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';

/**
 * Surfaces for the block composition, in two themes.
 *
 *  light  the studio sheet: warm white, plaster / stone / concrete, soft daylight
 *  dark   the RIVO site: ink lacquer and dark concrete volumes with stone accents,
 *         one warm key light in a dark studio, a pool of light on the table
 *
 * Everything is procedural: two small grain canvases give the matte surfaces
 * their micro-texture; one prefiltered environment lights every material.
 */
export const THEMES = {
  light: {
    background: '#F3F0EA',
    fog: [16, 52],
    palette: {
      plaster: '#ECE7DF',
      stone: '#DDD6CA',
      concrete: '#B9B4AC',
      charcoal: '#67635E',
      glass: '#E2E8E6',
      metal: '#BAB7B1',
    },
    glassOpacity: 0.46,
    env: { zenith: [0.50, 0.57, 0.68], horizon: [0.84, 0.82, 0.78], ground: [0.40, 0.38, 0.35], emitter: [3.2, 3.1, 2.9], bounce: [1.15, 1.08, 1.0], intensity: 0.95 },
    sun: { color: 0xfff6ea, intensity: 1.9 },
    shadow: 0.2,
    contact: 0.28,
    pool: null,
    /** which material each block wears (falls back to the block's own `material`) */
    materials: {},
  },
  dark: {
    background: '#0B0B0B',
    fog: [18, 46],
    palette: {
      // brand ink lifted a step, so a lit face still reads against the sheet
      lacquer: '#3A3733',
      concrete: '#56514B',
      charcoal: '#2E2B28',
      stone: '#C9C4BB',
      plaster: '#8E8981',
      glass: '#9FA8A6',
      metal: '#7A7671',
    },
    glassOpacity: 0.3,
    env: { zenith: [0.11, 0.12, 0.14], horizon: [0.20, 0.19, 0.17], ground: [0.04, 0.04, 0.035], emitter: [7.0, 6.6, 6.0], bounce: [1.2, 1.1, 0.95], intensity: 1.35 },
    sun: { color: 0xf4f1eb, intensity: 3.8 },
    shadow: 0.55,
    contact: 0.5,
    pool: '#232120',
    materials: {
      plinth: 'lacquer', wallA: 'concrete', wallB: 'lacquer', roof: 'stone', column: 'stone',
      glass: 'glass', fin: 'metal', beam: 'concrete', cube: 'lacquer', step: 'stone',
    },
  },
};

/* ------------------------------------------------------------- grain maps */

/** Value-noise canvas, used as a colour tint (map) and a roughness map. */
function grainCanvas(size, { base, amplitude, speckle }) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  let seed = 1337;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const coarse = new Float32Array(64 * 64);
  for (let i = 0; i < coarse.length; i++) coarse[i] = rnd();
  const mid = new Float32Array(16 * 16);
  for (let i = 0; i < mid.length; i++) mid[i] = rnd();
  const smooth = (grid, n, u, v) => {
    const x = u * n, y = v * n;
    const x0 = Math.floor(x) % n, y0 = Math.floor(y) % n;
    const x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
    const fx = x - Math.floor(x), fy = y - Math.floor(y);
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = grid[y0 * n + x0], b = grid[y0 * n + x1], c2 = grid[y1 * n + x0], d2 = grid[y1 * n + x1];
    return (a + (b - a) * sx) * (1 - sy) + (c2 + (d2 - c2) * sx) * sy;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const n = (smooth(mid, 16, u, v) - 0.5) * 0.55 + (smooth(coarse, 64, u, v) - 0.5) * 0.3 + (rnd() - 0.5) * speckle;
      const val = Math.max(0, Math.min(255, Math.round((base + n * amplitude) * 255)));
      const i = (y * size + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = val;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

let shared = null;
function grain() {
  if (shared) return shared;
  const tint = new CanvasTexture(grainCanvas(256, { base: 0.97, amplitude: 0.09, speckle: 0.5 }));
  tint.colorSpace = SRGBColorSpace;
  tint.wrapS = tint.wrapT = RepeatWrapping;
  tint.anisotropy = 4;
  const rough = new CanvasTexture(grainCanvas(256, { base: 0.5, amplitude: 0.9, speckle: 0.9 }));
  rough.colorSpace = NoColorSpace;
  rough.wrapS = rough.wrapT = RepeatWrapping;
  shared = { tint, rough };
  return shared;
}

/** A per-block copy of the grain with a repeat that keeps the grain the same physical size on every block. */
function grainFor(size) {
  const g = grain();
  const longest = Math.max(size[0], size[1], size[2]);
  const rep = Math.max(1, longest / 1.6);
  const tint = g.tint.clone();
  tint.repeat.set(rep, rep);
  const rough = g.rough.clone();
  rough.repeat.set(rep * 1.7, rep * 1.7);
  return { tint, rough };
}

/* -------------------------------------------------------------- materials */

const ROUGHNESS = { plaster: 0.96, stone: 0.8, concrete: 0.88, charcoal: 0.88, lacquer: 0.42 };

/**
 * @param {string} kind    material name from the theme palette
 * @param {number[]} size  block dimensions, used to scale the grain
 * @param {object} theme   one of THEMES
 */
export function createMaterial(kind, size, theme) {
  const color = new Color(theme.palette[kind] ?? theme.palette.concrete);
  switch (kind) {
    case 'glass':
      return new MeshPhysicalMaterial({
        color,
        roughness: 0.16,
        metalness: 0,
        transparent: true,
        opacity: theme.glassOpacity,
        envMapIntensity: 1.35,
        clearcoat: 0.6,
        clearcoatRoughness: 0.12,
        depthWrite: false,
      });
    case 'metal':
      return new MeshStandardMaterial({
        color,
        roughness: 0.36,
        metalness: 0.92,
        envMapIntensity: 1.2,
        roughnessMap: grainFor(size).rough,
      });
    case 'lacquer': {
      // ink lacquer: a matte-satin finish; the grain only modulates the sheen
      const g = grainFor(size);
      return new MeshPhysicalMaterial({
        color,
        roughness: ROUGHNESS.lacquer,
        metalness: 0,
        roughnessMap: g.rough,
        clearcoat: 0.35,
        clearcoatRoughness: 0.5,
        envMapIntensity: 1,
      });
    }
    default: {
      const g = grainFor(size);
      return new MeshStandardMaterial({
        color,
        roughness: ROUGHNESS[kind] ?? 0.85,
        metalness: 0,
        map: g.tint,
        roughnessMap: g.rough,
        envMapIntensity: 1,
      });
    }
  }
}

/* --------------------------------------------------------- contact shadow */

let blobTexture = null;
function radialTexture() {
  if (blobTexture) return blobTexture;
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.7)');
  grad.addColorStop(0.8, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);
  blobTexture = new CanvasTexture(c);
  blobTexture.colorSpace = SRGBColorSpace;
  return blobTexture;
}

/** Radial soft blob, used as an ambient-occlusion "contact shadow" under grounded blocks. */
export function createContactMaterial(theme) {
  return new MeshBasicMaterial({
    color: 0x000000,
    alphaMap: radialTexture(),
    transparent: true,
    opacity: theme.contact,
    depthWrite: false,
  });
}

/** Dark theme: a pool of light on the table under the composition. */
export function createPoolMaterial(theme) {
  return new MeshBasicMaterial({
    color: new Color(theme.pool),
    alphaMap: radialTexture(),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    fog: false,
  });
}

export const contactGeometry = new PlaneGeometry(1, 1);

/* ------------------------------------------------------------ environment */

/**
 * The lighting environment: a gradient dome (zenith / horizon / ground) plus
 * one large emitter high on the left, where the sun sits, and a faint bounce
 * from the opposite side. Prefiltered once with PMREM.
 */
export function createEnvironment(renderer, theme) {
  const e = theme.env;
  const env = new Scene();
  const sky = new Mesh(
    new SphereGeometry(40, 32, 16),
    new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      uniforms: {
        zenith: { value: new Vector3().fromArray(e.zenith) },
        horizon: { value: new Vector3().fromArray(e.horizon) },
        ground: { value: new Vector3().fromArray(e.ground) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 zenith; uniform vec3 horizon; uniform vec3 ground;
        varying vec3 vDir;
        void main() {
          float y = vDir.y;
          vec3 up = mix(horizon, zenith, pow(max(y, 0.0), 0.55));
          vec3 down = mix(horizon, ground, pow(max(-y, 0.0), 0.35));
          gl_FragColor = vec4(y >= 0.0 ? up : down, 1.0);
        }`,
    }),
  );
  env.add(sky);

  const emitter = new Mesh(new PlaneGeometry(18, 12), new MeshBasicMaterial({ color: new Color(...e.emitter) }));
  emitter.position.set(-14, 17, 12);
  emitter.lookAt(0, 0, 0);
  env.add(emitter);

  const bounce = new Mesh(new PlaneGeometry(20, 8), new MeshBasicMaterial({ color: new Color(...e.bounce) }));
  bounce.position.set(18, 6, -10);
  bounce.lookAt(0, 0, 0);
  env.add(bounce);

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(env, 0.04);
  pmrem.dispose();
  [sky, emitter, bounce].forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
  return target;
}

export function disposeShared() {
  if (shared) {
    shared.tint.dispose();
    shared.rough.dispose();
    shared = null;
  }
  if (blobTexture) {
    blobTexture.dispose();
    blobTexture = null;
  }
}
