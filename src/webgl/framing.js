import { PerspectiveCamera, Vector3 } from 'three';
import { PANEL, WALL } from './panelSpec.js';

/**
 * Resolution-independent framing.
 *
 * Poses only describe a viewing direction (position -> target) and, optionally,
 * a `frame`: the viewport rectangle (fractions, y from the top) that a region of
 * the wall (by default the whole wall) must sit inside. The distance and the
 * target are solved here for the real aspect ratio, so the wall lands in the
 * same place on every screen.
 */

export const BASE_FOV = 30;
/** The aspect each layout was composed for. Narrower viewports keep the horizontal field of view instead. */
export const REF_ASPECT = { desktop: 16 / 9, mobile: 9 / 16 };

const DEG = Math.PI / 180;

export function effectiveFov(layout, aspect) {
  const ref = REF_ASPECT[layout];
  if (aspect >= ref) return BASE_FOV;
  return (2 * Math.atan(Math.tan((BASE_FOV / 2) * DEG) * (ref / aspect))) / DEG;
}

/**
 * The eight corners of a region of the wall for a given wall state (reveal gaps,
 * settle). `region` = { cols: [first, last], rows: [first, last] } in cell
 * indices; omitted, the whole wall.
 */
export function wallCorners(layout, s, out = [], region = null) {
  const { cols, rows } = WALL[layout];
  const c0 = region ? region.cols[0] : 0;
  const c1 = region ? region.cols[1] : cols - 1;
  const r0 = region ? region.rows[0] : 0;
  const r1 = region ? region.rows[1] : rows - 1;
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const gap = WALL.gap * s.reveal;
  const pitchX = PANEL.width + gap;
  const pitchY = PANEL.height + gap;
  const xMin = (c0 - cx) * pitchX - PANEL.width / 2;
  const xMax = (c1 - cx) * pitchX + PANEL.width / 2;
  const yMin = (r0 - cy) * pitchY - PANEL.height / 2;
  const yMax = (r1 - cy) * pitchY + PANEL.height / 2;
  const zBack = -PANEL.depth / 2 - WALL.settle * s.reveal * (1 - s.align);
  const zFront = PANEL.depth / 2;
  let i = 0;
  for (const x of [xMin, xMax]) for (const y of [yMin, yMax]) for (const z of [zBack, zFront]) {
    out[i] = (out[i] || new Vector3()).set(x, y, z);
    i++;
  }
  return out;
}

const camera = new PerspectiveCamera(BASE_FOV, 1, 0.1, 60);
const t = new Vector3();
const p = new Vector3();
const dir = new Vector3();
const right = new Vector3();
const up = new Vector3();
const v = new Vector3();
const corners = [];

/**
 * Resolve a pose for one aspect ratio. Without a `frame` the pose is returned as is.
 * With one, the camera is translated (direction preserved) and its distance scaled
 * until the projected region fills the frame rectangle, centred.
 */
export function solvePose(pose, layout, aspect, wallState) {
  if (!pose.frame) return { p: pose.p, t: pose.t };
  camera.fov = effectiveFov(layout, aspect);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();

  t.fromArray(pose.t);
  p.fromArray(pose.p);
  dir.subVectors(p, t);
  let dist = dir.length();
  dir.normalize();

  const [x0, y0, x1, y1] = pose.frame;
  const rx0 = x0 * 2 - 1, rx1 = x1 * 2 - 1;
  const ry0 = 1 - y1 * 2, ry1 = 1 - y0 * 2;
  wallCorners(layout, wallState, corners, pose.region);
  const tanHalf = Math.tan((camera.fov / 2) * DEG);

  for (let iter = 0; iter < 10; iter++) {
    camera.position.copy(t).addScaledVector(dir, dist);
    camera.lookAt(t);
    camera.updateMatrixWorld(true);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of corners) {
      v.copy(c).project(camera);
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }
    const scale = Math.max((maxX - minX) / (rx1 - rx0), (maxY - minY) / (ry1 - ry0));
    const dx = (minX + maxX) / 2 - (rx0 + rx1) / 2;
    const dy = (minY + maxY) / 2 - (ry0 + ry1) / 2;
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    const halfH = dist * tanHalf;
    t.addScaledVector(right, dx * halfH * aspect).addScaledVector(up, dy * halfH);
    dist *= scale;
    if (Math.abs(scale - 1) < 0.002 && Math.abs(dx) < 0.002 && Math.abs(dy) < 0.002) break;
  }
  p.copy(t).addScaledVector(dir, dist);
  return { p: [p.x, p.y, p.z], t: [t.x, t.y, t.z] };
}
