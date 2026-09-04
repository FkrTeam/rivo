/**
 * Framing check: projects the wall's bounding box through every solved camera
 * pose at a range of aspect ratios and prints where it lands on screen
 * (percent of viewport width / height, y from the top). A trailing "!" marks a
 * pose that runs off the viewport. For Detail the framed region (the four
 * modules around the study joint) is measured instead of the whole wall.
 *
 *   node scripts/frame-check.mjs
 */
import { buildKeyframes, detailRegion } from '../src/webgl/states.js';
import { wallCorners } from '../src/webgl/framing.js';
import { createCamera, applyPose } from '../src/webgl/Camera.js';

const aspects = { desktop: [2.4, 2.1, 16 / 9, 1.5, 1.2, 1.0], mobile: [0.46, 0.5625, 0.75, 0.9] };

function bounds(camera, corners) {
  let minX = 9, maxX = -9, minY = 9, maxY = -9;
  for (const c of corners) {
    const p = c.clone().project(camera);
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const pct = (v) => String(Math.round((v * 0.5 + 0.5) * 100)).padStart(3);
  const over = minX < -1 || maxX > 1 || minY < -1 || maxY > 1;
  return `x${pct(minX)}..${pct(maxX)} y${pct(-maxY)}..${pct(-minY)}${over ? '!' : ' '}`;
}

for (const layout of ['desktop', 'mobile']) {
  console.log(`\n=== ${layout}   aspects: ${aspects[layout].map((a) => a.toFixed(2)).join(' | ')}`);
  const rows = {};
  for (const aspect of aspects[layout]) {
    const kf = buildKeyframes(layout, aspect);
    const poses = { introStart: kf.introStart, hero: kf.hero };
    for (const step of kf.sequence) {
      poses[step.section] = step.enter;
      if (step.through) poses[step.section + 'End'] = step.through;
    }
    for (const [name, s] of Object.entries(poses)) {
      const camera = createCamera(aspect, layout);
      applyPose(camera, { ...s, fx: 0, fy: 0, fz: 0, zoom: 1 });
      camera.updateMatrixWorld(true);
      const region = name.startsWith('detail') ? detailRegion(layout) : null;
      (rows[name] ||= []).push(bounds(camera, wallCorners(layout, s, [], region)));
    }
  }
  for (const [name, cols] of Object.entries(rows)) console.log(name.padEnd(13), cols.join(' | '));
}
