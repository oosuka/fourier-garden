import * as THREE from "three/webgpu";

/** A translucent extrusion of a sampled curve. The curve remains a separate
 * mathematical line; this material is a poetic surface, never an extra mode.
 */
export function createCurveVeil(
  source: Float32Array,
  color: number,
  drop: number,
  depth: number,
  stride = 1,
) {
  const count = Math.ceil(source.length / 3 / stride);
  const positions = new Float32Array(count * 6);
  const indices = new Uint32Array((count - 1) * 6);
  for (let index = 0; index < count; index++) {
    const offset = Math.min(source.length - 3, index * stride * 3);
    const fall = Math.sin((Math.PI * index) / (count - 1)) ** 0.7;
    positions.set(
      [
        source[offset]!,
        source[offset + 1]!,
        source[offset + 2]! - 0.035,
        source[offset]!,
        source[offset + 1]! - drop * fall,
        source[offset + 2]! - depth,
      ],
      index * 6,
    );
    if (index < count - 1) {
      const v = index * 2;
      indices.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], index * 6);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.48,
    metalness: 0.42,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "poetic-curve-veil";
  mesh.userData.layer = "poetic-extrusion";
  return { mesh, material };
}
