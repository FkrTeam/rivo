import { Scene, DirectionalLight, HemisphereLight, PMREMGenerator, Color } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Scene + economical studio lighting: one warm key light, a low hemisphere fill
 * and a small pre-filtered environment for material response. No shadows, no
 * post-processing; the finishes carry the image.
 */
export function createScene(renderer) {
  const scene = new Scene();
  scene.background = new Color(0x0b0b0b);

  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTarget = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.38;

  const key = new DirectionalLight(0xf4f1eb, 2.6);
  key.position.set(3.2, 4.4, 5.2);
  scene.add(key);

  const fill = new HemisphereLight(0xc9c4bb, 0x0b0b0b, 0.28);
  scene.add(fill);

  return {
    scene,
    dispose() {
      scene.environment = null;
      envTarget.dispose();
    },
  };
}
