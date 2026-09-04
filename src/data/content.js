/**
 * Content that drives both the DOM and the WebGL scene.
 * Marketing copy lives in index.html so it is present at first paint.
 */

/**
 * Material / detail vocabulary. `point` is a world-space point of interest on
 * the assembled block composition (scene units, see src/blocks/choreography.js),
 * `zoom` scales the camera distance. Hovering, focusing or pressing a term in
 * the Detail section moves the close-up there.
 */
export const details = {
  surface: { point: [0.6, 3.98, -0.2], zoom: 0.72 },   // the roof slab's top face
  edge: { point: [3.4, 3.84, 2.2], zoom: 0.5 },        // the roof's front edge where it cantilevers
  joint: { point: [2.9, 3.7, 1.9], zoom: 0.46 },       // where the side wall meets the roof
  reveal: { point: [1.5, 2.1, 1.35], zoom: 0.55 },     // the gap between the glazing and the fin
  volume: { point: [5.6, 1.0, 1.6], zoom: 0.68 },      // the solid cube
  finish: { point: [1.9, 2.2, 1.4], zoom: 0.5 },       // the metal fin
};

/** Section order on the page. Shared by navigation and the scroll choreography. */
export const sections = ['hero', 'about', 'capabilities', 'sectors', 'work', 'detail', 'process', 'contact'];
