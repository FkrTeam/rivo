import { PerspectiveCamera, Vector3 } from 'three';
import { effectiveFov } from './framing.js';

const target = new Vector3();

export function createCamera(aspect, layout = 'desktop') {
  const camera = new PerspectiveCamera(effectiveFov(layout, aspect), aspect, 0.1, 60);
  camera.position.set(0, 0, 8);
  return camera;
}

/**
 * Match the camera to the viewport. Wider than the layout's reference aspect the
 * vertical field of view holds; narrower, the horizontal one holds, so the wall
 * keeps its width on screen instead of running off the sides.
 */
export function fitAspect(camera, layout, aspect = camera.aspect) {
  camera.aspect = aspect;
  camera.fov = effectiveFov(layout, aspect);
  camera.updateProjectionMatrix();
}

/**
 * Apply a pose from the live state: position (px,py,pz), look target (tx,ty,tz),
 * plus the Detail close-up modifier (focus offset + zoom about the target).
 */
export function applyPose(camera, s) {
  target.set(s.tx + s.fx, s.ty + s.fy, s.tz + s.fz);
  const dx = s.px - s.tx;
  const dy = s.py - s.ty;
  const dz = s.pz - s.tz;
  camera.position.set(target.x + dx * s.zoom, target.y + dy * s.zoom, target.z + dz * s.zoom);
  camera.lookAt(target);
}
