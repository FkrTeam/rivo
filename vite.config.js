import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readdirSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const page = (name) => fileURLToPath(new URL(name, import.meta.url));

/**
 * Clean URLs, the way the deployed Worker serves them: /projects is
 * projects.html, /projects/fiat-house is projects/fiat-house.html. The site
 * links to those paths, so dev and preview must resolve them too - otherwise
 * only production would be exercised.
 */
const cleanUrls = (dir) => (req, _res, next) => {
  const [path, query] = req.url.split('?');
  if (path !== '/' && !extname(path)) {
    const file = join(dir, decodeURIComponent(path) + '.html');
    if (existsSync(file)) req.url = path + '.html' + (query ? '?' + query : '');
  }
  next();
};
const cleanUrlsPlugin = {
  name: 'rivo-clean-urls',
  configureServer(server) { server.middlewares.use(cleanUrls(page('.'))); },
  configurePreviewServer(server) { server.middlewares.use(cleanUrls(page('dist'))); },
};

/**
 * Vite 8 builds with Rolldown. Chunking is configured through
 * `build.rolldownOptions.output.codeSplitting` (the Rollup-era
 * `manualChunks` is deprecated in Rolldown).
 *
 * Chunk strategy
 *   index       - DOM shell: navigation, content rendering, loader (tiny)
 *   experience  - WebGL + animation code, loaded after first paint
 *   three       - three.js core + addons (vendor, cached across deploys)
 *   gsap        - GSAP core + ScrollTrigger (vendor)
 */
export default defineConfig({
  base: '/',
  plugins: [cleanUrlsPlugin],
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 2048,
    cssCodeSplit: true, // each page gets only its own stylesheet (index and studio share no CSS)
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 700, // three.js core is ~660 kB minified (175 kB gzip); it is already its own cached chunk
    rolldownOptions: {
      // The RIVO site (index.html), the generated project pages (projects.html, projects/*.html,
      // see scripts/build-pages.mjs) and the studio composition demo (studio.html).
      input: {
        main: page('index.html'),
        projects: page('projects.html'),
        ...Object.fromEntries(
          readdirSync(page('projects/')).filter((f) => f.endsWith('.html')).map((f) => [`project-${f.replace(/\.html$/, '')}`, page(`projects/${f}`)]),
        ),
        studio: page('studio.html'),
      },
      output: {
        entryFileNames: 'assets/js/[name]-[hash].js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: ({ names }) => {
          const name = names?.[0] ?? '';
          if (/\.css$/i.test(name)) return 'assets/css/[name]-[hash][extname]';
          if (/\.(woff2?|ttf|otf)$/i.test(name)) return 'assets/fonts/[name]-[hash][extname]';
          if (/basis_transcoder|\.wasm$/i.test(name)) return 'assets/decoders/[name]-[hash][extname]';
          return 'assets/misc/[name]-[hash][extname]';
        },
        codeSplitting: {
          groups: [
            { name: 'three', test: /[\/]node_modules[\/]three[\/]/, priority: 20 },
            { name: 'gsap', test: /[\/]node_modules[\/]gsap[\/]/, priority: 20 },
          ],
        },
      },
    },
  },
  server: { port: 5173, strictPort: false },
  preview: { port: 4173 },
});
