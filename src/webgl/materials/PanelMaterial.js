import { MeshStandardMaterial, Color, Vector2 } from 'three';

/**
 * One material for every panel, every state.
 *
 * All transitions (reveal, alignment, material wipe, dimming) are
 * uniform- or attribute-driven inside this single shader, so there is exactly
 * one program to compile and no shader stutter when a section appears.
 *
 * Finishes are procedural (rift-cut oak, ink lacquer, stone) so the site ships
 * no textures. A KTX2 grain map can be blended in later through the registry.
 */
export function createPanelMaterial({ detail = 1 } = {}) {
  const material = new MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 1.0,
  });

  const uniforms = {
    uReveal: { value: 0 },
    uAlign: { value: 0 },
    uMaterial: { value: 0 },
    uDim: { value: 1 },
    uGap: { value: 0.032 },
    uSettle: { value: 0.14 },
    uCenter: { value: new Vector2(2.5, 1) },
    uWallSize: { value: new Vector2(5.4, 4.05) },
    uDetail: { value: detail },
    uColRaw: { value: new Color(0x171614) },
    uColOak: { value: new Color(0x86684a) },
    uColOakLight: { value: new Color(0xa68a67) },
    uColInk: { value: new Color(0x121211) },
    uColStone: { value: new Color(0xa9a49b) }, // reads as brand Stone once lit
  };
  material.userData.uniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        attribute vec2 aCell;
        attribute float aMat;
        attribute float aOrder;
        attribute float aSeed;
        uniform float uReveal, uAlign, uGap, uSettle;
        uniform vec2 uCenter;
        varying vec3 vLocal;
        varying vec3 vWall;
        varying float vMat, vSeed, vOrder;
        `,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        // REVEAL: reveals open between modules
        vec2 gapOff = (aCell - uCenter) * uGap * uReveal;
        // ALIGNMENT: the cut modules sit slightly back, then come flush in one wave across the wall
        float settled = smoothstep(0.0, 1.0, clamp(uAlign * 1.7 - aOrder * 0.7, 0.0, 1.0));
        float back = -uSettle * uReveal * (1.0 - settled);
        transformed += vec3(gapOff, back);
        vLocal = position;
        vMat = aMat;
        vSeed = aSeed;
        // MATERIAL order: column by column from the studied joint (top-left), each column top -> bottom
        float rowsN = 2.0 * uCenter.y + 1.0;
        float colsN = 2.0 * uCenter.x + 1.0;
        vOrder = (aCell.x * rowsN + (rowsN - 1.0 - aCell.y)) / (colsN * rowsN);
        vWall = (instanceMatrix * vec4(transformed, 1.0)).xyz;
        `,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform float uMaterial, uDim, uDetail;
        uniform vec2 uWallSize;
        uniform vec3 uColRaw, uColOak, uColOakLight, uColInk, uColStone;
        varying vec3 vLocal;
        varying vec3 vWall;
        varying float vMat, vSeed, vOrder;
        float rivoHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
        float rivoNoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(rivoHash(i), rivoHash(i + vec2(1.0, 0.0)), f.x),
                     mix(rivoHash(i + vec2(0.0, 1.0)), rivoHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        `,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `
        #include <color_fragment>
        vec2 pl = vLocal.xy;
        // rift-cut oak: straight, fine, low-contrast grain running with the panel height
        float wobble = rivoNoise(vec2(pl.y * 1.4 + vSeed * 9.0, pl.x * 6.0)) * 0.8;
        float grainLine = sin(pl.x * 210.0 * uDetail + wobble * 14.0 + vSeed * 31.0);
        float grain = smoothstep(-0.4, 1.0, grainLine) * 0.3
          + rivoNoise(vec2(pl.x * 55.0, pl.y * 2.0 + vSeed)) * 0.4
          + rivoNoise(vec2(pl.x * 9.0 + vSeed, pl.y * 0.8)) * 0.3;
        vec3 oak = mix(uColOak, uColOakLight, grain);
        // stone: fine mineral speckle
        float speck = rivoNoise(pl * 160.0 * uDetail + vSeed * 3.0) * 0.07 - 0.035;
        vec3 stone = uColStone + speck;
        vec3 finish = vMat < 0.5 ? oak : (vMat < 1.5 ? uColInk : stone);
        float finishRough = vMat < 0.5 ? (0.58 - grain * 0.14) : (vMat < 1.5 ? 0.24 : 0.74);
        // raw volume: primed, near-black, matte, faintly uneven
        float rawTone = 1.0 + (rivoNoise(pl * 24.0 + vSeed) - 0.5) * 0.14;
        vec3 raw = uColRaw * rawTone;
        // MATERIAL: the finish arrives one whole module at a time, in vOrder; never a cut across a face
        float wipe = smoothstep(vOrder, vOrder + 0.1, uMaterial * 1.1);
        diffuseColor.rgb = mix(raw, finish, wipe);
        float rivoRough = mix(0.88, finishRough, wipe);
        `,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `
        #include <roughnessmap_fragment>
        roughnessFactor = rivoRough;
        `,
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `
        outgoingLight *= uDim;
        #include <opaque_fragment>
        `,
      );
  };
  material.customProgramCacheKey = () => 'rivo-panel';
  return material;
}
