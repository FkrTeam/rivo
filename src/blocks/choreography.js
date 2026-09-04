import gsap from 'gsap';

/**
 * The composition and its scroll choreography.
 *
 * Every block is a box: `size` [w, h, d] in scene units (1 unit is roughly a
 * metre of the scale model), a material kind, and a list of keyframes on a
 * normalised page timeline t = 0 (top of the page) .. 1 (the end trigger
 * reaches the bottom of the viewport). Between two keyframes the block moves
 * with a gentle in/out ease so that every motion starts and stops with mass;
 * between two identical keyframes it holds.
 *
 * Three acts:
 *   0.00 - 0.36  SEPARATED   monoliths apart, drifting in on different depths
 *   0.30 - 0.76  ASSEMBLY    plinth, walls, glass, column and roof come together
 *   0.78 - 1.00  OPENING     the structure opens again: negative space for the next section
 *
 * Rotations are degrees. Grounded blocks carry a contact shadow under them.
 *
 * Collision-free by construction: a block only enters the plinth from above
 * (a small lift, then a settle), and paths of blocks moving at the same time
 * never cross - see the notes on each block.
 */
export const BLOCKS = [
  {
    id: 'plinth', size: [9, 0.5, 5.4], material: 'stone', grounded: true,
    keys: [
      { t: 0.00, p: [-7.6, 0.25, 2.4], r: [0, -5, 0] },
      { t: 0.34, p: [0, 0.25, 0], r: [0, 0, 0] },
    ],
  },
  {
    // long back wall: comes from the right rear, turning square as it lands on the plinth
    id: 'wallA', size: [7.2, 3.2, 0.4], material: 'concrete', grounded: true,
    keys: [
      { t: 0.00, p: [4.6, 1.6, -6.2], r: [0, -14, 0] },
      { t: 0.30, p: [0.6, 2.36, -2.6], r: [0, -5, 0] },
      { t: 0.44, p: [-0.4, 2.1, -1.9], r: [0, 0, 0] },
      { t: 0.78, p: [-0.4, 2.1, -1.9], r: [0, 0, 0] },
      { t: 1.00, p: [-2.4, 2.1, -3.6], r: [0, -8, 0] },
    ],
  },
  {
    // short side wall: from the right, rises onto the plinth after the back wall
    id: 'wallB', size: [0.4, 3.2, 3.6], material: 'plaster', grounded: true,
    keys: [
      { t: 0.00, p: [8.4, 1.6, 2.0], r: [0, 12, 0] },
      { t: 0.28, p: [8.4, 1.6, 2.0], r: [0, 12, 0] },
      { t: 0.46, p: [4.3, 2.4, 1.8], r: [0, 5, 0] },
      { t: 0.60, p: [2.9, 2.1, 0.2], r: [0, 0, 0] },
      { t: 0.80, p: [2.9, 2.1, 0.2], r: [0, 0, 0] },
      { t: 1.00, p: [3.7, 2.1, 0.5], r: [0, 14, 0] },
    ],
  },
  {
    // roof slab: high and tilted, lowered onto the walls last; lifts away at the end
    id: 'roof', size: [8.6, 0.28, 5.0], material: 'plaster', grounded: false,
    keys: [
      { t: 0.00, p: [1.0, 5.4, 0.8], r: [0, 7, -3] },
      { t: 0.50, p: [1.0, 5.2, 0.2], r: [0, 3, -1.2] },
      { t: 0.76, p: [0.6, 3.84, -0.2], r: [0, 0, 0] },
      { t: 0.82, p: [0.6, 3.84, -0.2], r: [0, 0, 0] },
      { t: 1.00, p: [0.2, 6.6, -2.4], r: [0, -4, 2.5] },
    ],
  },
  {
    // column: from the far front, lifted over the plinth edge, settles under the roof corner
    id: 'column', size: [0.32, 3.2, 0.32], material: 'concrete', grounded: true,
    keys: [
      { t: 0.00, p: [-2.6, 1.6, 5.2], r: [0, 0, 0] },
      { t: 0.22, p: [-3.2, 2.4, 4.0], r: [0, 0, 0] },
      { t: 0.52, p: [-3.2, 2.1, 1.7], r: [0, 0, 0] },
    ],
  },
  {
    // glazing: slides in from the left behind the column; drops back to the ground at the end
    id: 'glass', size: [4.2, 3.2, 0.06], material: 'glass', grounded: true,
    keys: [
      { t: 0.00, p: [-21, 1.6, 1.3], r: [0, 0, 0] },
      { t: 0.38, p: [-21, 1.6, 1.3], r: [0, 0, 0] },
      { t: 0.60, p: [-4.6, 2.4, 1.3], r: [0, 0, 0] },
      { t: 0.70, p: [-0.6, 2.1, 1.3], r: [0, 0, 0] },
      { t: 0.80, p: [-0.6, 2.1, 1.3], r: [0, 0, 0] },
      { t: 0.92, p: [-4.4, 2.4, 1.8], r: [0, 0, 0] },
      { t: 1.00, p: [-5.6, 1.6, 2.4], r: [0, 0, 0] },
    ],
  },
  {
    // brushed-metal fin: the last, thinnest element; passes in front of everything
    id: 'fin', size: [0.05, 3.2, 1.6], material: 'metal', grounded: true,
    keys: [
      { t: 0.00, p: [-19, 1.6, 2.5], r: [0, 0, 0] },
      { t: 0.30, p: [-19, 1.6, 2.5], r: [0, 0, 0] },
      { t: 0.58, p: [-2.4, 2.45, 2.6], r: [0, 0, 0] },
      { t: 0.74, p: [1.9, 2.1, 1.4], r: [0, 0, 0] },
      { t: 0.84, p: [1.9, 2.1, 1.4], r: [0, 0, 0] },
      { t: 1.00, p: [2.7, 2.1, 2.3], r: [0, 0, 0] },
    ],
  },
  {
    // lintel: rests far behind the back wall, rises above it, travels forward under the
    // descending roof (over the wall, in front of it) and settles on the ground in front
    id: 'beam', size: [5.6, 0.42, 0.42], material: 'concrete', grounded: false,
    keys: [
      { t: 0.00, p: [-1.5, 0.21, -7.5], r: [0, 0, 0] },
      { t: 0.34, p: [-1.5, 0.21, -7.5], r: [0, 0, 0] },
      { t: 0.46, p: [-0.5, 4.3, -6.0], r: [0, 0, 0] },
      { t: 0.64, p: [0.6, 4.3, 5.2], r: [0, 0, 0] },
      { t: 0.78, p: [0.6, 0.21, 5.2], r: [0, 0, 0] },
    ],
  },
  {
    // solid cube: the accent volume off the plinth to the right; the only block that turns noticeably
    id: 'cube', size: [2.0, 2.0, 2.0], material: 'charcoal', grounded: true,
    keys: [
      { t: 0.00, p: [8.0, 1.0, -3.6], r: [0, 25, 0] },
      { t: 0.46, p: [8.0, 1.0, -3.6], r: [0, 25, 0] },
      { t: 0.76, p: [5.6, 1.0, 1.6], r: [0, 12, 0] },
      { t: 0.84, p: [5.6, 1.0, 1.6], r: [0, 12, 0] },
      { t: 1.00, p: [7.4, 1.0, -1.4], r: [0, 20, 0] },
    ],
  },
  {
    // low step in front of the plinth
    id: 'step', size: [3.0, 0.26, 1.4], material: 'stone', grounded: true,
    keys: [
      { t: 0.00, p: [-20, 0.13, 3.0], r: [0, 0, 0] },
      { t: 0.14, p: [-20, 0.13, 3.0], r: [0, 0, 0] },
      { t: 0.46, p: [-2.0, 0.13, 3.5], r: [0, 0, 0] },
      { t: 0.82, p: [-2.0, 0.13, 3.5], r: [0, 0, 0] },
      { t: 1.00, p: [-4.4, 0.13, 4.6], r: [0, 0, 0] },
    ],
  },
];

