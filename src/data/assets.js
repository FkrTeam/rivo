/**
 * Central asset registry. Every file the runtime loads is named here; nothing
 * else in src/ holds a hard-coded asset URL.
 *
 * `stage` documents when an asset is fetched:
 *   0  first paint (referenced from index.html directly)
 *   1  hero-critical (needed for the first meaningful WebGL frame)
 *   3  near-future (fetched when its section approaches)
 *   4  deferred (only if/when needed)
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const withBase = (path) => `${BASE}${path}`;

export const ASSETS = Object.freeze({
  brand: {
    wordmark: withBase('/assets/brand/rivo-wordmark.svg'),
    font: withBase('/assets/brand/fonts/inter-latin-opsz-normal.woff2'),
  },
  models: {
    panel: { url: withBase('/assets/models/panel.glb'), stage: 1 },
  },
  textures: {
    // GPU-compressed finish textures (optional). When an entry exists and the
    // file loads, PanelMaterial blends it over the procedural finish; otherwise
    // the procedural finish is used alone. Produce with KTX-Software
    // (`ktx create --format R8G8B8_UNORM --encode uastc --zstd 18 in.png out.ktx2`)
    // and list it here, e.g.
    // oak: { url: withBase('/assets/textures/finish-oak.ktx2'), stage: 3, group: 'materials', slot: 'oak' },
  },
  images: {
    dir: withBase('/assets/images'),
  },
});
