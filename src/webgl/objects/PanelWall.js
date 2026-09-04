import { InstancedMesh, InstancedBufferAttribute, Matrix4, Vector3 } from 'three';
import { PANEL, WALL } from '../panelSpec.js';
import { createPanelMaterial } from '../materials/PanelMaterial.js';

const MAX_INSTANCES = 24;
const m4 = new Matrix4();

/** Deterministic pseudo-random per cell: grain phase only, never position. */
function rand(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Finish schedule: one stone band along the top row, rift-cut oak below. Nothing else changes colour. */
function designFinish(col, row, cols, rows) {
  return row === rows - 1 ? 2 : 0;
}

/**
 * The wall: one InstancedMesh built from the panel GLB.
 * Per-instance attributes describe cell, finish, order in the settle wave and grain phase.
 * All motion happens in the shader from a handful of uniforms; every module stays on the grid.
 */
export class PanelWall {
  constructor(geometry, { mobile, detail }) {
    this.geometry = geometry;
    this.material = createPanelMaterial({ detail });
    this.mesh = new InstancedMesh(geometry, this.material, MAX_INSTANCES);
    this.mesh.frustumCulled = false; // instances move in the shader; the wall is always framed
    this.mesh.name = 'panel-wall';

    this.aCell = new InstancedBufferAttribute(new Float32Array(MAX_INSTANCES * 2), 2);
    this.aMat = new InstancedBufferAttribute(new Float32Array(MAX_INSTANCES), 1);
    this.aOrder = new InstancedBufferAttribute(new Float32Array(MAX_INSTANCES), 1);
    this.aSeed = new InstancedBufferAttribute(new Float32Array(MAX_INSTANCES), 1);
    geometry.setAttribute('aCell', this.aCell);
    geometry.setAttribute('aMat', this.aMat);
    geometry.setAttribute('aOrder', this.aOrder);
    geometry.setAttribute('aSeed', this.aSeed);

    this.setLayout(mobile);
  }

  setLayout(mobile) {
    const { cols, rows } = mobile ? WALL.mobile : WALL.desktop;
    this.mobile = mobile;
    this.cols = cols;
    this.rows = rows;
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    const span = Math.max(1, cols - 1 + (rows - 1) * 0.5);
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        m4.makeTranslation((c - cx) * PANEL.width, (r - cy) * PANEL.height, 0);
        this.mesh.setMatrixAt(i, m4);
        this.aCell.setXY(i, c, r);
        this.aMat.setX(i, designFinish(c, r, cols, rows));
        this.aOrder.setX(i, (c + (rows - 1 - r) * 0.5) / span); // the wave sweeps left -> right, top -> bottom
        this.aSeed.setX(i, rand(r * 31 + c * 7 + 3) * 10);
        i++;
      }
    }
    this.mesh.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
    for (const a of [this.aCell, this.aMat, this.aOrder, this.aSeed]) a.needsUpdate = true;

    const u = this.material.userData.uniforms;
    u.uCenter.value.set(cx, cy);
    u.uWallSize.value.set(cols * PANEL.width, rows * PANEL.height);
    u.uGap.value = WALL.gap;
    u.uSettle.value = WALL.settle;
    this.width = cols * PANEL.width;
    this.height = rows * PANEL.height;
  }

  /** Copy the live state into the material's uniforms. */
  update(s) {
    const u = this.material.userData.uniforms;
    u.uReveal.value = s.reveal;
    u.uAlign.value = s.align;
    u.uMaterial.value = s.material;
    u.uDim.value = this.mobile ? s.dim * 0.72 : s.dim; // text stacks over the wall on narrow screens
  }

  /**
   * Position of the joint at column boundary `col` / row boundary `row`,
   * including the current reveal opening, at the wall's front face.
   */
  jointPosition(col, row, s, out = new Vector3()) {
    const cx = (this.cols - 1) / 2;
    const cy = (this.rows - 1) / 2;
    const u = col - 0.5 - cx;
    const v = row - 0.5 - cy;
    const gap = WALL.gap * s.reveal;
    const x = u * (PANEL.width + gap);
    const y = v * (PANEL.height + gap);
    return out.set(x, y, PANEL.depth / 2);
  }

  dispose() {
    this.mesh.dispose();
    this.material.dispose();
    this.geometry.dispose();
  }
}
