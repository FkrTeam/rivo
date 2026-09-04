import { Mesh, Group, BoxGeometry, CircleGeometry, MeshBasicMaterial, Vector3 } from 'three';
import { PANEL } from '../panelSpec.js';
import { WALL } from '../states.js';

const v = new Vector3();

/**
 * The only RIVO Red in the scene:
 *  - the joint rules: thin red lines set into the two reveals that meet at the study joint (JOINT state)
 *  - the dot: a project marker placed on one intersection (COMPLETED SYSTEM)
 */
export class Markers {
  constructor() {
    this.group = new Group();
    this.group.name = 'markers';

    this.lineMaterial = new MeshBasicMaterial({ color: 0xd54c3f, transparent: true, opacity: 0, depthWrite: false });
    this.verticalGeometry = new BoxGeometry(WALL.gap * 0.5, PANEL.height, 0.004);
    this.horizontalGeometry = new BoxGeometry(PANEL.width, WALL.gap * 0.5, 0.004);
    this.vertical = new Mesh(this.verticalGeometry, this.lineMaterial);
    this.horizontal = new Mesh(this.horizontalGeometry, this.lineMaterial);
    this.group.add(this.vertical, this.horizontal);

    this.dotMaterial = new MeshBasicMaterial({ color: 0xd54c3f });
    this.dotGeometry = new CircleGeometry(0.055, 28);
    this.dot = new Mesh(this.dotGeometry, this.dotMaterial);
    this.group.add(this.dot);
  }

  /** Red rules along the reveals meeting at the study joint; the dot on the hero joint. */
  update(s, wall, studyJoint, dotJoint) {
    wall.jointPosition(studyJoint.col, studyJoint.row, s, v);
    const inset = PANEL.depth / 2 - 0.02; // set back into the reveal, below the chamfers
    this.vertical.position.set(v.x, v.y - PANEL.height / 2, inset);
    this.horizontal.position.set(v.x + PANEL.width / 2, v.y, inset);
    this.lineMaterial.opacity = s.joint;
    const showLine = s.joint > 0.002;
    this.vertical.visible = showLine;
    this.horizontal.visible = showLine;

    wall.jointPosition(dotJoint.col, dotJoint.row, s, v);
    this.dot.position.set(v.x, v.y, PANEL.depth / 2 + 0.12);
    this.dot.scale.setScalar(Math.max(0.0001, s.dot));
    this.dot.visible = s.dot > 0.002;
  }

  dispose() {
    this.verticalGeometry.dispose();
    this.horizontalGeometry.dispose();
    this.dotGeometry.dispose();
    this.lineMaterial.dispose();
    this.dotMaterial.dispose();
  }
}
