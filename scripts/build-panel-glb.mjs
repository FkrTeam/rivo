/**
 * Builds public/assets/models/panel.glb - the single chamfered panel module
 * that the InstancedMesh wall is built from at runtime.
 *
 * Run:  npm run assets:panel
 *
 * The GLB is written by hand (JSON chunk + BIN chunk) so no exporter or DOM
 * shim is needed in Node. Geometry comes from three's RoundedBoxGeometry so the
 * runtime spec (src/webgl/panelSpec.js) and the asset always agree.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PANEL } from '../src/webgl/panelSpec.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../public/assets/models/panel.glb');

// RoundedBoxGeometry is non-indexed; weld identical vertices so the GLB carries an index buffer.
const geo = mergeVertices(new RoundedBoxGeometry(PANEL.width, PANEL.height, PANEL.depth, PANEL.segments, PANEL.radius));
geo.computeBoundingBox();

const pos = geo.attributes.position.array;
const nor = geo.attributes.normal.array;
const uv = geo.attributes.uv.array;
const idx = geo.index.array;
const vertexCount = geo.attributes.position.count;
const useUint32 = vertexCount > 65535;
const indices = useUint32 ? new Uint32Array(idx) : new Uint16Array(idx);

const pad4 = (n) => (n + 3) & ~3;
const views = [];
const buffers = [];
let offset = 0;
function pushView(typed) {
  const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
  views.push({ buffer: 0, byteOffset: offset, byteLength: bytes.byteLength });
  buffers.push(bytes);
  offset = pad4(offset + bytes.byteLength);
  return views.length - 1;
}
const vPos = pushView(new Float32Array(pos));
const vNor = pushView(new Float32Array(nor));
const vUv = pushView(new Float32Array(uv));
const vIdx = pushView(indices);

const bb = geo.boundingBox;
const json = {
  asset: { version: '2.0', generator: 'rivo/build-panel-glb' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'panel' }],
  meshes: [{ name: 'panel', primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, mode: 4 }] }],
  accessors: [
    { bufferView: vPos, componentType: 5126, count: vertexCount, type: 'VEC3', min: [bb.min.x, bb.min.y, bb.min.z], max: [bb.max.x, bb.max.y, bb.max.z] },
    { bufferView: vNor, componentType: 5126, count: vertexCount, type: 'VEC3' },
    { bufferView: vUv, componentType: 5126, count: vertexCount, type: 'VEC2' },
    { bufferView: vIdx, componentType: useUint32 ? 5125 : 5123, count: indices.length, type: 'SCALAR' },
  ],
  bufferViews: views,
  buffers: [{ byteLength: offset }],
};

const jsonBytes = Buffer.from(JSON.stringify(json));
const jsonPadded = Buffer.alloc(pad4(jsonBytes.length), 0x20);
jsonBytes.copy(jsonPadded);
const bin = Buffer.alloc(offset, 0);
let o = 0;
for (const b of buffers) { bin.set(b, o); o = pad4(o + b.byteLength); }

const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); // glTF magic
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + bin.length, 8);
const jsonChunkHeader = Buffer.alloc(8);
jsonChunkHeader.writeUInt32LE(jsonPadded.length, 0);
jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4); // JSON chunk
const binChunkHeader = Buffer.alloc(8);
binChunkHeader.writeUInt32LE(bin.length, 0);
binChunkHeader.writeUInt32LE(0x004e4942, 4); // BIN chunk

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, jsonChunkHeader, jsonPadded, binChunkHeader, bin]));
console.log(`panel.glb  ${vertexCount} vertices, ${indices.length / 3} triangles, ${12 + 16 + jsonPadded.length + bin.length} bytes -> ${out}`);
