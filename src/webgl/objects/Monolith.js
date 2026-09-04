import { Mesh, BoxGeometry, MeshStandardMaterial } from 'three';
import { PANEL } from '../panelSpec.js';

/**
 * RAW VOLUME: before the first cut, the wall is one uncut block.
 * Visible only while `reveal` is ~0; swapped for the panel instances as the
 * reveals open, so the cuts appear to happen in the material.
 */
export class Monolith {
  constructor() {
    this.geometry = new BoxGeometry(1, 1, PANEL.depth);
    this.material = new MeshStandardMaterial({ color: 0x171614, roughness: 0.9, metalness: 0 });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = 'monolith';
  }
  setSize(width, height) {
    this.mesh.scale.set(width, height, 1);
  }
  update(s) {
    this.mesh.visible = s.reveal < 0.015;
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