/**
 * Camera: an orbit description, solved per frame. `yaw` (degrees, negative =
 * camera to the left), `pitch` (degrees above the horizon), `dist` from the
 * target, and the target itself. The target x offset shifts the composition to
 * the right of the screen so the text columns on the left stay clear; portrait
 * layouts scale that offset down (see Stage).
 */
export const CAMERA_KEYS = [
  { t: 0.00, yaw: -30, pitch: 16, dist: 26.0, tx: -4.6, ty: 2.2, tz: 0.4 },
  { t: 0.34, yaw: -21, pitch: 14, dist: 23.5, tx: -3.2, ty: 2.3, tz: 0.2 },
  { t: 0.62, yaw: -11, pitch: 12, dist: 23.5, tx: -3.6, ty: 2.2, tz: 0.0 },
  { t: 0.80, yaw: -5, pitch: 11, dist: 22.5, tx: -3.4, ty: 2.2, tz: 0.0 },
  { t: 1.00, yaw: 4, pitch: 15, dist: 27.0, tx: -3.6, ty: 2.3, tz: -0.6 },
];

/**
 * The marker: a small point that lands on one joint of the assembled structure
 * (the roof's front edge above the side wall) and leaves with the roof.
 * Given as the roof's child, in roof-local units; `visible` is a tween on 0..1.
 */
