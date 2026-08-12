import * as THREE from "three/webgpu";

import type { RendererBackend } from "../../core/rendererBackend";
import type { CinematicEnvironmentProfile } from "./model";
import {
  createFilamentGeometry,
  createNebulaTexture,
  createWebGpuNebulaMaterial,
  FILAMENT_VEIL_COUNT,
  type CinematicLayerArtDirection,
  NEBULA_VEIL_COUNT,
} from "./environmentPrimitives";

interface NebulaLayer {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial | THREE.MeshBasicNodeMaterial;
  baseOpacity: number;
  texture: THREE.DataTexture | null;
}

interface FilamentVeil {
  line: THREE.Line;
  material: THREE.LineBasicMaterial;
  baseOpacity: number;
  phase: number;
}

interface CinematicAtmosphereOptions {
  backend: RendererBackend;
  profile: CinematicEnvironmentProfile;
  seed: number;
  palette: readonly [number, number, number];
  extent: Readonly<{ x: number; y: number; z: number }>;
  artDirection: CinematicLayerArtDirection;
  sceneTime: THREE.UniformNode<"float", number>;
  sceneEnergy: THREE.UniformNode<"float", number>;
  sceneWarmth: THREE.UniformNode<"float", number>;
}

export class CinematicAtmosphereLayers {
  private readonly nebulaLayers: NebulaLayer[] = [];
  private readonly filamentVeils: FilamentVeil[] = [];

  constructor(group: THREE.Group, options: CinematicAtmosphereOptions) {
    for (let index = 0; index < NEBULA_VEIL_COUNT; index += 1) {
      const firstColor = options.palette[index % options.palette.length]!;
      const secondColor = options.palette[(index + 1) % options.palette.length]!;
      const baseOpacity = (0.03 - index * 0.0035) * options.artDirection.nebula;
      const texture =
        options.backend === "webgl"
          ? createNebulaTexture(options.seed + index * 997, firstColor, secondColor)
          : null;
      const material =
        options.backend === "webgpu"
          ? createWebGpuNebulaMaterial(
              firstColor,
              secondColor,
              index * 2.1,
              options.sceneTime,
              options.sceneEnergy,
              options.sceneWarmth,
              options.artDirection.nebula,
            )
          : new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              opacity: baseOpacity,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              side: THREE.DoubleSide,
              toneMapped: false,
            });
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(options.extent.x * 3.1, options.extent.y * 2.9),
        material,
      );
      mesh.position.set(
        (index - 2) * options.extent.x * 0.1,
        (2 - index) * 0.42,
        -7 - index * 1.75,
      );
      mesh.rotation.z = (index - 2) * 0.24;
      mesh.renderOrder = -8 + index;
      group.add(mesh);
      this.nebulaLayers.push({ mesh, material, baseOpacity, texture });
    }

    for (let index = 0; index < FILAMENT_VEIL_COUNT; index += 1) {
      const material = new THREE.LineBasicMaterial({
        color: options.palette[index % options.palette.length]!,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const line = new THREE.Line(
        createFilamentGeometry(options.seed, options.profile, index, options.extent),
        material,
      );
      line.frustumCulled = false;
      line.renderOrder = -3 + index;
      group.add(line);
      this.filamentVeils.push({
        line,
        material,
        baseOpacity: (0.068 + index * 0.007) * options.artDirection.filament,
        phase: index * 0.9 + options.seed * 0.0001,
      });
    }
  }

  update(
    timeSeconds: number,
    energy: number,
    warmth: number,
    extent: Readonly<{ x: number; y: number; z: number }>,
    camera?: THREE.Camera,
  ): void {
    this.nebulaLayers.forEach((layer, index) => {
      const rotationZ = (index - 2) * 0.24 + Math.sin(timeSeconds * 0.036 + index) * 0.16;
      if (camera) {
        layer.mesh.quaternion.copy(camera.quaternion);
        layer.mesh.rotateZ(rotationZ);
      } else {
        layer.mesh.rotation.set(0, 0, rotationZ);
      }
      const breath = 1 + Math.sin(timeSeconds * (0.041 + index * 0.006) + index) * 0.035;
      layer.mesh.scale.set(breath * (1 + energy * 0.035), breath, 1);
      layer.mesh.position.x =
        (index - 2) * extent.x * 0.1 + Math.sin(timeSeconds * 0.027 + index) * 0.58;
      layer.mesh.position.y = (2 - index) * 0.42 + Math.cos(timeSeconds * 0.031 - index) * 0.34;
      if (layer.material instanceof THREE.MeshBasicMaterial) {
        layer.material.opacity = Math.min(0.1, layer.baseOpacity + energy * 0.026 + warmth * 0.01);
      }
    });
    this.filamentVeils.forEach((veil, index) => {
      veil.line.position.x = Math.sin(timeSeconds * (0.044 + index * 0.006) + veil.phase) * 0.82;
      veil.line.position.y = Math.cos(timeSeconds * (0.036 + index * 0.005) - veil.phase) * 0.54;
      veil.line.rotation.z = Math.sin(timeSeconds * 0.028 + veil.phase) * 0.075;
      veil.material.opacity = Math.min(
        0.22,
        veil.baseOpacity * (0.92 + energy * 1.35 + warmth * 0.36),
      );
    });
  }

  dispose(): void {
    this.nebulaLayers.forEach((layer) => {
      layer.mesh.geometry.dispose();
      layer.material.dispose();
      layer.texture?.dispose();
    });
    this.filamentVeils.forEach((veil) => {
      veil.line.geometry.dispose();
      veil.material.dispose();
    });
  }
}
