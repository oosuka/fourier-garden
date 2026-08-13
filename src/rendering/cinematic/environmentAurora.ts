import * as THREE from "three/webgpu";

import type { CinematicEnvironmentProfile } from "./model";
import {
  AURORA_POINT_COUNT,
  AURORA_VEIL_COUNT,
  createAuroraGeometry,
  type CinematicLayerArtDirection,
} from "./environmentPrimitives";

interface AuroraVeil {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  material: THREE.MeshBasicMaterial;
  attribute: THREE.BufferAttribute;
  positions: Float32Array;
  phase: number;
  index: number;
  baseOpacity: number;
  baseWidth: number;
}

interface CinematicAuroraOptions {
  profile: CinematicEnvironmentProfile;
  seed: number;
  palette: readonly [number, number, number];
  extent: Readonly<{ x: number; y: number; z: number }>;
  artDirection: CinematicLayerArtDirection;
}

export class CinematicAuroraLayers {
  private readonly veils: AuroraVeil[] = [];

  constructor(
    group: THREE.Group,
    private readonly options: CinematicAuroraOptions,
  ) {
    for (let index = 0; index < AURORA_VEIL_COUNT; index += 1) {
      const { geometry, attribute, positions } = createAuroraGeometry();
      const material = new THREE.MeshBasicMaterial({
        color: options.palette[index % options.palette.length]!,
        transparent: true,
        opacity: 0.05,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = -2 + index;
      group.add(mesh);
      this.veils.push({
        mesh,
        material,
        attribute,
        positions,
        phase: options.profile.filamentPhase + index * 1.27 + options.seed * 0.00011,
        index,
        baseOpacity: (0.004 + index * 0.0015) * options.artDirection.aurora,
        baseWidth: 0.012 + index * 0.006,
      });
    }
  }

  update(timeSeconds: number, energy: number, warmth: number): void {
    this.veils.forEach((veil) => {
      this.updateVeil(veil, timeSeconds, energy);
      const pulse = 0.5 + 0.5 * Math.sin(timeSeconds * (0.31 + veil.index * 0.027) + veil.phase);
      veil.material.opacity = Math.min(
        0.035,
        veil.baseOpacity * (0.72 + pulse * 0.6 + energy * 1.3 + warmth * 0.2),
      );
    });
  }

  private updateVeil(veil: AuroraVeil, timeSeconds: number, energy: number): void {
    const positions = veil.positions;
    const { profile, extent } = this.options;
    const { layout } = profile;
    const motionTime = timeSeconds * (0.12 + veil.index * 0.012) + veil.phase;
    const width = veil.baseWidth * (0.88 + energy * 0.55);
    for (let pointIndex = 0; pointIndex < AURORA_POINT_COUNT; pointIndex += 1) {
      const progress = pointIndex / (AURORA_POINT_COUNT - 1);
      const sweep = progress * 2 - 1;
      const angle = progress * Math.PI * 2;
      let centerX = sweep * extent.x * 0.62;
      let centerY = 0;
      let centerZ = -4.2 - veil.index * 0.62;

      if (layout === "cathedral") {
        const arch = (1 - Math.abs(sweep) ** 1.65) * extent.y;
        centerY =
          -extent.y * 0.34 +
          arch * (0.72 - veil.index * 0.035) +
          Math.sin(angle * 1.5 + motionTime) * 0.16;
        centerZ += Math.cos(angle + motionTime) * 0.34;
      } else if (layout === "chain") {
        centerX -= extent.x * 0.08;
        centerY =
          Math.sin(sweep * Math.PI * (1.15 + veil.index * 0.08) + motionTime) *
          extent.y *
          (0.13 + veil.index * 0.008);
        centerZ += Math.cos(angle * 1.7 - motionTime) * 0.52;
      } else if (layout === "constellation") {
        centerY =
          Math.sin(sweep * Math.PI * (1.8 + veil.index * 0.13) + motionTime) * extent.y * 0.26 +
          sweep * extent.y * 0.08;
        centerZ += Math.cos(angle * 2.1 + motionTime) * 0.72;
      } else if (layout === "ribbon") {
        centerY =
          Math.sin(sweep * Math.PI * (1.4 + veil.index * 0.16) + motionTime) *
          extent.y *
          (0.2 + veil.index * 0.014);
        centerZ += Math.cos(sweep * Math.PI * 2.2 - motionTime) * 0.9;
      } else if (layout === "tidal") {
        const radius =
          extent.y * (0.26 + veil.index * 0.025) +
          Math.sin(angle * (2 + (veil.index % 3)) - motionTime) * 0.52;
        centerX = Math.cos(angle) * radius * 1.34;
        centerY = Math.sin(angle) * radius * 0.72;
        centerZ += Math.sin(angle * 3 - motionTime) * 0.72;
      } else if (layout === "orchard") {
        const petal = 1 + Math.sin(angle * (3 + veil.index) - motionTime) * 0.24;
        const radius = extent.y * (0.29 + veil.index * 0.022) * petal;
        centerX = Math.cos(angle + veil.index * 0.12) * radius * 1.2;
        centerY = Math.sin(angle) * radius * 0.82;
        centerZ += Math.cos(angle * 2 + motionTime) * 0.66;
      } else if (layout === "lanterns") {
        const peak = Math.exp(-(sweep * sweep) * (7.2 + veil.index * 0.9));
        centerY =
          -extent.y * 0.3 +
          peak * extent.y * (0.67 - veil.index * 0.035) +
          Math.sin(angle * (1.3 + veil.index * 0.08) + motionTime) * 0.38;
        centerZ += Math.cos(angle - motionTime) * 0.44;
      } else if (layout === "rain") {
        centerX =
          (veil.index - (AURORA_VEIL_COUNT - 1) / 2) * extent.x * 0.19 +
          Math.sin(progress * Math.PI * (3 + veil.index) + motionTime) * 0.54;
        centerY = extent.y * (0.56 - progress * 1.12);
        centerZ += Math.cos(progress * Math.PI * 4 - motionTime) * 0.58;
      } else if (layout === "veil") {
        centerY =
          Math.sin(sweep * Math.PI * (1.2 + veil.index * 0.22) + motionTime) *
            extent.y *
            (0.17 + veil.index * 0.014) +
          Math.cos(sweep * Math.PI * 3.4 - motionTime) * 0.56;
        centerZ += Math.sin(angle * 1.7 + motionTime) * 0.78;
      } else if (layout === "torus") {
        const radius = extent.y * (0.25 + veil.index * 0.028);
        centerX = Math.cos(angle) * radius * 1.48;
        centerY = Math.sin(angle) * radius * 0.74;
        centerZ += Math.sin(angle * 2 + motionTime) * 0.82;
      } else {
        centerY =
          Math.sin(sweep * Math.PI * (1.25 + veil.index * 0.14) + motionTime) *
          extent.y *
          (0.18 + veil.index * 0.01);
        centerZ += Math.cos(angle * 1.6 - motionTime) * 0.58;
      }

      const sideX = layout === "rain" ? width : Math.sin(angle + veil.phase) * width * 0.16;
      const sideY = layout === "rain" ? 0 : width;
      const firstOffset = pointIndex * 6;
      positions[firstOffset] = centerX - sideX;
      positions[firstOffset + 1] = centerY - sideY;
      positions[firstOffset + 2] = centerZ;
      positions[firstOffset + 3] = centerX + sideX;
      positions[firstOffset + 4] = centerY + sideY;
      positions[firstOffset + 5] = centerZ + 0.025;
    }
    veil.attribute.needsUpdate = true;
  }

  dispose(): void {
    this.veils.forEach((veil) => {
      veil.mesh.geometry.dispose();
      veil.material.dispose();
    });
  }
}