export const MARKER = {
  parent: 'roof',
  local: [2.3, -0.14, 2.5],
  keys: [
    { t: 0.72, v: 0 },
    { t: 0.78, v: 1 },
    { t: 0.83, v: 1 },
    { t: 0.9, v: 0 },
  ],
};

/** The datum anchor: a real corner of the back wall (its top, front, left corner). */
export const ANCHOR = { block: 'wallA', local: [-3.6, 1.6, 0.2] };

/** Progress shown when motion is reduced: the assembled structure. */
export const REST_PROGRESS = 0.77;

const DEG = Math.PI / 180;
const EASE = 'power2.inOut';

/**
 * Build the master timeline (duration 1 = the whole page). `objects` maps
 * block id -> Object3D; `cam` is the live camera pose object; `marker` is an
 * object with a numeric `visible`.
 */
export function buildTimeline(objects, cam, marker, { onUpdate }) {
  const tl = gsap.timeline({ paused: true, onUpdate, defaults: { ease: EASE } });

  for (const block of BLOCKS) {
    const obj = objects[block.id];
    if (!obj) continue;
    const first = block.keys[0];
    obj.position.set(first.p[0], first.p[1], first.p[2]);
    obj.rotation.set(first.r[0] * DEG, first.r[1] * DEG, first.r[2] * DEG);
    for (let i = 1; i < block.keys.length; i++) {
      const a = block.keys[i - 1];
      const b = block.keys[i];
      const duration = b.t - a.t;
      if (duration <= 0) continue;
      const moved = a.p.some((v, k) => v !== b.p[k]);
      const turned = a.r.some((v, k) => v !== b.r[k]);
      if (moved) tl.to(obj.position, { x: b.p[0], y: b.p[1], z: b.p[2], duration, immediateRender: false }, a.t);
      if (turned) tl.to(obj.rotation, { x: b.r[0] * DEG, y: b.r[1] * DEG, z: b.r[2] * DEG, duration, immediateRender: false }, a.t);
    }
  }

  const c0 = CAMERA_KEYS[0];
  Object.assign(cam, { yaw: c0.yaw, pitch: c0.pitch, dist: c0.dist, tx: c0.tx, ty: c0.ty, tz: c0.tz });
  for (let i = 1; i < CAMERA_KEYS.length; i++) {
    const a = CAMERA_KEYS[i - 1];
    const b = CAMERA_KEYS[i];
    // the camera is one continuous slow move: a softer ease than the blocks, so it never "arrives"
    tl.to(cam, { yaw: b.yaw, pitch: b.pitch, dist: b.dist, tx: b.tx, ty: b.ty, tz: b.tz, duration: b.t - a.t, ease: 'sine.inOut', immediateRender: false }, a.t);
  }

  if (marker) {
    marker.visible = MARKER.keys[0].v;
    for (let i = 1; i < MARKER.keys.length; i++) {
      const a = MARKER.keys[i - 1];
      const b = MARKER.keys[i];
      if (a.v !== b.v) tl.to(marker, { visible: b.v, duration: b.t - a.t, ease: 'power1.inOut', immediateRender: false }, a.t);
    }
  }

  // Force the total duration to exactly 1 even if the last key ends early.
  tl.to({}, { duration: 0 }, 1);
  return tl;
}
