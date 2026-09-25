import * as THREE from "three/webgpu";

export function disposeObjectResources(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const ownedMaterials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const renderable = object as THREE.Mesh & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    if (renderable.geometry) geometries.add(renderable.geometry);
    const materials = Array.isArray(renderable.material)
      ? renderable.material
      : renderable.material
        ? [renderable.material]
        : [];
    for (const material of materials) {
      ownedMaterials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of ownedMaterials) material.dispose();
  for (const texture of textures) texture.dispose();
}
