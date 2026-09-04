import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { ASSETS } from '../data/assets.js';

/**
 * Loads and caches GLB models and KTX2 textures from the central registry.
 *
 * - One GLTFLoader with the KTX2Loader registered, so GLBs that embed
 *   KHR_texture_basisu textures decode correctly.
 * - KTX2Loader.detectSupport(renderer) runs before any texture request. The
 *   Basis transcoder (js + wasm) is bundled as hashed assets by Vite and only
 *   fetched on the first .ktx2 load.
 * - No Draco / Meshopt decoders are registered: the shipped GLB is uncompressed.
 *   If a compressed GLB is introduced, register the matching decoder here.
 */
export class AssetManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.cache = new Map();
    // No transcoder path: three resolves basis_transcoder.{js,wasm} via import.meta.url,
    // so Vite emits them as hashed assets and they are fetched only on the first .ktx2 load.
    this.ktx2 = new KTX2Loader().detectSupport(renderer);
    this.gltf = new GLTFLoader().setKTX2Loader(this.ktx2);
  }

  loadModel(key) {
    const entry = ASSETS.models[key];
    if (!entry) return Promise.reject(new Error(`Unknown model "${key}"`));
    const cacheKey = `model:${key}`;
    if (!this.cache.has(cacheKey)) this.cache.set(cacheKey, this.gltf.loadAsync(entry.url));
    return this.cache.get(cacheKey);
  }

  loadTexture(key) {
    const entry = ASSETS.textures[key];
    if (!entry) return Promise.reject(new Error(`Unknown texture "${key}"`));
    const cacheKey = `texture:${key}`;
    if (!this.cache.has(cacheKey)) this.cache.set(cacheKey, this.ktx2.loadAsync(entry.url));
    return this.cache.get(cacheKey);
  }

  /** Preload every texture in a registry group (stage 3 / near-future). */
  preloadGroup(group) {
    const keys = Object.keys(ASSETS.textures).filter((k) => ASSETS.textures[k].group === group);
    return Promise.allSettled(keys.map((k) => this.loadTexture(k)));
  }

  hasTextures(group) {
    return Object.values(ASSETS.textures).some((t) => t.group === group);
  }

  async dispose() {
    for (const [key, promise] of this.cache) {
      if (!key.startsWith('texture:')) continue;
      try { (await promise)?.dispose(); } catch { /* never loaded */ }
    }
    this.cache.clear();
    this.ktx2.dispose();
  }
}
