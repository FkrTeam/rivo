/**
 * Panel module specification - shared by the GLB build script and the runtime.
 * Units are metres in scene space. One module = a 900 x 1350 mm wall panel.
 */
export const PANEL = Object.freeze({
  width: 0.9,
  height: 1.35,
  depth: 0.09,
  radius: 0.012, // soft chamfer that catches the key light on every edge
  segments: 3,
});

/**
 * The wall: module counts per layout, the measured reveal, and the motion steps.
 * Every step is deterministic and grid-aligned, so the wall reads as one ordered
 * system at every moment of every transition.
 */
export const WALL = Object.freeze({
  desktop: { cols: 6, rows: 3 },
  mobile: { cols: 3, rows: 4 },
  gap: 0.032,
  // ALIGNMENT: after the cut, modules sit this far back and come flush in a wave across the wall
  settle: 0.14,
});
