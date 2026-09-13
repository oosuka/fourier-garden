import * as THREE from "three/webgpu";
import { describe, expect, it } from "vitest";
import { disposeObjectResources } from "./disposeResources";

describe("analytic scene resource ownership", () => {
  it("disposes shared geometry, material and texture once each", () => {
    const root = new THREE.Group();
    const geometry = new THREE.BufferGeometry();
    const texture = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map: texture, normalMap: texture });
    const secondMaterial = new THREE.MeshBasicMaterial({ map: texture });
    const disposed = { geometry: 0, material: 0, texture: 0, secondMaterial: 0 };
    geometry.addEventListener("dispose", () => disposed.geometry++);
    material.addEventListener("dispose", () => disposed.material++);
    texture.addEventListener("dispose", () => disposed.texture++);
    secondMaterial.addEventListener("dispose", () => disposed.secondMaterial++);
    root.add(
      new THREE.Mesh(geometry, material),
      new THREE.Mesh(geometry, [material, secondMaterial]),
    );
    disposeObjectResources(root);
    expect(disposed).toEqual({ geometry: 1, material: 1, texture: 1, secondMaterial: 1 });
  });
});
