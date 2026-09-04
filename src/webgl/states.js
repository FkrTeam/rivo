/**
 * The assembly sequence. One set of geometry, one continuous story:
 *   RAW VOLUME -> REVEAL -> ALIGNMENT -> JOINT -> MATERIAL -> COMPLETED SYSTEM
 *
 * Each keyframe below is a full description of the wall + camera at a moment.
 * GSAP tweens between them: on load (hero intro) and on scroll (section by section).
 *
 * Two rules keep the page reading as one movement rather than a series of cuts:
 *  - the camera path is monotonic: it swings from the left towards a frontal view
 *    and dollies in to the joint, then pulls back out; nothing swings back;
 *  - every wall property only ever moves forward: reveals open once, modules settle
 *    once, the finish wipes across the wall once (it starts on the studied joint in
 *    Detail and carries through the rest of the wall in Process), the dot lands once.
 */
import { WALL } from './panelSpec.js';
import { solvePose } from './framing.js';

export { WALL };

/** Wall-state uniforms */
const RAW = { reveal: 0, align: 0, material: 0, dim: 1, joint: 0, dot: 0 };
const REVEAL = { ...RAW, reveal: 1 };
const ALIGN = { ...REVEAL, align: 1 };
const JOINT = { ...ALIGN, joint: 1 };
const STUDIED = { ...JOINT, material: 0.32, joint: 0.35 }; // finish applied to the modules around the studied joint
const CARRIED = { ...STUDIED, joint: 0 }; // leaving Detail: the rule fades, the finish stays
const COMPLETE = { ...CARRIED, material: 1, dot: 1 };

/**
 * Joints of interest (column boundary / row boundary in cell units).
 * Desktop wall is 6 x 3: boundary col 1 sits between the 1st and 2nd column,
 * boundary row 2 between the 2nd and 3rd row (counted from the bottom).
 */
export const STUDY_JOINT = { desktop: { col: 1, row: 2 }, mobile: { col: 1, row: 3 } };
export const HERO_JOINT = { desktop: { col: 2, row: 2 }, mobile: { col: 1, row: 3 } };

/** The four modules around the study joint: what the Detail close-up frames. */
export function detailRegion(layout) {
  const j = STUDY_JOINT[layout];
  return { cols: [j.col - 1, j.col], rows: [j.row - 1, j.row] };
}

/**
 * Camera poses. `yaw` / `pitch` (degrees; negative yaw = camera to the left of the
 * wall, positive pitch = above) set the viewing direction. `frame` =
 * [left, top, right, bottom] as fractions of the viewport: the distance and target
 * are solved per aspect ratio so the framed region (`region`, default the whole
 * wall) sits inside that rectangle (see framing.js).
 */
const CAM = {
  desktop: {
    // Text lives in the left columns; the wall is framed in the right half, clear of the title.
    heroStart: { yaw: -19, pitch: 8, frame: [0.44, 0.06, 0.98, 0.8] },
    hero: { yaw: -14, pitch: 6, frame: [0.47, 0.1, 0.95, 0.72] },
    about: { yaw: -10, pitch: 4, frame: [0.56, 0.12, 0.96, 0.92] },
    capabilities: { yaw: -7, pitch: 2.5, frame: [0.56, 0.14, 0.96, 0.94] },
    sectors: { yaw: -5, pitch: 1.5, frame: [0.57, 0.16, 0.95, 0.9] },
    // close-up on the four modules around the study joint; the left of the screen stays empty for the terms
    detail: { yaw: -4, pitch: 1, frame: [0.52, 0.12, 0.96, 0.92], region: 'detail' },
    detailEnd: { yaw: -3, pitch: 0.5, frame: [0.5, 0.1, 0.97, 0.94], region: 'detail' },
    process: { yaw: -2, pitch: 0, frame: [0.5, 0.12, 0.96, 0.92] },
    processEnd: { yaw: -1, pitch: 0, frame: [0.5, 0.14, 0.95, 0.9] },
    contact: { yaw: 0, pitch: 1.5, frame: [0.52, 0.16, 0.94, 0.88] },
  },
  mobile: {
    // Portrait wall (3 x 4). Text stacks over a dimmer wall, so the wall fills the sheet.
    heroStart: { yaw: -12, pitch: 7, frame: [0.04, 0.1, 0.96, 0.92] },
    hero: { yaw: -9, pitch: 5, frame: [0.06, 0.12, 0.94, 0.78] },
    about: { yaw: -7, pitch: 3.5, frame: [0.08, 0.12, 0.92, 0.92] },
    capabilities: { yaw: -5, pitch: 2, frame: [0.08, 0.12, 0.92, 0.92] },
    sectors: { yaw: -3.5, pitch: 1, frame: [0.1, 0.14, 0.9, 0.9] },
    detail: { yaw: -3, pitch: 0.5, frame: [0.08, 0.12, 0.92, 0.62], region: 'detail' },
    detailEnd: { yaw: -2, pitch: 0.5, frame: [0.06, 0.1, 0.94, 0.64], region: 'detail' },
    process: { yaw: -1.5, pitch: 0, frame: [0.06, 0.1, 0.94, 0.94] },
    processEnd: { yaw: -0.5, pitch: 0, frame: [0.08, 0.12, 0.92, 0.92] },
    contact: { yaw: 0, pitch: 1, frame: [0.1, 0.14, 0.9, 0.9] },
  },
};

const DEG = Math.PI / 180;

function flat(wall, pose, layout, aspect) {
  const yaw = pose.yaw * DEG;
  const pitch = pose.pitch * DEG;
  const p = [Math.sin(yaw) * Math.cos(pitch) * 10, Math.sin(pitch) * 10, Math.cos(yaw) * Math.cos(pitch) * 10];
  const region = pose.region === 'detail' ? detailRegion(layout) : null;
  const cam = solvePose({ p, t: [0, 0, 0], frame: pose.frame, region }, layout, aspect, wall);
  return {
    ...wall,
    px: cam.p[0], py: cam.p[1], pz: cam.p[2],
    tx: cam.t[0], ty: cam.t[1], tz: cam.t[2],
  };
}

/** Build the ordered keyframes for one layout (desktop / mobile) and viewport aspect ratio. */
export function buildKeyframes(layout, aspect = 16 / 9) {
  const c = CAM[layout];
  const kf = (wall, pose) => flat(wall, pose, layout, aspect);
  return {
    aspect,
    introStart: kf(RAW, c.heroStart),
    hero: kf(ALIGN, c.hero),
    sequence: [
      { section: 'about', enter: kf({ ...ALIGN, dim: 0.85 }, c.about) },
      { section: 'capabilities', enter: kf({ ...ALIGN, dim: 0.75 }, c.capabilities) },
      { section: 'sectors', enter: kf({ ...ALIGN, dim: 0.65 }, c.sectors) },
      { section: 'detail', enter: kf(JOINT, c.detail), through: kf(STUDIED, c.detailEnd) },
      { section: 'process', enter: kf(CARRIED, c.process), through: kf(COMPLETE, c.processEnd) },
      { section: 'contact', enter: kf({ ...COMPLETE, dim: 0.7 }, c.contact) },
    ],
  };
}

/** Live state object that the scene reads every frame. */
export function createState(kf) {
  return { ...kf.introStart, fx: 0, fy: 0, fz: 0, zoom: 1 };
}
